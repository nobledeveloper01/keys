import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';

import { AppModule } from '../src/app.module';
import { MAX_SEND_ATTEMPTS, Outbox, type SmsSender } from '../src/outbox/outbox';
import { hashPhone } from '../src/reports/reports.store';

/**
 * ADR-0017: the outbox is the one place a number is written in plain, for
 * one message, and it is gone the moment the message is sent or given up
 * on. And the right of reply reaches an agent through their account,
 * because their number is held only as a hash.
 */
const DATABASE_URL = process.env.KEYS_TEST_DATABASE_URL;
const STORES: Array<[name: string, url: string | undefined]> = [
  ['in memory', undefined],
  ...(DATABASE_URL ? ([['postgres', DATABASE_URL]] as Array<[string, string]>) : []),
];

class Spy implements SmsSender {
  readonly sent: Array<{ to: string; body: string }> = [];
  refuse = false;
  send(to: string, body: string): Promise<boolean> {
    if (this.refuse) return Promise.resolve(false);
    this.sent.push({ to, body });
    return Promise.resolve(true);
  }
}

describe.each(STORES)('the outbox forgets the number (%s)', (_name, databaseUrl) => {
  let app: INestApplication;
  let spy: Spy;

  beforeAll(async () => {
    if (databaseUrl) process.env.KEYS_DATABASE_URL = databaseUrl;
    else delete process.env.KEYS_DATABASE_URL;
    spy = new Spy();
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider('SmsSender')
      .useValue(spy)
      .overrideProvider(Outbox)
      .useFactory({ factory: () => new Outbox(spy) })
      .compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('holds the number until the text is sent, then only the hash, the body and when', async () => {
    const outbox = app.get(Outbox);
    const reportedPhone = '+2348012340001';
    await request(app.getHttpServer())
      .post('/v1/registry/reports')
      .send({ reportedPhone, category: 'no_show', description: 'Took the fee and never came, twice in one week.' })
      .expect(201);

    expect(outbox.numbersHeld).toBe(1);
    // Nothing a reader of the queue can see addresses anybody.
    expect(JSON.stringify(outbox.pending())).not.toContain(reportedPhone);
    expect(JSON.stringify(outbox.pending())).not.toContain('2348012340001');

    const drained = await outbox.drain(new Date());
    expect(drained).toEqual({ sent: 1, dropped: 0 });
    expect(spy.sent.at(-1)!.to).toBe(reportedPhone);
    expect(outbox.numbersHeld).toBe(0);
    expect(outbox.depth).toBe(0);
    const kept = outbox.record().at(-1)!;
    expect(kept.toPhoneHash).toBe(hashPhone(reportedPhone));
    expect(kept.sentAt).not.toBeNull();
    expect(JSON.stringify(outbox.record())).not.toContain('2348012340001');
  });

  it('drops a message the sender keeps refusing, number and all, rather than keeping it forever', async () => {
    const outbox = app.get(Outbox);
    spy.refuse = true;
    await request(app.getHttpServer())
      .post('/v1/registry/reports')
      .send({ reportedPhone: '+2348012340002', category: 'no_show', description: 'Asked for a viewing fee for a flat that is not theirs to show.' })
      .expect(201);
    expect(outbox.numbersHeld).toBe(1);
    for (let i = 0; i < MAX_SEND_ATTEMPTS - 1; i++) {
      expect(await outbox.drain(new Date())).toEqual({ sent: 0, dropped: 0 });
      expect(outbox.numbersHeld).toBe(1);
    }
    expect(await outbox.drain(new Date())).toEqual({ sent: 0, dropped: 1 });
    expect(outbox.numbersHeld).toBe(0);
    expect(JSON.stringify(outbox.record())).not.toContain('2348012340002');
    spy.refuse = false;
  });

  it('delivers the right of reply to an agent through their account, and texts nobody', async () => {
    const outbox = app.get(Outbox);
    const http = app.getHttpServer();
    const signedUp = await request(http)
      .post('/v1/agents')
      .send({ displayName: 'Agent Reply', phone: '+2348077700001' })
      .expect(201);
    const token = signedUp.body.token as string;
    const agentId = signedUp.body.agentId as string;

    // Reported by number — the registry path — while the number belongs to an agent.
    const before = outbox.depth;
    await request(http)
      .post('/v1/registry/reports')
      .send({ reportedPhone: '+2348077700001', category: 'no_show', description: 'Never turned up to the viewing they arranged themselves.' })
      .expect(201);
    // The reporter typed the number, so a text is owed and addressed.
    expect(outbox.depth).toBe(before + 1);

    // And the agent sees it in their own account, with the same link and never the reporter.
    const mine = await request(http).get('/v1/agents/me/reports').set('x-agent-token', token).expect(200);
    expect(mine.body).toHaveLength(1);
    expect(mine.body[0].reply).toContain('/reply?token=');
    expect(mine.body[0].published).toBe(false);
    expect(mine.body[0].answered).toBe(false);
    expect(JSON.stringify(mine.body)).not.toContain('reporter');
    // Another agent sees nothing of it.
    const other = await request(http).post('/v1/agents').send({ displayName: 'Agent Other', phone: '+2348077700002' }).expect(201);
    const theirs = await request(http).get('/v1/agents/me/reports').set('x-agent-token', other.body.token as string).expect(200);
    expect(theirs.body).toHaveLength(0);
    // Without a token there is no such view.
    await request(http).get('/v1/agents/me/reports').expect(401);
    expect(agentId).toBeTruthy();
  });
});
