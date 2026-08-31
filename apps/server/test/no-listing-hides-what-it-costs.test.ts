import { createHash, generateKeyPairSync, randomUUID, sign } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Pool } from 'pg';
import * as request from 'supertest';

import { claimMessage, moveInCostKobo, naira, type CaptureClaim } from '@keys/domain';

import { AppModule } from '../src/app.module';
import { AgentsStore } from '../src/agents/agents.store';

/**
 * A published listing says what it costs, or it is not Verified.
 *
 * The most common complaint in this market after the flat not existing: the
 * advert says ₦800,000 and the tenant is asked for ₦1,100,000 on the day.
 * Agency fee, agreement fee, caution deposit, service charge — none of it
 * secret, none of it ever added up anywhere before somebody is asked for it.
 *
 * `costs_stated` is the odd one out among the eight conditions and this file
 * is honest about why. The other seven are evidence that a property and an
 * agent are real; this one an agent could satisfy with invented numbers.
 * Stating a fee does not make it true.
 *
 * What it buys is that a stated fee is a **claim on the record**. An agent who
 * wrote ₦80,000 and asks for ₦200,000 at the door can be reported for it, and
 * `undisclosed_fees` is already a report category here. Silence cannot be
 * reported against, which is exactly why silence is the norm.
 */
const DATABASE_URL = process.env.KEYS_TEST_DATABASE_URL;
const STORES: Array<[name: string, url: string | undefined]> = [
  ['in memory', undefined],
  ...(DATABASE_URL ? ([['postgres', DATABASE_URL]] as Array<[string, string]>) : []),
];

const REVIEWER = 'r'.repeat(48);
const KYC = 'k'.repeat(48);
const YABA = { latitude: 6.5095, longitude: 3.3711 };

/** ₦800,000 a year with the customary ten per cent each way. */
const TYPICAL = {
  annualRentKobo: 800_000_00,
  agencyFeeKobo: 80_000_00,
  legalFeeKobo: 80_000_00,
  cautionDepositKobo: 100_000_00,
  serviceChargeKobo: 40_000_00,
};

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

