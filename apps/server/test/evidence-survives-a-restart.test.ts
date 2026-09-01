import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Pool } from 'pg';
import * as request from 'supertest';

import { AppModule } from '../src/app.module';
import { AgentsStore } from '../src/agents/agents.store';
import { CapturesStore } from '../src/captures/captures.store';
import { KYC_TOKEN, REVIEWER_TOKEN, aVerifiedListing } from './helpers/verified';

/**
 * A deploy does not un-verify the catalogue.
 *
 * The captures store had no durable implementation. It was memory-only in
 * production as well as in tests, so every photograph and walkthrough in the
 * product vanished on restart — and with them `capture_on_site` and
 * `walkthrough_video` on every listing that had them.
 *
 * Nothing said so. `/healthz` reports the *reports* store's durability, the
 * badge is recomputed on every read and so was simply false afterwards, and
 * the suite passed because a suite that starts a fresh app for every run
 * cannot notice a store that only forgets between runs.
 *
 * This test starts an app, closes it, starts another against the same
 * database, and asks the questions a tenant would.
 */
const DATABASE_URL = process.env.KEYS_TEST_DATABASE_URL;

const describeWithDatabase = DATABASE_URL ? describe : describe.skip;

describeWithDatabase('evidence survives a restart', () => {
  let app: INestApplication;
  let listingId: string;

  async function boot() {
    process.env.KEYS_REVIEWER_TOKEN = REVIEWER_TOKEN;
    process.env.KEYS_KYC_TOKEN = KYC_TOKEN;
    process.env.KEYS_DATABASE_URL = DATABASE_URL;
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    const started = moduleRef.createNestApplication();
    await started.init();
    await started.listen(0);
    return started;
  }

  beforeAll(async () => {
    const pool = new Pool({ connectionString: DATABASE_URL });
    await pool.query('TRUNCATE agents CASCADE');
    await pool.query('TRUNCATE tenants CASCADE');
    /*
      Nonces have no foreign key — a spent nonce has to outlive whatever spent
      it, or a deleted agent hands their replays back. So the cascade above does
      not reach them and this suite has to say so itself, or the second run
      finds its own leftovers.
    */
    await pool.query('TRUNCATE capture_nonces');
    await pool.end();

    app = await boot();
    const made = await aVerifiedListing(app, app.get(AgentsStore), { seed: 700 });
    listingId = made.id;

    const before = await request(app.getHttpServer())
      .get(`/v1/listings/${listingId}`)
      .expect(200);
    // If this is not verified, the rest of the test proves nothing.
    expect(before.body.verified).toBe(true);

    /*
      The restart. `close()` runs `onModuleDestroy`, so the pools go with it and
      the next app opens its own — which is the thing being tested: nothing is
      carried across in a process-local variable.
    */
    await app.close();
    app = await boot();
  });

  afterAll(async () => {
    await app.close();
  });

  it('still has the photograph and the walkthrough', async () => {
    const seen = await request(app.getHttpServer())
      .get(`/v1/listings/${listingId}`)
      .expect(200);

    const unmet = seen.body.checks
      .filter((check: { met: boolean }) => !check.met)
      .map((check: { condition: string }) => check.condition);

    expect(unmet).not.toContain('capture_on_site');
    expect(unmet).not.toContain('walkthrough_video');
    expect(seen.body.verified).toBe(true);
  });

  it('still finds it in a search', async () => {
    // The tenant-visible consequence. Before this store existed, a deploy took
    // every verified listing out of every search until each agent walked back
    // to their property and photographed it again.
    const found = await request(app.getHttpServer()).get('/v1/listings').expect(200);
    expect(found.body.results.map((r: { id: string }) => r.id)).toContain(listingId);
  });

  it('still refuses a nonce that was already spent', async () => {
    /*
      The security half.

      Nonces lived in the same forgetful store, so a restart made every
      previously-used nonce spendable again — and a signed capture plus a
      reusable nonce is a replay. An attacker who kept one valid upload could
      submit it again after any deploy.

      Asked *through the store*, not by querying the table. The first version of
      this read `capture_nonces` directly and asserted the row was there, which
      stayed true when the store was switched back to memory — the row existed
      and nothing was reading it. A gate that passes while the thing it guards
      is switched off is not a gate.
    */
    const pool = new Pool({ connectionString: DATABASE_URL });
    const { rows } = await pool.query<{ nonce: string }>('SELECT nonce FROM capture_nonces LIMIT 1');
    await pool.end();
    expect(rows[0]).toBeDefined();

    const captures = app.get(CapturesStore);
    expect(await captures.claimNonce(rows[0]!.nonce, new Date())).toBe(false);

    // And one nobody has used is still spendable, or the assertion above would
    // pass for a store that refuses everything.
    expect(await captures.claimNonce(`fresh-${rows[0]!.nonce}`, new Date())).toBe(true);
  });
});
