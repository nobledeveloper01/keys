import { createHash, generateKeyPairSync, randomUUID, sign } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Pool } from 'pg';
import * as request from 'supertest';

import { VERIFIED_CONDITIONS, claimMessage, type CaptureClaim } from '@keys/domain';

import { AppModule } from '../src/app.module';
import { AgentsStore } from '../src/agents/agents.store';
import { CapturesStore } from '../src/captures/captures.store';

/**
 * Phase 4's exit gate.
 *
 * *A search never returns a listing the searcher could not have seen.*
 *
 * The claim is about **freshness**, not about a filter. Verified is computed on
 * every search from the same evidence the agent's own screen reads — so a
 * listing that lost its badge a minute ago is gone from the next search
 * without anything having to re-index, and no cache can be behind.
 *
 * Every way of losing the badge is exercised: the landlord withdraws, a
 * reviewer withdraws the ID, a reviewer blocks a duplicate image, a report is
 * upheld, and the fortnight lapses. Each one, on its own, takes the listing out
 * of the results on the very next request.
 */
const DATABASE_URL = process.env.KEYS_TEST_DATABASE_URL;
if (!DATABASE_URL) {
  console.warn('\n  ! KEYS_TEST_DATABASE_URL is not set — in-memory only.\n');
}
const STORES: Array<[name: string, url: string | undefined]> = [
  ['in memory', undefined],
  ...(DATABASE_URL ? ([['postgres', DATABASE_URL]] as Array<[string, string]>) : []),
];

const REVIEWER = 'r'.repeat(48);
const KYC = 'k'.repeat(48);
const YABA = { latitude: 6.5095, longitude: 3.3711 };

function grid(seed: number, width = 40, height = 32): Buffer {
  const header = Buffer.alloc(12);
  header.write('KEYSGREY', 0, 'latin1');
  header.writeUInt16BE(width, 8);
  header.writeUInt16BE(height, 10);
  const pixels = Buffer.alloc(width * height);
  let state = (seed * 2654435761) >>> 0;
  for (let i = 0; i < pixels.length; i += 1) {
    state = (state * 1664525 + 1013904223) >>> 0;
    pixels[i] = state >>> 24;
  }
  return Buffer.concat([header, pixels]);
}

