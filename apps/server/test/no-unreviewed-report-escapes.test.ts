import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';

import { AppModule } from '../src/app.module';
import { ReportsStore } from '../src/reports/reports.store';

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

describe('no unreviewed report escapes', () => {
  let app: INestApplication;
  let store: ReportsStore;
  let reportId: string;
  let replyToken: string;

  beforeAll(async () => {
    process.env.KEYS_REVIEWER_TOKEN = TOKEN;
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();

    store = app.get(ReportsStore);
    const row = store.add({
      id: 'report-under-test',
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
    await app.close();
    delete process.env.KEYS_REVIEWER_TOKEN;
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

  it('the report is genuinely unreviewed', () => {
    const row = store.byId(reportId)!;
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