describe.each(STORES)('a listing that hides what it costs (%s)', (_name, databaseUrl) => {
  let app: INestApplication;
  let agents: AgentsStore;
  let seed = 100;

  /**
   * Everything but the costs: ID checked, landlord confirmed, photographed and
   * filmed on site, published and confirmed available. Seven of eight — the
   * listing that would have sailed through before this condition existed.
   */
  async function listingWithEverythingElse(costs: typeof TYPICAL | null, title?: string) {
    seed += 1;
    const suffix = String(seed);
    const signedUp = await request(app.getHttpServer())
      .post('/v1/agents')
      .send({ displayName: `Agent ${suffix}`, phone: `+2348${suffix}0000` })
      .expect(201);
    const token = signedUp.body.token as string;
    const agentId = signedUp.body.agentId as string;

    await request(app.getHttpServer())
      .post('/v1/authority/identity')
      .set('x-kyc-token', KYC)
      .send({ agentId, vendor: 'smile-id', reference: `ref-${suffix}` })
      .expect(201);

    const property = `A flat at ${suffix}, Yaba`;
    const granted = await agents.openChallenge({
      purpose: 'grant',
      agentId,
      propertyId: property,
      landlordPhone: `+2348${suffix}1111`,
      now: new Date(),
    });
    await request(app.getHttpServer())
      .post('/v1/authority/confirm')
      .send({ challengeId: granted.challenge.id, code: granted.code })
      .expect(201);

    const draft = await request(app.getHttpServer())
      .post('/v1/agents/me/listings')
      .set('x-agent-token', token)
      .send({
        propertyId: property,
        title: title ?? `Two bedroom flat ${suffix}`,
        ...YABA,
        costs,
      })
      .expect(201);

    const { publicKey, privateKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
    const device = await request(app.getHttpServer())
      .post('/v1/captures/devices')
      .set('x-agent-token', token)
      .send({ publicKey: publicKey.export({ format: 'der', type: 'spki' }).toString('base64') })
      .expect(201);

    for (const [offset, kind, duration] of [
      [0, 'photo', null],
      [1, 'video', 45],
    ] as const) {
      const bytes = grid(seed * 2 + offset);
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
        .set('x-agent-token', token)
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
          signature: sign('sha256', Buffer.from(claimMessage(claim), 'utf8'), privateKey).toString(
            'base64',
          ),
          pixels: bytes.toString('base64'),
        })
        .expect(201);
    }

    await request(app.getHttpServer())
      .post(`/v1/agents/me/listings/${draft.body.id}/publish`)
      .set('x-agent-token', token)
      .expect(201);
    await request(app.getHttpServer())
      .post(`/v1/agents/me/listings/${draft.body.id}/confirm`)
      .set('x-agent-token', token)
      .expect(201);

    return { id: draft.body.id as string, token };
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
  });

  afterAll(async () => {
    await app.close();
  });

  it('is not Verified while the costs are unsaid, however complete the rest is', async () => {
    const listing = await listingWithEverythingElse(null);

    const seen = await request(app.getHttpServer()).get(`/v1/listings/${listing.id}`).expect(200);
    expect(seen.body.verified).toBe(false);
    expect(seen.body.costs).toBeNull();
    expect(
      seen.body.checks.find((c: { condition: string }) => c.condition === 'costs_stated').met,
    ).toBe(false);

    // And genuinely absent from a search, not merely flagged in one.
    const found = await request(app.getHttpServer()).get('/v1/listings').expect(200);
    expect(found.body.map((r: { id: string }) => r.id)).not.toContain(listing.id);
  });

  it('is Verified once they are said, and publishes the total', async () => {
    const listing = await listingWithEverythingElse(TYPICAL);

    const seen = await request(app.getHttpServer()).get(`/v1/listings/${listing.id}`).expect(200);
    expect(seen.body.verified).toBe(true);
    /*
      ₦800,000 advertised, ₦1,100,000 to move in. The gap is the whole point,
      so it is a field rather than something every reader recomputes.
    */
    expect(seen.body.costs.moveInKobo).toBe(1_100_000_00);
    expect(seen.body.costs.extrasKobo).toBe(300_000_00);
    expect(naira(seen.body.costs.moveInKobo)).toBe('₦1,100,000');
  });

  it('treats an explicit zero as an answer and a missing field as a refusal', async () => {
    /*
      The distinction the whole feature rests on. "No agency fee" is a claim an
      agent can be held to; "we have not said" is what this exists to make
      worse than saying it. A client that omits a field must not have a
      "nothing to pay" claim invented on its behalf.
    */
    const listing = await listingWithEverythingElse(null);
    const state = (body: Record<string, number>) =>
      request(app.getHttpServer())
        .post(`/v1/agents/me/listings/${listing.id}/costs`)
        .set('x-agent-token', listing.token)
        .send(body);

    const partial = await state({ annualRentKobo: 800_000_00, agencyFeeKobo: 0, legalFeeKobo: 0 });
    expect(partial.status).toBe(400);
    expect(JSON.stringify(partial.body)).toMatch(/cautionDeposit/i);

    const free = {
      annualRentKobo: 800_000_00,
      agencyFeeKobo: 0,
      legalFeeKobo: 0,
      cautionDepositKobo: 0,
      serviceChargeKobo: 0,
    };
    await state(free).expect(201);

    const seen = await request(app.getHttpServer()).get(`/v1/listings/${listing.id}`).expect(200);
    expect(seen.body.verified).toBe(true);
    // Nothing on top of the rent, said out loud rather than left blank.
    expect(seen.body.costs.moveInKobo).toBe(800_000_00);
    expect(seen.body.costs.extrasKobo).toBe(0);
  });

  it('refuses free rent, negative money and fractional kobo', async () => {
    const listing = await listingWithEverythingElse(null);
    const state = (body: Record<string, number>) =>
      request(app.getHttpServer())
        .post(`/v1/agents/me/listings/${listing.id}/costs`)
        .set('x-agent-token', listing.token)
        .send(body);

    const full = {
      annualRentKobo: 800_000_00,
      agencyFeeKobo: 0,
      legalFeeKobo: 0,
      cautionDepositKobo: 0,
      serviceChargeKobo: 0,
    };
    await state({ ...full, annualRentKobo: 0 }).expect(400);
    await state({ ...full, agencyFeeKobo: -1 }).expect(400);
    // Fractional kobo is not money; it is a rounding error waiting months.
    await state({ ...full, legalFeeKobo: 1.5 }).expect(400);
  });

  it('will not let one agent state costs on another agent\'s listing', async () => {
    const mine = await listingWithEverythingElse(null);
    const theirs = await listingWithEverythingElse(null);

    // A 404, not a 403 — a 403 would confirm the id exists.
    await request(app.getHttpServer())
      .post(`/v1/agents/me/listings/${mine.id}/costs`)
      .set('x-agent-token', theirs.token)
      .send(TYPICAL)
      .expect(404);

    const seen = await request(app.getHttpServer()).get(`/v1/listings/${mine.id}`).expect(200);
    expect(seen.body.costs).toBeNull();
  });

  it('sends the move-in figure with every search result, not just the rent', async () => {
    /*
      Two listings advertising the same rent are not the same price. A list
      showing only rent hides exactly the difference somebody opened the app to
      compare, so the comparable number travels with the row.
    */
    const cheapFees = {
      annualRentKobo: 900_000_00,
      agencyFeeKobo: 0,
      legalFeeKobo: 0,
      cautionDepositKobo: 0,
      serviceChargeKobo: 0,
    };
    const dearFees = { ...cheapFees, agencyFeeKobo: 135_000_00, legalFeeKobo: 135_000_00 };

    const cheap = await listingWithEverythingElse(cheapFees, 'Flat one, Ikoyi');
    const dear = await listingWithEverythingElse(dearFees, 'Flat two, Ikoyi');

    const found = await request(app.getHttpServer()).get('/v1/listings?q=Ikoyi').expect(200);
    const rows = new Map<string, { moveInKobo: number; annualRentKobo: number }>(
      (found.body as Array<{ id: string; moveInKobo: number; annualRentKobo: number }>).map((r) => [
        r.id,
        r,
      ]),
    );

    // Same advertised rent...
    expect(rows.get(cheap.id)!.annualRentKobo).toBe(rows.get(dear.id)!.annualRentKobo);
    // ...and ₦270,000 between them on the day.
    expect(rows.get(cheap.id)!.moveInKobo).toBe(moveInCostKobo(cheapFees));
    expect(rows.get(dear.id)!.moveInKobo - rows.get(cheap.id)!.moveInKobo).toBe(270_000_00);
  });

  it('says when a fee is above the customary ten per cent', async () => {
    // Keys does not forbid it. It says so where the reader is already looking,
    // rather than leaving them to work it out after they have paid.
    const listing = await listingWithEverythingElse({
      ...TYPICAL,
      agencyFeeKobo: 120_000_00,
    });

    const seen = await request(app.getHttpServer()).get(`/v1/listings/${listing.id}`).expect(200);
    expect(seen.body.costs.agencyFeePercent).toBe(15);
    expect(seen.body.costs.legalFeePercent).toBe(10);
  });
});
