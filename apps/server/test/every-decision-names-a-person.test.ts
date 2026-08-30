import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { randomUUID } from 'node:crypto';

import { AppModule } from '../src/app.module';
import { ReportsStore } from '../src/reports/reports.store';

/**
 * "A reviewer" is not an answer to "who decided this".
 *
 * Every action in the console publishes, or declines to publish, a claim about
 * a named person. A year from now somebody may have to answer for one, and a
 * single shared secret makes that unanswerable — so the guard resolves a token
 * to a named reviewer and every action records which.
 *
 * Real accounts arrive with agent verification in phase 2. Until then this is
 * the smallest thing that still attributes, and it is tested so that the
 * shortcut cannot quietly become permanent by being untested.
 */

const AMINA = 'a'.repeat(40);
const CHIDI = 'c'.repeat(40);
const PHONE = '+2348077700011';

describe('every decision names a person', () => {
  let app: INestApplication;
  let store: ReportsStore;

  beforeAll(async () => {
    process.env.KEYS_REVIEWERS = `amina:${AMINA},chidi:${CHIDI}`;
    delete process.env.KEYS_REVIEWER_TOKEN;
    delete process.env.KEYS_DATABASE_URL;

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    store = app.get(ReportsStore);
  });

  afterAll(async () => {
    await app.close();
    delete process.env.KEYS_REVIEWERS;
  });

  async function aReport() {
    const row = await store.add({
      id: randomUUID(),
      reporterId: 'reporter',
      reportedPhone: PHONE,
      category: 'undisclosed_fees',
      description: 'Added a two hundred thousand naira agency fee on the day of signing.',
      evidenceKeys: ['receipt.jpg'],
      now: new Date(Date.now() - 30 * 86_400_000),
    });
    return row.id;
  }

  it('resolves each token to the reviewer who holds it', async () => {
    const id = await aReport();

    await request(app.getHttpServer())
      .post(`/v1/review/${id}/decision`)
      .set('x-reviewer-token', CHIDI)
      .send({ decision: 'not_upheld', reasoning: 'The fee is disclosed in the agreement they signed.' })
      .expect(200);

    const history = await store.decisionsFor(id);
    expect(history).toHaveLength(1);
    expect(history[0]!.reviewer).toBe('chidi');
    expect(history[0]!.reasoning).toContain('disclosed in the agreement');
  });

  it('refuses a token nobody holds, and a token too short to be one', async () => {
    for (const token of [AMINA.slice(0, 39), 'x'.repeat(40), '', 'short']) {
      const res = await request(app.getHttpServer())
        .get('/v1/review/queue')
        .set('x-reviewer-token', token);
      expect(res.status).toBe(403);
    }
  });

  it('the audit record is never the reviewer’s token', async () => {
    const id = await aReport();
    await request(app.getHttpServer())
      .post(`/v1/review/${id}/evidence`)
      .set('x-reviewer-token', AMINA)
      .send({ note: 'The signed agreement, and the invoice that followed it.', source: 'uploaded by the reporter' })
      .expect(200);

    const history = JSON.stringify(await store.decisionsFor(id));
    expect(history).toContain('amina');
    expect(history).not.toContain(AMINA);
  });

  it('counts what each reviewer did, which is the number phase 1 does not close without', async () => {
    const before = await store.throughput(new Date(0));
    const id = await aReport();

    await request(app.getHttpServer())
      .post(`/v1/review/${id}/decision`)
      .set('x-reviewer-token', AMINA)
      .send({ decision: 'upheld', reasoning: 'Invoice postdates the agreement and names a fee absent from it.' })
      .expect(200);

    const after = await request(app.getHttpServer())
      .get('/v1/review/metrics')
      .set('x-reviewer-token', AMINA)
      .expect(200);

    const amina = after.body.decisions.find(
      (d: { reviewer: string; action: string }) => d.reviewer === 'amina' && d.action === 'upheld',
    );
    expect(amina.count).toBeGreaterThan(
      before.decisions.find((d) => d.reviewer === 'amina' && d.action === 'upheld')?.count ?? 0,
    );
    // And the queue depth, because throughput without a backlog reads as healthy
    // while the backlog is what actually decides whether a city can be opened.
    expect(typeof after.body.waiting).toBe('number');
  });

  it('the metrics endpoint is behind the same guard as everything else', async () => {
    await request(app.getHttpServer()).get('/v1/review/metrics').expect(403);
  });
});
