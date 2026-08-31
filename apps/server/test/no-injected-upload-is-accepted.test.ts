import { createHash, generateKeyPairSync, randomUUID, sign } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';

import { CAPTURE_FRESHNESS_HOURS, claimMessage, type CaptureClaim } from '@keys/domain';

import { AppModule } from '../src/app.module';

/**
 * Phase 3's third exit gate.
 *
 * *An injected upload that did not pass through in-app capture is rejected by
 * signature verification.*
 *
 * The claim is not "the happy path works". It is that every way of getting a
 * photograph in without the Keys camera having produced it is refused — no
 * signature, somebody else's signature, a real signature over different
 * values, a real signature sent twice, and a key the attacker generated
 * themselves.
 *
 * Real Ed25519 throughout. A test that stubs the crypto proves the controller
 * calls something.
 */

const KYC = 'k'.repeat(48);

function keypair() {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  return {
    privateKey,
    spki: publicKey.export({ format: 'der', type: 'spki' }).toString('base64'),
  };
}

/**
 * A Keys greyscale grid: the magic, width and height, then one byte a pixel.
 *
 * Built here rather than mocked, because the server reads the dimensions out
 * of the header and refuses a grid whose bytes disagree with them — a rule
 * that a stubbed decoder would never exercise.
 */
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

const PHOTOGRAPH = grid(1);

function claimFor(overrides: Partial<CaptureClaim> = {}): CaptureClaim {
  return {
    sha256: createHash('sha256').update(PHOTOGRAPH).digest('hex'),
    listingId: 'listing-1',
    capturedAt: new Date(),
    latitude: 6.5244,
    longitude: 3.3792,
    nonce: randomUUID(),
    mockLocation: false,
    ...overrides,
  };
}

function wire(
  claim: CaptureClaim,
  deviceId: string,
  signature: string,
  pixels: Buffer = PHOTOGRAPH,
) {
  return {
    pixels: pixels.toString('base64'),
    deviceId,
    listingId: claim.listingId,
    sha256: claim.sha256,
    capturedAt: claim.capturedAt.toISOString(),
    latitude: claim.latitude,
    longitude: claim.longitude,
    nonce: claim.nonce,
    mockLocation: claim.mockLocation,
    kind: 'photo',
    durationSeconds: null,
    signature,
  };
}

