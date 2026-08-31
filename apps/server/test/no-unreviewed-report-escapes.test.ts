import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';

import { AppModule } from '../src/app.module';
import { Outbox } from '../src/outbox/outbox';
import { ReportsStore, hashPhone } from '../src/reports/reports.store';

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

  it('texts the reported party their right of reply, and it is a link', async () => {
    /*
      The promise this product makes on every surface, actually kept.

      Phase 1 built the token, the route that accepts it, and the page that
      uses it — and nothing that delivers it. "Seven days to answer" was a
      sentence in the copy and a column in a database; nobody was ever told.

      Asserted through the outbox rather than through a provider, because there
      is still no provider (R1). What this fixes is that the message exists and
      is addressed to the right number.
    */
    const outbox = app.get(Outbox);
    const before = outbox.depth;

    const reportedPhone = '+2348012349999';
    await request(app.getHttpServer())
      .post('/v1/registry/reports')
      .send({
        reportedPhone,
        category: 'no_show',
        description: 'Took the appointment fee and never turned up, twice in one week.',
      })
      .expect(201);

    expect(outbox.depth).toBe(before + 1);
    const queued = outbox.pending()[outbox.depth - 1]!;

    // Addressed to the number that was reported, hashed like everything else.
    expect(queued.toPhoneHash).toBe(hashPhone(reportedPhone));
    // And it carries a link they can open, not just a notification.
    expect(queued.body).toContain('/reply?token=');
    // Which says the thing that matters before it says anything else.
    expect(queued.body).toMatch(/nothing has been published/i);
  });

  it('never puts a reply token in a response, only in the text', async () => {
    // The token is the whole authorisation. A route that returns it turns the
    // reporter — or anybody who can reach that route — into the reported party.
    const outbox = app.get(Outbox);
    const token = /token=([^\s]+)/.exec(outbox.pending().at(-1)?.body ?? '')?.[1];
    expect(token).toBeTruthy();

    for (const route of routesOf(app)) {
      if (route.method !== 'GET') continue;
      const response = await request(app.getHttpServer())
        .get(route.path.replace(/:[A-Za-z]+/g, reportId))
        .set('x-reviewer-token', TOKEN)
        .query({ phone: PHONE });
      expect(JSON.stringify(response.body)).not.toContain(token);
    }
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

  it('refuses a decision with no reasoning, because the audit record is the point', async () => {
    for (const body of [
      { decision: 'upheld' },
      { decision: 'upheld', reasoning: '   ' },
      { decision: 'upheld', reasoning: 'looks legit' },
    ]) {
      const res = await request(app.getHttpServer())
        .post(`/v1/review/${reportId}/decision`)
        .set('x-reviewer-token', TOKEN)
        .send(body);
      expect(res.status).toBe(400);
    }

    // And nothing happened to the report while it was being refused.
    expect((await store.byId(reportId))!.publishedAt).toBeNull();
  });

  it('records who decided, and refuses to forget', async () => {
    await request(app.getHttpServer())
      .post(`/v1/review/${reportId}/evidence`)
      .set('x-reviewer-token', TOKEN)
      .send({ note: 'The bank transfer receipt, and the advert as posted.', source: 'emailed' })
      .expect(200);

    const history = await store.decisionsFor(reportId);
    expect(history).toHaveLength(1);
    expect(history[0]!.action).toBe('evidence_recorded');
    expect(history[0]!.reviewer).toBe('unattributed');
    expect(history[0]!.reasoning).toContain('bank transfer receipt');
  });

  it('the public transparency figures name nobody and no report', async () => {
    /*
      The one public endpoint that reads *every* report rather than the
      published ones.

      It exists to publish the registry's own dismissal rate, which means it
      touches rows no stranger may see the contents of. So it is asserted
      against the same standard as everything else here: the description, the
      reporter, the report id and every reviewer name must be absent from what
      it returns, and the counts must still be right.
    */
    const res = await request(app.getHttpServer())
      .get('/v1/registry/transparency')
      .expect(200);

    const body = JSON.stringify(res.body);
    expect(body).not.toContain(SECRET);
    expect(body).not.toContain('someone-who-must-not-be-named');
    expect(body).not.toContain(reportId);
    expect(body).not.toContain('unattributed');
    expect(body).not.toContain(PHONE);

    // And it is actually reporting, not returning an empty shell.
    expect(res.body.received).toBeGreaterThan(0);
    expect(Object.keys(res.body).sort()).toEqual([
      'awaitingDecision',
      'medianDaysToDecision',
      'notUpheld',
      'oldestAwaitingDays',
      'received',
      'since',
      'upheld',
    ]);
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
      .send({
        decision: 'upheld',
        reasoning: 'Receipt and chat thread match the account given, and the reply does not address the fee.',
      })
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
