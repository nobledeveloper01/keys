import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';

import { AppModule } from '../src/app.module';
import { ReportsStore } from '../src/reports/reports.store';

/*
  Run against every store, not just the one that is easy to run against.

  A suite that only exercises the in-memory store proves something about a
  `Map`. The claim being made here is about the server that ships, and that one
  is talking to Postgres — where the reads are SQL, the filters are `WHERE`
  clauses, and a mistake looks completely different.

  `KEYS_TEST_DATABASE_URL` unset skips the Postgres pass rather than failing, so
  a clone with no database still runs the suite. It is announced when it is
  skipped, because a silently halved test run is the thing this whole file
  exists to be the opposite of.
*/
const DATABASE_URL = process.env.KEYS_TEST_DATABASE_URL;
if (!DATABASE_URL) {
  console.warn(
    '\n  ! KEYS_TEST_DATABASE_URL is not set — this suite is running against ' +
      'the in-memory store only.\n    The shipping server uses Postgres. Set it to ' +
      'cover both.\n',
  );
}

const STORES: Array<[name: string, url: string | undefined]> = [
  ['in memory', undefined],
  ...(DATABASE_URL ? ([['postgres', DATABASE_URL]] as Array<[string, string]>) : []),
];

/**
 * Phase 1's exit gate.
 *
 * The claim being tested is not "the lookup endpoint hides unreviewed
 * reports". It is the stronger one: *no route this server exposes* returns an
 * unreviewed report to a caller without the reviewer token.
 *
 * So the routes are not listed here. They are read out of the running router,
 * which means a route added in phase 4 is covered by this test on the day it
 * is added, by someone who never read this file. A test that names its routes
 * is a test that stops covering the thing it was written for.
 */

const PHONE = '+2348012345678';
const SECRET = 'the sworn evidence that has not been reviewed by anybody yet';
const TOKEN = 'x'.repeat(48);
// A real UUID, because the durable store's primary key is one and a friendly
// string would fail there for a reason that has nothing to do with what is
// being tested.
const REPORT_ID = '8f1c2b6e-4a3d-4c9e-9f21-5b7d0e6a1c34';

interface Route {
  readonly method: string;
  readonly path: string;
}

/** Every route the express router actually has, as opposed to every route we remember writing. */
function routesOf(app: INestApplication): Route[] {
  const server = app.getHttpAdapter().getInstance() as {
    router?: { stack: unknown[] };
    _router?: { stack: unknown[] };
  };
  const stack = (server.router ?? server._router)?.stack ?? [];
  const found: Route[] = [];
  for (const layer of stack as Array<{
    route?: { path: string; methods: Record<string, boolean> };
  }>) {
    if (!layer.route) continue;
    for (const [method, on] of Object.entries(layer.route.methods)) {
      if (on) found.push({ method: method.toUpperCase(), path: layer.route.path });
    }
  }
  return found;
}

/*
  Every value a hostile caller could plausibly know or guess, tried in every
  slot. The report id is included deliberately: a caller who saw an id in a
  log, or who enumerated ids, must still get nothing.
*/
function candidatesFor(reportId: string, replyToken: string): string[] {
  return [reportId, PHONE, encodeURIComponent(PHONE), replyToken, '', 'all', '*'];
}