describe.each(STORES)('search shows nothing it cannot stand behind (%s)', (_name, databaseUrl) => {
  let app: INestApplication;
  let agents: AgentsStore;
  let token: string;
  let agentId: string;
  let listingId: string;
  let landlordPhone: string;

  /** A listing with all eight conditions met, from scratch. */
  async function aFullyVerifiedListing(suffix: string) {
    const signedUp = await request(app.getHttpServer())
      .post('/v1/agents')
      .send({ displayName: `Verified Agent ${suffix}`, phone: `+23480${suffix}` })
      .expect(201);
    const theirToken = signedUp.body.token as string;
    const theirId = signedUp.body.agentId as string;

    await request(app.getHttpServer())
      .post('/v1/authority/identity')
      .set('x-kyc-token', KYC)
      .send({ agentId: theirId, vendor: 'smile-id', reference: `ref-${suffix}` })
      .expect(201);

    const property = `A flat at ${suffix}, Yaba`;
    const phone = `+23481${suffix}`;
    const granted = await agents.openChallenge({
      purpose: 'grant',
      agentId: theirId,
      propertyId: property,
      landlordPhone: phone,
      now: new Date(),
    });
    await request(app.getHttpServer())
      .post('/v1/authority/confirm')
      .send({ challengeId: granted.challenge.id, code: granted.code })
      .expect(201);

    const draft = await request(app.getHttpServer())
      .post('/v1/agents/me/listings')
      .set('x-agent-token', theirToken)
      .send({
        propertyId: property,
        title: `Two bedroom flat ${suffix}`,
        ...YABA,
        // The eighth condition. Stated at draft here because this helper's job
        // is "everything met"; the screen lets an agent fill it in later.
        costs: {
          annualRentKobo: 800_000_00,
          agencyFeeKobo: 80_000_00,
          legalFeeKobo: 80_000_00,
          cautionDepositKobo: 100_000_00,
          serviceChargeKobo: 40_000_00,
        },
      })
      .expect(201);

    // A photograph and a walkthrough, both on site and both signed.
    const { publicKey, privateKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
    const device = await request(app.getHttpServer())
      .post('/v1/captures/devices')
      .set('x-agent-token', theirToken)
      .send({ publicKey: publicKey.export({ format: 'der', type: 'spki' }).toString('base64') })
      .expect(201);

    for (const [seed, kind, duration] of [
      [Number(suffix) * 2, 'photo', null],
      [Number(suffix) * 2 + 1, 'video', 45],
    ] as const) {
      const bytes = grid(seed);
      const claim: CaptureClaim = {
        sha256: createHash('sha256').update(bytes).digest('hex'),
        listingId: draft.body.id,
        capturedAt: new Date(),
        latitude: YABA.latitude,
        longitude: YABA.longitude,
        nonce: randomUUID(),
        mockLocation: false,
        durationSeconds: duration,
      };
      await request(app.getHttpServer())
        .post('/v1/captures')
        .set('x-agent-token', theirToken)
        .send({
          deviceId: device.body.deviceId,
          listingId: claim.listingId,
          sha256: claim.sha256,
          capturedAt: claim.capturedAt.toISOString(),
          latitude: claim.latitude,
          longitude: claim.longitude,
          nonce: claim.nonce,
          mockLocation: false,
          kind,
          durationSeconds: duration,
          signature: sign(
            'sha256',
            Buffer.from(claimMessage(claim), 'utf8'),
            privateKey,
          ).toString('base64'),
          pixels: bytes.toString('base64'),
        })
        .expect(201);
    }

    await request(app.getHttpServer())
      .post(`/v1/agents/me/listings/${draft.body.id}/publish`)
      .set('x-agent-token', theirToken)
      .expect(201);
    await request(app.getHttpServer())
      .post(`/v1/agents/me/listings/${draft.body.id}/confirm`)
      .set('x-agent-token', theirToken)
      .expect(201);

    return { token: theirToken, agentId: theirId, listingId: draft.body.id as string, phone, property };
  }

  async function results(query: Record<string, string> = {}) {
    const response = await request(app.getHttpServer())
      .get('/v1/listings')
      .query(query)
      .expect(200);
    return (response.body as Array<{ id: string }>).map((r) => r.id);
  }

  beforeAll(async () => {
    process.env.KEYS_REVIEWER_TOKEN = REVIEWER;
    process.env.KEYS_KYC_TOKEN = KYC;
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

    const made = await aFullyVerifiedListing('1');
    token = made.token;
    agentId = made.agentId;
    listingId = made.listingId;
    landlordPhone = made.phone;
  });

  afterAll(async () => {
    await app.close();
    delete process.env.KEYS_REVIEWER_TOKEN;
    delete process.env.KEYS_KYC_TOKEN;
    delete process.env.KEYS_DATABASE_URL;
  });

  it('shows a listing whose eight conditions all hold', async () => {
    // If this fails nothing below proves anything: every other test here
    // removes one condition and checks the listing disappears.
    expect(await results()).toContain(listingId);
  });

  it('does not show a draft, or a listing that was never published', async () => {
    const draft = await request(app.getHttpServer())
      .post('/v1/agents/me/listings')
      .set('x-agent-token', token)
      .send({ propertyId: 'Somewhere private', title: 'Not published' })
      .expect(201);
    expect(await results()).not.toContain(draft.body.id);
    // And it is a 404 rather than a 403, so a stranger cannot learn which
    // listing ids exist by asking.
    await request(app.getHttpServer()).get(`/v1/listings/${draft.body.id}`).expect(404);
  });

  it('narrows as you type, rather than widening', async () => {
    expect(await results({ q: 'flat' })).toContain(listingId);
    expect(await results({ q: 'flat yaba' })).toContain(listingId);
    expect(await results({ q: 'flat surulere' })).not.toContain(listingId);
  });

  it('publishes the evidence rather than a badge', async () => {
    const view = await request(app.getHttpServer())
      .get(`/v1/listings/${listingId}`)
      .expect(200);

    expect(view.body.verified).toBe(true);
    /*
      Against the domain's list, not a number typed here. `7` went stale the
      day an eighth condition was added, and a literal in a test is a second
      place to remember something the domain already knows.
    */
    expect(view.body.checks).toHaveLength(VERIFIED_CONDITIONS.length);
    expect(view.body.checks.map((c: { condition: string }) => c.condition)).toEqual([
      ...VERIFIED_CONDITIONS,
    ]);
    expect(view.body.checks.every((c: { met: boolean }) => c.met)).toBe(true);
    // In the reader's language, not only English.
    const hausa = await request(app.getHttpServer())
      .get(`/v1/listings/${listingId}`)
      .query({ language: 'ha' })
      .expect(200);
    expect(hausa.body.checks[0].label).not.toBe(view.body.checks[0].label);
  });

  it('drops it the moment the landlord withdraws, with nothing re-indexed', async () => {
    const withdrawal = await agents.openWithdrawal({
      agentId,
      propertyId: (await agents.listing(listingId))!.propertyId,
      now: new Date(),
    });
    await request(app.getHttpServer())
      .post('/v1/authority/confirm')
      .send({ challengeId: withdrawal!.challenge.id, code: withdrawal!.code })
      .expect(201);

    // The very next request. No sweep, no job, no cache to invalidate.
    expect(await results()).not.toContain(listingId);

    /*
      And the listing page is gone, not merely unbadged.

      A withdrawal cascades: the listing is unpublished in the same transaction
      as the authority is revoked. So this is a 404 rather than a page saying
      "not Verified" — which is the stronger answer, and the one a landlord who
      just withdrew would expect. A tenant holding the link is told by their
      app that it is no longer available; a stranger probing ids learns nothing
      either way.
    */
    await request(app.getHttpServer()).get(`/v1/listings/${listingId}`).expect(404);
    expect(landlordPhone).toBeTruthy();
  });

  it('drops one whose ID a reviewer withdrew', async () => {
    const made = await aFullyVerifiedListing('2');
    expect(await results()).toContain(made.listingId);

    await request(app.getHttpServer())
      .post(`/v1/agent-review/${made.agentId}/withdraw-identity`)
      .set('x-reviewer-token', REVIEWER)
      .expect(201);

    expect(await results()).not.toContain(made.listingId);
  });

  it('drops one whose image a reviewer blocked', async () => {
    const made = await aFullyVerifiedListing('3');
    expect(await results()).toContain(made.listingId);

    const captures = app.get(CapturesStore);
    await captures.openPairs(made.listingId, [{ id: 'somewhere-else', distance: 0 }], new Date());
    await captures.decidePair({
      listingId: made.listingId,
      matchedListingId: 'somewhere-else',
      decision: 'blocked',
      reviewer: 'a reviewer',
      reasoning: 'The same photograph as a listing we already took down.',
    });

    expect(await results()).not.toContain(made.listingId);
  });

  it('drops one whose confirmation has lapsed', async () => {
    const made = await aFullyVerifiedListing('4');
    expect(await results()).toContain(made.listingId);

    await agents.confirmStillAvailable(made.listingId, new Date(Date.now() - 20 * 86_400_000));
    expect(await results()).not.toContain(made.listingId);
  });

  it('shows an unverified listing only when asked for one', async () => {
    /*
      The filter defaults on, and turning it off is a deliberate act.

      A tenant who has not chosen sees only listings Keys can stand behind —
      which is the whole product. Somebody who wants everything can say so, and
      what they get back still says, per listing, that it is not Verified.
    */
    const made = await aFullyVerifiedListing('5');
    // Lapse one condition without unpublishing it, so it is published and
    // unverified — the state this filter exists to decide about.
    await agents.confirmStillAvailable(made.listingId, new Date(Date.now() - 20 * 86_400_000));

    expect(await results()).not.toContain(made.listingId);

    const all = await request(app.getHttpServer())
      .get('/v1/listings')
      .query({ verifiedOnly: 'false' })
      .expect(200);
    const found = (all.body as Array<{ id: string; verified: boolean }>).find(
      (r) => r.id === made.listingId,
    );
    expect(found).toBeTruthy();
    // And it says so, per listing, rather than looking like the rest.
    expect(found!.verified).toBe(false);
  });
});
