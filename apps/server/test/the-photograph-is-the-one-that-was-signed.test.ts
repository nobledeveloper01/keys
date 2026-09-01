import { createHash, generateKeyPairSync, randomUUID, sign } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';

import { claimMessage, type CaptureClaim } from '@keys/domain';

import { AppModule } from '../src/app.module';
import { AgentsStore } from '../src/agents/agents.store';
import { KYC_TOKEN, REVIEWER_TOKEN, aVerifiedListing, grid } from './helpers/verified';

/**
 * The photograph a tenant sees is the photograph that was signed.
 *
 * Until real media existed, a capture *was* a 40×32 greyscale grid: enough for
 * a perceptual hash, enough for every gate here to pass, and not enough for
 * anybody to look at the flat. The evidence panel said "Photo at the property"
 * about an artefact nobody could see.
 *
 * Adding a photograph beside the grid is where this gets interesting, because
 * there are now two artefacts doing two different jobs. The signature has to
 * cover **both**:
 *
 *  - sign only the photograph and the grid is free to be invented, so a stolen
 *    picture arrives with a fabricated grid and matches nothing Keys has seen;
 *  - sign only the grid and the photograph is free to be swapped for anything.
 */
describe('the photograph is the one that was signed', () => {
  let app: INestApplication;
  let agents: AgentsStore;
  let listing: Awaited<ReturnType<typeof aVerifiedListing>>;

  beforeAll(async () => {
    process.env.KEYS_REVIEWER_TOKEN = REVIEWER_TOKEN;
    process.env.KEYS_KYC_TOKEN = KYC_TOKEN;
    delete process.env.KEYS_DATABASE_URL;

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    await app.listen(0);
    agents = app.get(AgentsStore);

    listing = await aVerifiedListing(app, agents, { seed: 800 });
  });

  afterAll(async () => app.close());

  /** Sign and submit a capture, with whatever mismatch a test wants. */
  async function submit(over: {
    media?: Buffer;
    grid?: Buffer;
    signedMedia?: Buffer;
    signedGrid?: Buffer | null;
  }) {
    const pixels = over.grid ?? grid(4242);
    const media = over.media ?? Buffer.concat([Buffer.from('KEYSJPEGSTANDIN'), pixels]);
    const signedMedia = over.signedMedia ?? media;
    const signedGrid = over.signedGrid === undefined ? pixels : over.signedGrid;

    const { publicKey, privateKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
    const device = await request(app.getHttpServer())
      .post('/v1/captures/devices')
      .set('x-agent-token', listing.token)
      .send({ publicKey: publicKey.export({ format: 'der', type: 'spki' }).toString('base64') })
      .expect(201);

    const claim: CaptureClaim = {
      sha256: createHash('sha256').update(signedMedia).digest('hex'),
      gridSha256:
        signedGrid === null ? null : createHash('sha256').update(signedGrid).digest('hex'),
      listingId: listing.id,
      capturedAt: new Date(),
      latitude: listing.point.latitude,
      longitude: listing.point.longitude,
      nonce: randomUUID(),
      mockLocation: false,
      durationSeconds: null,
    };

    return request(app.getHttpServer())
      .post('/v1/captures')
      .set('x-agent-token', listing.token)
      .send({
        deviceId: device.body.deviceId,
        listingId: claim.listingId,
        sha256: claim.sha256,
        gridSha256: claim.gridSha256,
        capturedAt: claim.capturedAt.toISOString(),
        latitude: claim.latitude,
        longitude: claim.longitude,
        nonce: claim.nonce,
        mockLocation: false,
        kind: 'photo',
        durationSeconds: null,
        signature: sign('sha256', Buffer.from(claimMessage(claim), 'utf8'), privateKey).toString(
          'base64',
        ),
        pixels: pixels.toString('base64'),
        media: media.toString('base64'),
      });
  }

  it('accepts a capture whose media and grid both match what was signed', async () => {
    const sent = await submit({});
    expect(sent.status).toBe(201);
    expect(sent.body.accepted).toBe(true);
  });

  it('refuses a photograph swapped for a different one', async () => {
    // The signature was taken over one picture and a different one arrived.
    const sent = await submit({
      media: Buffer.from('a completely different photograph'),
      signedMedia: Buffer.from('the one that was actually signed'),
    });
    // 403, the same as any other refused capture — the convention this route
    // has used since phase 3.
    expect(sent.status).toBe(403);
    expect(sent.body.refusals).toContain('bytes_do_not_match');
  });

  it('refuses a grid swapped for a different one', async () => {
    /*
      The half that would be easy to leave out, and the one that matters most.

      Duplicate detection reads the grid. An agent who could send a stolen
      photograph with a grid of their own invention would match nothing Keys
      has ever seen — the picture would be recognisably somebody else's and the
      hash would say it was new.
    */
    const sent = await submit({ grid: grid(1), signedGrid: grid(2) });
    expect(sent.status).toBe(403);
    expect(sent.body.refusals).toContain('bytes_do_not_match');
  });

  it('serves the photograph from a published listing', async () => {
    const seen = await request(app.getHttpServer())
      .get(`/v1/listings/${listing.id}`)
      .expect(200);
    expect(seen.body.verified).toBe(true);

    // The key is the hash inside the signature, so what comes back cannot be
    // different bytes without the URL being a different URL.
    const photo = grid(8000);
    const media = Buffer.concat([Buffer.from('KEYSJPEGSTANDIN'), photo]);
    const key = createHash('sha256').update(media).digest('hex');
    await submit({ media, grid: photo });

    const served = await request(app.getHttpServer())
      .get(`/v1/listings/${listing.id}/media/${key}`)
      .expect(200);

    expect(Buffer.from(served.body).equals(media)).toBe(true);
    expect(served.headers['content-type']).toMatch(/image\/jpeg/);
    // A served image must never be sniffed into something executable.
    expect(served.headers['x-content-type-options']).toBe('nosniff');
  });

  it('will not serve a photograph through a listing it does not belong to', async () => {
    /*
      Media is content-addressed, so a key from one listing is a valid key
      everywhere. Without a check that the hash belongs to *this* listing,
      anybody holding one could pull the photograph through whichever published
      listing they liked — including one whose own images a reviewer blocked.
    */
    const other = await aVerifiedListing(app, agents, { seed: 801 });
    const mine = await request(app.getHttpServer())
      .get(`/v1/listings/${listing.id}`)
      .expect(200);
    expect(mine.body.verified).toBe(true);

    const photo = grid(9000);
    const media = Buffer.concat([Buffer.from('KEYSJPEGSTANDIN'), photo]);
    const key = createHash('sha256').update(media).digest('hex');
    await submit({ media, grid: photo });

    await request(app.getHttpServer())
      .get(`/v1/listings/${other.id}/media/${key}`)
      .expect(404);
  });

  it('will not serve anything from a draft', async () => {
    // The same 404 as a listing that does not exist, so this route cannot be
    // used to find out which ids are real.
    await request(app.getHttpServer())
      .get(`/v1/listings/00000000-0000-4000-8000-000000000000/media/${'a'.repeat(64)}`)
      .expect(404);
  });
});