describe.each(STORES)('no unreviewed report escapes (%s)', (_name, databaseUrl) => {
  let app: INestApplication;
  let store: ReportsStore;
  let reportId: string;
  let replyToken: string;

  beforeAll(async () => {
    process.env.KEYS_REVIEWER_TOKEN = TOKEN;
    if (databaseUrl) {
      process.env.KEYS_DATABASE_URL = databaseUrl;
    } else {
      delete process.env.KEYS_DATABASE_URL;
    }

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();

    store = app.get(ReportsStore);
    // A clean table. The suite asserts on counts, and a row left by the last
    // run would make it pass or fail for reasons nothing here describes.
    for (const row of await store.allFor(PHONE)) await store.replace({ ...row, expiresAt: new Date(0) });
    await store.purgeExpired(new Date());

    const row = await store.add({
      id: REPORT_ID,
      reporterId: 'someone-who-must-not-be-named',
      reportedPhone: PHONE,
      category: 'inspection_fee_scam',
      description: SECRET,
      evidenceKeys: ['receipt.jpg'],
      now: new Date(),
    });
    reportId = row.id;
    replyToken = row.replyToken;
  });

  afterAll(async () => {
    for (const row of await store.allFor(PHONE)) {
      await store.replace({ ...row, expiresAt: new Date(0) });
    }
    await store.purgeExpired(new Date());
    await app.close();
    delete process.env.KEYS_REVIEWER_TOKEN;
    delete process.env.KEYS_DATABASE_URL;
  });

  it('has routes to test, and knows how many', () => {
    /*
      The gate's own liveness check.

      If the router shape changes under a Nest upgrade and `routesOf` starts
      returning nothing, every other test in this file passes vacuously — a
      green gate over an unprotected server. This is the assertion that makes
      that impossible.
    */
    const routes = routesOf(app);
    expect(routes.length).toBeGreaterThanOrEqual(7);
  });

  it('the report is genuinely unreviewed', async () => {
    const row = (await store.byId(reportId))!;
    expect(row.status).toBe('submitted');
    expect(row.publishedAt).toBeNull();
  });

  it('no route returns it to an anonymous caller', async () => {
    const routes = routesOf(app);
    const leaks: string[] = [];

    for (const route of routes) {
      // The reply route is the reported party's own, and is tested separately
      // below; a caller holding the texted token is not anonymous.
      for (const value of candidatesFor(reportId, replyToken)) {
        const path = route.path.replace(/:[A-Za-z_]+/g, value);
        for (const url of [path, `${path}?phone=${value}`, `${path}?token=${value}`, `${path}?id=${value}`]) {
          const res = await (request(app.getHttpServer()) as any)[route.method.toLowerCase()](url)
            .send({ phone: value, id: value, token: value, reportId: value })
            .catch(() => null);
          if (!res) continue;
          const body = JSON.stringify(res.body ?? '') + String(res.text ?? '');
          if (body.includes(SECRET) && value !== replyToken) {
            leaks.push(`${route.method} ${url} -> ${res.status}`);
          }
          if (body.includes('someone-who-must-not-be-named')) {
            leaks.push(`REPORTER LEAKED: ${route.method} ${url} -> ${res.status}`);
          }
        }
      }
    }

    expect(leaks).toEqual([]);
  });

  it('the review console refuses a caller with no token, a wrong token, and a short token', async () => {
    for (const headers of [{}, { 'x-reviewer-token': 'wrong' }, { 'x-reviewer-token': 'x'.repeat(47) }]) {
      const res = await request(app.getHttpServer())
        .get(`/v1/review/${reportId}`)
        .set(headers as Record<string, string>);
      expect(res.status).toBe(403);
      expect(JSON.stringify(res.body)).not.toContain(SECRET);
    }
  });

  it('the review console returns it to a reviewer, so the gate is not passing by returning nothing to anybody', async () => {
    const res = await request(app.getHttpServer())
      .get(`/v1/review/${reportId}`)
      .set('x-reviewer-token', TOKEN);
    expect(res.status).toBe(200);
    expect(res.body.description).toBe(SECRET);
    // Even here.
    expect(JSON.stringify(res.body)).not.toContain('someone-who-must-not-be-named');
  });

  it('the public lookup reports nothing upheld while the report is unreviewed', async () => {
    const res = await request(app.getHttpServer())
      .get('/v1/registry/lookup')
      .query({ phone: PHONE });
    expect(res.status).toBe(200);
    expect(res.body.upheldReports).toBe(0);
    expect(res.body.categories).toEqual([]);
  });

  it('the reported party sees the report but never the reporter', async () => {
    const res = await request(app.getHttpServer())
      .get('/v1/registry/reply')
      .query({ token: replyToken });
    expect(res.status).toBe(200);
    expect(res.body.description).toBe(SECRET);
    expect(JSON.stringify(res.body)).not.toContain('someone-who-must-not-be-named');
  });

  it('a report upheld through the console becomes public, and only then', async () => {
    // Reply first, which is what lets a reviewer decide before the window closes.
    await request(app.getHttpServer())
      .post('/v1/registry/reply')
      .send({ token: replyToken, reply: 'That was not me, the number was cloned.' })
      .expect(201);

    const before = await request(app.getHttpServer())
      .get('/v1/registry/lookup')
      .query({ phone: PHONE });
    expect(before.body.upheldReports).toBe(0);

    await request(app.getHttpServer())
      .post(`/v1/review/${reportId}/decision`)
      .set('x-reviewer-token', TOKEN)
      // 200, not Nest's default 201: a decision records something, it does not
      // create a resource. The OpenAPI document says the same.
      .send({ decision: 'upheld' })
      .expect(200);

    const after = await request(app.getHttpServer())
      .get('/v1/registry/lookup')
      .query({ phone: PHONE });
    expect(after.body.upheldReports).toBe(1);
    expect(after.body.categories).toEqual(['inspection_fee_scam']);
    // Still never the words themselves, and still never the reporter.
    expect(JSON.stringify(after.body)).not.toContain(SECRET);
    expect(JSON.stringify(after.body)).not.toContain('someone-who-must-not-be-named');
  });
});
