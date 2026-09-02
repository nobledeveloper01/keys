import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Pool } from 'pg';
import * as request from 'supertest';

import { DISTANCE_HORIZON_M, boundingBox, matches, metresBetween } from '@keys/domain';

import { AppModule } from '../src/app.module';
import { AgentsStore } from '../src/agents/agents.store';
import { KYC_TOKEN, REVIEWER_TOKEN, aVerifiedListing } from './helpers/verified';

/**
 * A query may narrow. It may not decide.
 *
 * ADR-0008. Search used to read every published listing and filter in
 * JavaScript, which is fine for three listings and not for thirty thousand.
 * The obvious fix — a `tsvector` and PostGIS — would have put a *second*
 * implementation of "does this match" and "is this within 200 m" next to the
 * ones in the domain, and the whole history of this codebase is two
 * implementations of one rule quietly disagreeing.
 *
 * So SQL narrows to a superset and the domain decides. What this file checks is
 * that the superset really is one: that for any query, the rows the store hands
 * back include every row the domain would keep.
 *
 * It runs against both stores, and the point is that they agree. A suite that
 * passes against memory is only evidence about production while that is true.
 */
const DATABASE_URL = process.env.KEYS_TEST_DATABASE_URL;
const STORES: Array<[name: string, url: string | undefined]> = [
  ['in memory', undefined],
  ...(DATABASE_URL ? ([['postgres', DATABASE_URL]] as Array<[string, string]>) : []),
];

const YABA = { latitude: 6.5095, longitude: 3.3711 };
const IKEJA = { latitude: 6.6018, longitude: 3.3515 };

describe.each(STORES)('narrowing never decides (%s)', (_name, databaseUrl) => {
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
      await pool.end();
    }

    await aVerifiedListing(app, agents, {
      seed: 600,
      title: 'Two bedroom flat, Yaba',
      point: YABA,
    });
    await aVerifiedListing(app, agents, {
      seed: 601,
      title: 'Three bedroom, Ikeja GRA',
      point: IKEJA,
    });
  });

  afterAll(async () => app.close());

  /** Everything the store is willing to hand a search, for these hints. */
  const superset = async (typed: string, near: { latitude: number; longitude: number } | null) => {
    const words = typed.trim().toLowerCase().split(/\s+/).filter((w) => w.length > 0);
    return agents.searchable({
      words,
      box: near ? boundingBox(near, DISTANCE_HORIZON_M) : null,
    });
  };

  it('hands back every listing the domain would keep', async () => {
    const everything = await agents.publishedListings();
    expect(everything.length).toBeGreaterThan(1);

    for (const typed of ['', 'yaba', 'YABA', 'flat', 'two bedroom', 'ikeja gra', 'bode']) {
      const narrowed = await superset(typed, null);
      const kept = everything.filter((l) => matches([l.title, l.propertyId], typed));

      for (const listing of kept) {
        expect(narrowed.map((l) => l.id)).toContain(listing.id);
      }
    }
  });

  it('narrows on a substring, the way the domain does', async () => {
    /*
      "yab" finds Yaba. A `tsvector` would not — it matches lexemes, so a
      partial word finds nothing, and the two stores would return different
      sets for a query somebody is halfway through typing.
    */
    const narrowed = await superset('yab', null);
    const kept = (await agents.publishedListings()).filter((l) =>
      matches([l.title, l.propertyId], 'yab'),
    );
    expect(kept.length).toBeGreaterThan(0);
    for (const listing of kept) {
      expect(narrowed.map((l) => l.id)).toContain(listing.id);
    }
  });

  it('keeps everything inside the ranking horizon', async () => {
    const everything = await agents.publishedListings();
    const narrowed = await superset('', YABA);

    const within = everything.filter(
      (l) =>
        l.latitude !== null &&
        l.longitude !== null &&
        metresBetween(YABA, { latitude: l.latitude, longitude: l.longitude }) <=
          DISTANCE_HORIZON_M,
    );
    expect(within.length).toBeGreaterThan(0);
    for (const listing of within) {
      expect(narrowed.map((l) => l.id)).toContain(listing.id);
    }
  });

  it('keeps a listing with no coordinates in a near-me search', async () => {
    /*
      It cannot be ranked by closeness — there is nothing to measure — but
      dropping it here would mean a near-me search silently hides every
      unplaced listing, which is a decision the domain never made.
    */
    /*
      The same property the agent already has authority for.

      An invented `propertyId` gets a listing that `publishListing` silently
      refuses — `mayList` asks whether a landlord confirmed *that* property —
      and the test would then be asserting about a draft while believing it was
      published.
    */
    const existing = (await agents.publishedListings())[0]!;
    const unplaced = await agents.createListing({
      agentId: existing.agentId,
      propertyId: existing.propertyId,
      title: 'Unplaced flat',
      latitude: null,
      longitude: null,
      costs: null,
      now: new Date(),
    });
    await agents.publishListing(unplaced.id, new Date());

    const narrowed = await superset('', YABA);
    expect(narrowed.map((l) => l.id)).toContain(unplaced.id);
  });

  it('never narrows on whether a listing is Verified', async () => {
    /*
      The line ADR-0008 draws. SQL may narrow on what a listing *says* — its
      words, its coordinates — and never on what Keys *concluded* about it.

      Lapse a confirmation and the listing stops being Verified. It must still
      come out of the store, because the store has no business knowing: a query
      that filtered on a badge would be reading an answer that is recomputed on
      every request, and phase 4's gate exists because that answer must never be
      cached anywhere.
    */
    const [first] = await agents.publishedListings();
    await agents.confirmStillAvailable(first!.id, new Date(Date.now() - 20 * 86_400_000));

    const narrowed = await superset('', null);
    expect(narrowed.map((l) => l.id)).toContain(first!.id);

    // And it is genuinely unverified — otherwise this proves nothing.
    const seen = await request(app.getHttpServer())
      .get(`/v1/listings/${first!.id}`)
      .expect(200);
    expect(seen.body.verified).toBe(false);
  });
});
