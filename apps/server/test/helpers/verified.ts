import { createHash, generateKeyPairSync, randomUUID, sign } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import * as request from 'supertest';

import { claimMessage, type CaptureClaim } from '@keys/domain';

import type { AgentsStore } from '../../src/agents/agents.store';

/**
 * Building a listing that meets every condition.
 *
 * Extracted because three gate tests needed it and the third copy would have
 * been the one that quietly drifted. That is not a hypothetical here: the
 * *reason* `assessListing` exists is that two places computed Verified and
 * disagreed, and a fixture that builds "a verified listing" differently in
 * each file is the same failure wearing a different hat — a gate would pass
 * because its own fixture was wrong rather than because the product was right.
 */
export const KYC_TOKEN = 'k'.repeat(48);
export const REVIEWER_TOKEN = 'r'.repeat(48);

/** ₦800,000 a year with the customary ten per cent each way. */
export const TYPICAL_COSTS = {
  annualRentKobo: 800_000_00,
  agencyFeeKobo: 80_000_00,
  legalFeeKobo: 80_000_00,
  cautionDepositKobo: 100_000_00,
  serviceChargeKobo: 40_000_00,
};

/**
 * A deterministic greyscale grid.
 *
 * Different seeds give images far enough apart that the perceptual hash does
 * not call them duplicates — which two listings built from the same seed
 * would be, and which would fail `not_a_known_duplicate` for a reason that has
 * nothing to do with what the test is checking.
 */
export function grid(seed: number, width = 40, height = 32): Buffer {
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

export interface BuiltListing {
  readonly id: string;
  readonly token: string;
  readonly agentId: string;
  readonly propertyId: string;
  readonly landlordPhone: string;
  readonly point: { latitude: number; longitude: number };
  /** Take another signed capture against this listing, later. */
  readonly captureAgain: (
    kind: 'photo' | 'video',
    seed: number,
    /** Override the claimed capture time, to exercise what the server accepts. */
    capturedAt?: Date,
  ) => Promise<request.Response>;
}

/**
 * Everything a listing needs, through the real routes.
 *
 * The landlord grant is the one step that cannot go over HTTP — the code goes
 * to an outbox no route reaches, so that an agent cannot confirm themselves —
 * so it goes through the store, and everything else is a request.
 */
export async function aVerifiedListing(
  app: INestApplication,
  agents: AgentsStore,
  options: {
    seed: number;
    title?: string;
    costs?: typeof TYPICAL_COSTS | null;
    point?: { latitude: number; longitude: number };
  },
): Promise<BuiltListing> {
  const { seed } = options;
  const suffix = String(seed);
  const point = options.point ?? { latitude: 6.5095, longitude: 3.3711 };
  const http = app.getHttpServer();

  const signedUp = await request(http)
    .post('/v1/agents')
    .send({ displayName: `Agent ${suffix}`, phone: `+2348${suffix}0000` })
    .expect(201);
  const token = signedUp.body.token as string;
  const agentId = signedUp.body.agentId as string;

  await request(http)
    .post('/v1/authority/identity')
    .set('x-kyc-token', KYC_TOKEN)
    .send({ agentId, vendor: 'smile-id', reference: `ref-${suffix}` })
    .expect(201);

  const propertyId = `A flat at ${suffix}, Yaba`;
  const landlordPhone = `+2348${suffix}1111`;
  const granted = await agents.openChallenge({
    purpose: 'grant',
    agentId,
    propertyId,
    landlordPhone,
    now: new Date(),
  });
  await request(http)
    .post('/v1/authority/confirm')
    .send({ challengeId: granted.challenge.id, code: granted.code })
    .expect(201);

  const draft = await request(http)
    .post('/v1/agents/me/listings')
    .set('x-agent-token', token)
    .send({
      propertyId,
      title: options.title ?? `Two bedroom flat ${suffix}`,
      ...point,
      costs: options.costs === undefined ? TYPICAL_COSTS : options.costs,
    })
    .expect(201);
  const id = draft.body.id as string;

  const { publicKey, privateKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  const device = await request(http)
    .post('/v1/captures/devices')
    .set('x-agent-token', token)
    .send({ publicKey: publicKey.export({ format: 'der', type: 'spki' }).toString('base64') })
    .expect(201);

  const captureAgain = async (kind: 'photo' | 'video', imageSeed: number, capturedAt?: Date) => {
    const bytes = grid(imageSeed);
    const claim: CaptureClaim = {
      sha256: createHash('sha256').update(bytes).digest('hex'),
      listingId: id,
      capturedAt: capturedAt ?? new Date(),
      latitude: point.latitude,
      longitude: point.longitude,
      nonce: randomUUID(),
      mockLocation: false,
      durationSeconds: kind === 'video' ? 45 : null,
    };
    return request(http)
      .post('/v1/captures')
      .set('x-agent-token', token)
      .send({
        deviceId: device.body.deviceId,
        listingId: id,
        sha256: claim.sha256,
        capturedAt: claim.capturedAt.toISOString(),
        latitude: claim.latitude,
        longitude: claim.longitude,
        nonce: claim.nonce,
        mockLocation: false,
        kind,
        durationSeconds: claim.durationSeconds,
        signature: sign('sha256', Buffer.from(claimMessage(claim), 'utf8'), privateKey).toString(
          'base64',
        ),
        pixels: bytes.toString('base64'),
      });
  };

  await captureAgain('photo', seed * 10);
  await captureAgain('video', seed * 10 + 1);

  await request(http)
    .post(`/v1/agents/me/listings/${id}/publish`)
    .set('x-agent-token', token)
    .expect(201);
  await request(http)
    .post(`/v1/agents/me/listings/${id}/confirm`)
    .set('x-agent-token', token)
    .expect(201);

  return { id, token, agentId, propertyId, landlordPhone, point, captureAgain };
}

/** Open a tenant account and return its token. */
export async function aTenant(app: INestApplication, name: string) {
  const signedUp = await request(app.getHttpServer())
    .post('/v1/tenants')
    .send({ displayName: name, phone: `+23470${Math.abs(hash(name)) % 100_000_000}` })
    .expect(201);
  return { id: signedUp.body.tenantId as string, token: signedUp.body.token as string };
}

function hash(text: string): number {
  let h = 0;
  for (const character of text) h = (h * 31 + character.charCodeAt(0)) | 0;
  return h;
}
