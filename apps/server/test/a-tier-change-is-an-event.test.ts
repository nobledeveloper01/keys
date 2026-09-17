import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Pool } from 'pg';
import * as request from 'supertest';

import { AppModule } from '../src/app.module';
import { AgentsStore } from '../src/agents/agents.store';
import { KYC_TOKEN, REVIEWER_TOKEN, aTenant, aVerifiedListing } from './helpers/verified';

/**
 * ADR-0019: the tier is computed on every read and stored nowhere, so its
 * *change* was never noticed. Now the computation records what it observed,
 * a drop is an event, and every tenant with an open enquiry is told — by
 * `keys`, in the conversation, within one read of the change. A rise is
 * recorded and never announced.
 */
const DATABASE_URL = process.env.KEYS_TEST_DATABASE_URL;
const STORES: Array<[name: string, url: string | undefined]> = [
  ['in memory', undefined],
  ...(DATABASE_URL ? ([['postgres', DATABASE_URL]] as Array<[string, string]>) : []),
];

describe.each(STORES)('a tier change is an event (%s)', (_name, databaseUrl) => {
  let app: INestApplication;
  let agents: AgentsStore;

  beforeAll(async () => {
    process.env.KEYS_REVIEWER_TOKEN = REVIEWER_TOKEN;
    process.env.KEYS_KYC_TOKEN = KYC_TOKEN;
    if (databaseUrl) process.env.KEYS_DATABASE_URL = databaseUrl;
    else delete process.env.KEYS_DATABASE_URL;
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    await app.listen(0);
    agents = app.get(AgentsStore);
    if (databaseUrl) {
      const pool = new Pool({ connectionString: databaseUrl });
      await pool.query('TRUNCATE agents CASCADE');
      await pool.query('TRUNCATE tenants CASCADE');
      await pool.query('TRUNCATE tier_observations, tier_changes');
      await pool.end();
    }
  });

  afterAll(async () => {
    await app.close();
  });

  it('tells every open enquiry when the tier drops, records the change, and announces no rise', async () => {
    const http = app.getHttpServer();
    const listing = await aVerifiedListing(app, agents, { seed: 910 });
    // The computation has observed `authority` at least once: the profile read does it.
    const before = await request(http).get('/v1/agents/me').set('x-agent-token', listing.token).expect(200);
    expect(before.body.tier).toBe('authority');

    const tenant = await aTenant(app, 'Ngozi 910');
    const opened = await request(http)
      .post('/v1/conversations')
      .set('x-tenant-token', tenant.token)
      .send({ listingId: listing.id, body: 'Is this still available?' })
      .expect(201);
    const conversationId = opened.body.id as string;

    // The landlord withdraws: the next computation says `identity`.
    const withdrawal = await agents.openWithdrawal({
      agentId: listing.agentId,
      propertyId: listing.propertyId,
      landlordPhone: listing.landlordPhone,
      now: new Date(),
    });
    await request(http)
      .post('/v1/authority/confirm')
      .send({ challengeId: withdrawal!.challenge.id, code: withdrawal!.code })
      .expect(201);

    // Nothing is said until something computes the tier — and the next read does.
    const after = await request(http).get('/v1/agents/me').set('x-agent-token', listing.token).expect(200);
    expect(after.body.tier).toBe('identity');

    const seen = await request(http)
      .get(`/v1/conversations/${conversationId}`)
      .set('x-tenant-token', tenant.token)
      .expect(200);
    const fromKeys = seen.body.messages.filter((m: { speaker: string }) => m.speaker === 'keys');
    expect(fromKeys).toHaveLength(1);
    expect(fromKeys[0].body).toContain('from authority to identity');
    expect(fromKeys[0].body).toContain('never that a flat exists');

    const changes = await agents.tierChangesFor(listing.agentId);
    expect(changes.map((c) => [c.from, c.to])).toEqual([['authority', 'identity']]);

    // Reading again says nothing more: the observation moved with the change.
    await request(http).get('/v1/agents/me').set('x-agent-token', listing.token).expect(200);
    const again = await request(http).get(`/v1/conversations/${conversationId}`).set('x-tenant-token', tenant.token).expect(200);
    expect(again.body.messages.filter((m: { speaker: string }) => m.speaker === 'keys')).toHaveLength(1);

    // A rise is recorded and not announced.
    const regranted = await agents.openChallenge({
      purpose: 'grant',
      agentId: listing.agentId,
      propertyId: listing.propertyId,
      landlordPhone: listing.landlordPhone,
      now: new Date(),
    });
    await request(http).post('/v1/authority/confirm').send({ challengeId: regranted.challenge.id, code: regranted.code }).expect(201);
    const risen = await request(http).get('/v1/agents/me').set('x-agent-token', listing.token).expect(200);
    expect(risen.body.tier).toBe('authority');
    expect((await agents.tierChangesFor(listing.agentId)).length).toBe(2);
    const still = await request(http).get(`/v1/conversations/${conversationId}`).set('x-tenant-token', tenant.token).expect(200);
    expect(still.body.messages.filter((m: { speaker: string }) => m.speaker === 'keys')).toHaveLength(1);
  });
});