describe('no injected upload is accepted', () => {
  let app: INestApplication;
  let token: string;
  let deviceId: string;
  let device: ReturnType<typeof keypair>;

  function signWith(claim: CaptureClaim, key = device.privateKey): string {
    return sign(null, Buffer.from(claimMessage(claim), 'utf8'), key).toString('base64');
  }

  function submit(body: Record<string, unknown>) {
    return request(app.getHttpServer())
      .post('/v1/captures')
      .set('x-agent-token', token)
      .send(body);
  }

  beforeAll(async () => {
    process.env.KEYS_KYC_TOKEN = KYC;
    process.env.KEYS_REVIEWER_TOKEN = 'r'.repeat(48);
    delete process.env.KEYS_DATABASE_URL;

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    await app.listen(0);

    const signedUp = await request(app.getHttpServer())
      .post('/v1/agents')
      .send({ displayName: 'Ngozi Adeyemi', phone: '+2348012223344' })
      .expect(201);
    token = signedUp.body.token;

    device = keypair();
    const registered = await request(app.getHttpServer())
      .post('/v1/captures/devices')
      .set('x-agent-token', token)
      .send({ publicKey: device.spki })
      .expect(201);
    deviceId = registered.body.deviceId;
  });

  afterAll(async () => {
    await app.close();
    delete process.env.KEYS_KYC_TOKEN;
    delete process.env.KEYS_REVIEWER_TOKEN;
  });

  it('accepts a genuine capture, or nothing below proves anything', async () => {
    const claim = claimFor();
    const response = await submit(wire(claim, deviceId, signWith(claim))).expect(201);
    expect(response.body.accepted).toBe(true);
  });

  it('refuses an upload with no signature at all — the gallery case', async () => {
    const claim = claimFor();
    const response = await submit(wire(claim, deviceId, '')).expect(403);
    expect(response.body.refusals).toContain('bad_signature');
    // And says something an agent can act on, rather than a status code.
    expect(response.body.meaning.join(' ')).toMatch(/gallery/i);
  });

  it('refuses a signature made by a key the attacker generated', async () => {
    // The obvious attack on a scheme like this: sign it yourself. It fails
    // because the public half was never registered against this device.
    const claim = claimFor();
    const mine = keypair();
    const response = await submit(wire(claim, deviceId, signWith(claim, mine.privateKey)));
    expect(response.status).toBe(403);
    expect(response.body.refusals).toContain('bad_signature');
  });

  it('refuses a real signature over different values', async () => {
    /*
      The subtle one, and the reason the location is inside the message.

      A genuine capture is signed at one flat, then submitted claiming another
      — the signature is real, the device is real, and only the coordinates
      changed. It fails because those coordinates are part of what was signed.
    */
    const signedHere = claimFor();
    const signature = signWith(signedHere);

    const claimedThere = { ...signedHere, latitude: 9.0765, longitude: 7.3986 };
    const response = await submit(wire(claimedThere, deviceId, signature)).expect(403);
    expect(response.body.refusals).toContain('bad_signature');
  });

  it('refuses a real signature over a different photograph', async () => {
    const real = claimFor();
    const signature = signWith(real);
    const stolen = {
      ...real,
      sha256: createHash('sha256').update("somebody else's photograph").digest('hex'),
    };
    await submit(wire(stolen, deviceId, signature)).expect(403);
  });

  it('refuses bytes that are not the bytes that were signed', async () => {
    /*
      The whole point of putting the hash inside the signature.

      Everything else about this request is genuine: the device, the key, the
      signature, the claim. Only the file swapped — which is exactly what a
      stolen photograph submitted under a real capture's paperwork looks like.
    */
    const claim = claimFor();
    const somethingElse = grid(99);
    const response = await submit(
      wire(claim, deviceId, signWith(claim), somethingElse),
    ).expect(403);
    expect(response.body.refusals).toContain('bytes_do_not_match');
  });

  it('refuses a claim with no bytes at all', async () => {
    // The route used to take the claim alone and assume the bytes matched,
    // which proved an agent once held a photograph rather than that this is it.
    const claim = claimFor();
    const response = await submit({
      ...wire(claim, deviceId, signWith(claim)),
      pixels: '',
    }).expect(403);
    expect(response.body.refusals).toContain('bytes_do_not_match');
  });

  it('refuses a grid whose header disagrees with its bytes', async () => {
    // The dimensions are read from the header rather than taken as fields
    // beside the signature, so this is the only way to lie about them — and
    // hashing bytes that are not the picture is hashing nothing.
    const lying = Buffer.from(PHOTOGRAPH);
    lying.writeUInt16BE(999, 8);
    const claim = claimFor({ sha256: createHash('sha256').update(lying).digest('hex') });
    const response = await submit(wire(claim, deviceId, signWith(claim), lying)).expect(403);
    expect(response.body.refusals).toContain('bytes_do_not_match');
  });

  it('refuses a capture that says its own location was mocked', async () => {
    const claim = claimFor({ mockLocation: true });
    const response = await submit(wire(claim, deviceId, signWith(claim))).expect(403);
    expect(response.body.refusals).toContain('mock_location');
  });

  it('will not let a client flip the mock flag off', async () => {
    // Signed as mocked, sent as real. The signature covers the flag, so
    // changing it invalidates the whole capture rather than laundering it.
    const mocked = claimFor({ mockLocation: true });
    const signature = signWith(mocked);
    const response = await submit(
      wire({ ...mocked, mockLocation: false }, deviceId, signature),
    ).expect(403);
    expect(response.body.refusals).toContain('bad_signature');
    expect(response.body.refusals).not.toContain('mock_location');
  });

  it('refuses the same signed capture twice', async () => {
    const claim = claimFor();
    const signature = signWith(claim);
    await submit(wire(claim, deviceId, signature)).expect(201);

    const again = await submit(wire(claim, deviceId, signature)).expect(403);
    expect(again.body.refusals).toContain('replayed');
  });

  it('refuses a capture older than the freshness window', async () => {
    const claim = claimFor({
      capturedAt: new Date(Date.now() - (CAPTURE_FRESHNESS_HOURS + 1) * 3_600_000),
    });
    const response = await submit(wire(claim, deviceId, signWith(claim))).expect(403);
    expect(response.body.refusals).toContain('stale');
  });

  it('accepts one from this morning, because an agent with no data uploads that evening', async () => {
    const claim = claimFor({
      capturedAt: new Date(Date.now() - (CAPTURE_FRESHNESS_HOURS - 1) * 3_600_000),
    });
    await submit(wire(claim, deviceId, signWith(claim))).expect(201);
  });

  it('says a picture is a duplicate, and never blocks it on its own', async () => {
    /*
      Two listings, the same photograph. That is the scam this is for — and it
      is also what an agency changing hands looks like, which is why the answer
      is `pending` rather than `blocked`.
    */
    const stolen = grid(7);
    const first = claimFor({
      listingId: 'listing-original',
      sha256: createHash('sha256').update(stolen).digest('hex'),
    });
    const one = await submit(wire(first, deviceId, signWith(first), stolen)).expect(201);
    expect(one.body.duplicates).toBe('allowed');
    expect(one.body.looksLikeListings).toEqual([]);

    const copied = claimFor({
      listingId: 'listing-copycat',
      sha256: createHash('sha256').update(stolen).digest('hex'),
    });
    const two = await submit(wire(copied, deviceId, signWith(copied), stolen)).expect(201);
    expect(two.body.duplicates).toBe('pending');
    expect(two.body.duplicates).not.toBe('blocked');
    expect(two.body.looksLikeListings).toContain('listing-original');
  });

  it('does not match a listing against its own earlier photographs', async () => {
    // Otherwise an agent adding a second picture of the same room opens a
    // duplicate review against themselves, and reviewers stop reading the queue.
    const room = grid(21);
    for (const _ of [1, 2]) {
      const claim = claimFor({
        listingId: 'listing-same-room',
        sha256: createHash('sha256').update(room).digest('hex'),
      });
      const response = await submit(wire(claim, deviceId, signWith(claim), room)).expect(201);
      expect(response.body.looksLikeListings).not.toContain('listing-same-room');
    }
  });

  it('leaves nothing in the index when a capture is refused', async () => {
    /*
      A refused capture must not poison the duplicate index.

      Otherwise anybody with an agent token can push images they never proved
      they took, and every honest listing that later resembles one goes to a
      reviewer.
    */
    const poison = grid(55);
    const forged = claimFor({
      listingId: 'listing-poisoner',
      sha256: createHash('sha256').update(poison).digest('hex'),
    });
    const theirs = keypair();
    await submit(wire(forged, deviceId, signWith(forged, theirs.privateKey), poison)).expect(403);

    const honest = claimFor({
      listingId: 'listing-innocent',
      sha256: createHash('sha256').update(poison).digest('hex'),
    });
    const accepted = await submit(
      wire(honest, deviceId, signWith(honest), poison),
    ).expect(201);
    expect(accepted.body.looksLikeListings).toEqual([]);
  });

  it('refuses a device Keys has never seen', async () => {
    const claim = claimFor();
    const response = await submit(wire(claim, 'device-nobody-registered', signWith(claim)));
    expect(response.status).toBe(403);
    expect(response.body.refusals).toContain('unknown_device');
  });

  it("refuses another agent's device, even with that device's real signature", async () => {
    const other = keypair();
    const theirAccount = await request(app.getHttpServer())
      .post('/v1/agents')
      .send({ displayName: 'Bola Ade', phone: '+2348015556677' })
      .expect(201);
    const theirDevice = await request(app.getHttpServer())
      .post('/v1/captures/devices')
      .set('x-agent-token', theirAccount.body.token)
      .send({ publicKey: other.spki })
      .expect(201);

    const claim = claimFor();
    const response = await submit(
      wire(claim, theirDevice.body.deviceId, signWith(claim, other.privateKey)),
    ).expect(403);
    expect(response.body.refusals).toContain('not_this_agents_device');
  });

  it('needs an agent token at all', async () => {
    const claim = claimFor();
    await request(app.getHttpServer())
      .post('/v1/captures')
      .send(wire(claim, deviceId, signWith(claim)))
      .expect(401);
  });

  it('refuses a public key it cannot read, at registration rather than for ever after', async () => {
    await request(app.getHttpServer())
      .post('/v1/captures/devices')
      .set('x-agent-token', token)
      .send({ publicKey: 'bm90IGEga2V5IGF0IGFsbCwgcmVhbGx5LCBub3QgZXZlbiBjbG9zZQ==' })
      .expect(400);
  });

  it('does not fall over on a malformed signature', async () => {
    // This route is reachable by anybody with an agent token and will be
    // probed. A 500 here is an outage somebody found by accident.
    const claim = claimFor();
    const response = await submit(wire(claim, deviceId, 'not base64 at all !!!'));
    expect(response.status).toBe(403);
  });
});
