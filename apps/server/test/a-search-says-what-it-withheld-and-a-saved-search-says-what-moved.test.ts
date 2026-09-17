import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Pool } from 'pg';
import * as request from 'supertest';

import { AppModule } from '../src/app.module';
import { AgentsStore } from '../src/agents/agents.store';
import { MarketStore } from '../src/market/market.store';
import { KYC_TOKEN, REVIEWER_TOKEN, TYPICAL_COSTS, aTenant, aVerifiedListing } from './helpers/verified';

/**
 * ADR-0020. The count a search withheld is the argument for the smaller
 * inventory; a saved search is the box and the answer it last saw, and the
 * next read says what moved — and reading is what moves last time forward.
 */
const DATABASE_URL = process.env.KEYS_TEST_DATABASE_URL;
const STORES: Array<[name: string, url: string | undefined]> = [
  ['in memory', undefined],
  ...(DATABASE_URL ? ([['postgres', DATABASE_URL]] as Array<[string, string]>) : []),
];

describe.each(STORES)('a search says what it withheld, and a saved search says what moved (%s)', (_name, databaseUrl) => {
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
      await pool.query('TRUNCATE saved_searches');
      await pool.end();
    }
  });

  afterAll(async () => {
    await app.close();
  });

  const search = async (q: string) => (await request(app.getHttpServer()).get('/v1/listings').query({ q }).expect(200)).body as { results: { id: string }[]; withheld: number };

  it('counts what matched and was not shown, in the same pass that ranked the rest', async () => {
    const shown = await aVerifiedListing(app, agents, { seed: 921, title: 'Withheld test flat, shown' });
    const hidden = await aVerifiedListing(app, agents, { seed: 922, title: 'Withheld test flat, hidden' });
    expect((await search('Withheld test flat')).withheld).toBe(0);

    // A tenant went and found nothing there: the second is suspended. It is
    // still published, still matches, is not shown — and the count says so.
    // (A landlord's withdrawal would unpublish it instead, and an unpublished
    // listing is not withheld; it is not there.)
    await app.get(MarketStore).suspend({ listingId: hidden.id, reportedBy: 'tenant-922', now: new Date() });

    const after = await search('Withheld test flat');
    expect(after.results.map((r) => r.id)).toEqual([shown.id]);
    expect(after.withheld).toBe(1);
    // Asked for everything, nothing is withheld — and the count says that too.
    const all = (await request(app.getHttpServer()).get('/v1/listings').query({ q: 'Withheld test flat', verifiedOnly: 'false' }).expect(200)).body as { withheld: number };
    expect(all.withheld).toBe(0);
  });

  it('a saved search says what is new, what changed price and what is gone, and only since the last read', async () => {
    const http = app.getHttpServer();
    const tenant = await aTenant(app, 'Chiamaka 930');
    const first = await aVerifiedListing(app, agents, { seed: 931, title: 'Saved search flat one' });

    const saved = await request(http).post('/v1/saved-searches').set('x-tenant-token', tenant.token).send({ q: 'Saved search flat' }).expect(201);
    expect(saved.body.matching).toBe(1);
    expect(saved.body.moves).toEqual([]);
    // Saving the same question twice keeps one.
    await request(http).post('/v1/saved-searches').set('x-tenant-token', tenant.token).send({ q: '  saved SEARCH flat ' }).expect(201);
    expect((await request(http).get('/v1/saved-searches').set('x-tenant-token', tenant.token).expect(200)).body).toHaveLength(1);

    // The market moves: a second listing, a price change on the first.
    const second = await aVerifiedListing(app, agents, { seed: 932, title: 'Saved search flat two' });
    await request(http)
      .post(`/v1/agents/me/listings/${first.id}/costs`)
      .set('x-agent-token', first.token)
      .send({ ...TYPICAL_COSTS, annualRentKobo: 950_000_00 })
      .expect(201);

    const read = await request(http).get('/v1/saved-searches').set('x-tenant-token', tenant.token).expect(200);
    const moves = read.body[0].moves as Array<{ kind: string; id: string; fromKobo?: number; toKobo?: number }>;
    expect(moves).toContainEqual({ kind: 'new', id: second.id });
    expect(moves).toContainEqual({ kind: 'price', id: first.id, fromKobo: 800_000_00, toKobo: 950_000_00 });
    expect(read.body[0].matching).toBe(2);

    // Reading moved last time forward: nothing has moved since.
    const again = await request(http).get('/v1/saved-searches').set('x-tenant-token', tenant.token).expect(200);
    expect(again.body[0].moves).toEqual([]);

    // The second goes: the landlord withdraws, and the next read says so.
    const withdrawal = await agents.openWithdrawal({ agentId: second.agentId, propertyId: second.propertyId, landlordPhone: second.landlordPhone, now: new Date() });
    await request(http).post('/v1/authority/confirm').send({ challengeId: withdrawal!.challenge.id, code: withdrawal!.code }).expect(201);
    const gone = await request(http).get('/v1/saved-searches').set('x-tenant-token', tenant.token).expect(200);
    expect(gone.body[0].moves).toEqual([{ kind: 'gone', id: second.id }]);

    // Another tenant sees none of it; forgetting is the tenant's own.
    const other = await aTenant(app, 'Other 930');
    expect((await request(http).get('/v1/saved-searches').set('x-tenant-token', other.token).expect(200)).body).toEqual([]);
    await request(http).delete(`/v1/saved-searches/${read.body[0].id}`).set('x-tenant-token', other.token).expect(404);
    await request(http).delete(`/v1/saved-searches/${read.body[0].id}`).set('x-tenant-token', tenant.token).expect(200);
    expect((await request(http).get('/v1/saved-searches').set('x-tenant-token', tenant.token).expect(200)).body).toEqual([]);
    await request(http).get('/v1/saved-searches').expect(401);
  });
});
