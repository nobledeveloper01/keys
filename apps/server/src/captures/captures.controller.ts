import { createHash, createPublicKey, verify } from 'node:crypto';
import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiCreatedResponse, ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';

import {
  claimMessage,
  refuseCapture,
  refusalMeans,
  verdictFor,
  type CaptureClaim,
  type Grey,
  type Match,
} from '@keys/domain';

import { AgentGuard, type RequestWithAgent } from '../agents/agent.guard';
import { CapturesStore } from './captures.store';
import { CaptureBody, CaptureRefusedResponse, RegisterDeviceBody } from './captures.dto';
import { NotAGrid, readGrid } from './pixels';

/**
 * Verifies that a photograph came out of the Keys camera.
 *
 * The signature is **ECDSA P-256 over SHA-256** of the exact string
 * `claimMessage` builds, made by a key the phone generated in its Secure
 * Enclave and cannot export. The server holds only the public half, registered
 * once.
 *
 * ## Why P-256 and not Ed25519
 *
 * This was Ed25519 first, on the reasonable grounds that it is the better
 * modern signature scheme. Then the phone side got written and the assumption
 * underneath collapsed: **the Secure Enclave holds P-256 keys and nothing
 * else.** There is no `SecureEnclave.Curve25519` in CryptoKit and there is no
 * way to put an Ed25519 private key in the enclave.
 *
 * So Ed25519 would have meant a private key in software — in the Keychain at
 * best — which is a key that can be extracted from a jailbroken or backed-up
 * device, and a stolen signing key is an attacker who can sign captures for a
 * property they have never been to. The whole value of this mechanism is that
 * the key cannot leave the phone. P-256 is the curve that buys that, so P-256
 * is the curve.
 *
 * **Nothing here trusts a field.** The location, the timestamp and the mocked-
 * location flag are all inside the signed message, so a modified client cannot
 * change any of them without invalidating the signature — which is the whole
 * difference between this and a client that reports its own honesty.
 */
@ApiTags('captures')
@Controller('v1/captures')
export class CapturesController {
  constructor(private readonly store: CapturesStore) {}

  @Post('devices')
  @UseGuards(AgentGuard)
  @ApiSecurity('agent-token')
  @ApiOperation({ summary: "Register this phone's public key. Once per device." })
  @ApiCreatedResponse({ description: 'The device id to sign captures with.' })
  async registerDevice(
    @Req() request: RequestWithAgent,
    @Body() body: RegisterDeviceBody,
  ) {
    const publicKey = (body?.publicKey ?? '').trim();
    if (publicKey.length < 40) throw new BadRequestException('Send the public key.');

    // Parsed here so a malformed key is refused at registration rather than
    // silently failing every capture afterwards, which would look like a
    // camera bug rather than a key bug.
    try {
      createPublicKey({
        key: Buffer.from(publicKey, 'base64'),
        format: 'der',
        type: 'spki',
      });
    } catch {
      throw new BadRequestException('That is not a public key we can read.');
    }

    const device = await this.store.registerDevice({
      agentId: request.agent!.id,
      publicKey,
      now: new Date(),
    });
    return { deviceId: device.id };
  }

  @Post()
  @UseGuards(AgentGuard)
  @ApiSecurity('agent-token')
  @ApiOperation({ summary: 'Submit a signed capture. Unsigned uploads are refused.' })
  @ApiCreatedResponse({ type: CaptureRefusedResponse })
  async submit(@Req() request: RequestWithAgent, @Body() body: CaptureBody) {
    const agent = request.agent!;
    const now = new Date();

    const capturedAt = new Date(body?.capturedAt ?? '');
    if (Number.isNaN(capturedAt.getTime())) {
      throw new BadRequestException('Give the time it was captured.');
    }

    const claim: CaptureClaim = {
      sha256: (body?.sha256 ?? '').toLowerCase(),
      listingId: body?.listingId ?? '',
      capturedAt,
      latitude: Number(body?.latitude),
      longitude: Number(body?.longitude),
      nonce: body?.nonce ?? '',
      mockLocation: body?.mockLocation === true,
    };
    if (!/^[0-9a-f]{64}$/.test(claim.sha256) || !claim.listingId || !claim.nonce) {
      throw new BadRequestException('Give the hash, the listing and a nonce.');
    }
    if (!Number.isFinite(claim.latitude) || !Number.isFinite(claim.longitude)) {
      throw new BadRequestException('Give where it was captured.');
    }

    const device = await this.store.device(body?.deviceId ?? '');

    /*
      The bytes, and whether they are the bytes that were signed.

      This was `bytesMatch: true` with a comment saying object storage would
      arrive later — which meant the signature covered a hash of *something*
      and the server never checked that the something was what it received. A
      capture is its bytes; taking the claim without them proves the agent once
      held a photograph, not that this is it.
    */
    let image: Grey | null = null;
    let bytesMatch = false;
    if (typeof body?.pixels === 'string' && body.pixels.length > 0) {
      const bytes = Buffer.from(body.pixels, 'base64');
      bytesMatch = createHash('sha256').update(bytes).digest('hex') === claim.sha256;
      try {
        image = readGrid(bytes);
      } catch (error) {
        // A grid we cannot read is not a 500 — it is an upload that did not
        // come from the Keys camera, which is what this route exists to refuse.
        if (!(error instanceof NotAGrid)) throw error;
        bytesMatch = false;
      }
    }

    /*
      The nonce is claimed before anything is decided.

      Claiming it only on success would mean a capture that fails for any other
      reason leaves its nonce spendable, and a signature plus a reusable nonce
      is a replay waiting to happen. Claiming it here costs an honest agent a
      retry after a genuine error, which is the cheaper mistake by a long way.
    */
    const fresh = device ? await this.store.claimNonce(claim.nonce, now) : true;

    const refusals = refuseCapture(
      claim,
      {
        deviceKnown: device !== null,
        deviceBelongsToAgent: device?.agentId === agent.id,
        signatureValid: device !== null && this.signed(claim, device.publicKey, body?.signature),
        bytesMatch,
        nonceSeen: !fresh,
      },
      now,
    );

    if (refusals.length > 0) {
      throw new ForbiddenException({
        accepted: false,
        refusals: [...refusals],
        // Every reason, with what to do about each. A client fixing one
        // problem per round trip against a server that reports one problem per
        // round trip is a debugging session nobody needs.
        meaning: refusals.map((r) => refusalMeans(r)),
        // `detail` as well, because the generated client reads that field for
        // every refusal in this product. Without it, a caller that has not
        // been taught about `meaning` shows its own generic fallback and the
        // agent is told nothing.
        detail: refusals.map((r) => refusalMeans(r)).join(' '),
      });
    }

    /*
      Indexed after it is accepted, never before.

      A capture that fails verification must leave nothing behind. Indexing
      first would let anybody with an agent token poison the duplicate index
      with images they never had to prove they took — and every honest listing
      that later matched one would go to a reviewer.
    */
    const looksLike: readonly Match[] = image
      ? await this.store.indexAndMatch(claim.listingId, image)
      : [];
    if (looksLike.length > 0) await this.store.openPairs(claim.listingId, looksLike, now);

    await this.store.record({
      id: randomUUID(),
      listingId: claim.listingId,
      deviceId: device!.id,
      sha256: claim.sha256,
      capturedAt: claim.capturedAt,
      latitude: claim.latitude,
      longitude: claim.longitude,
      distanceM: null,
      kind: body?.kind === 'video' ? 'video' : 'photo',
      durationSeconds:
        typeof body?.durationSeconds === 'number' ? body.durationSeconds : null,
      looksLike,
    });

    return {
      accepted: true,
      refusals: [],
      meaning: [],
      /*
        `pending`, never `blocked`. The verdict is a domain decision and it is
        deliberately not "the distance was small enough": the same photograph
        legitimately appears on two listings when an agency changes hands or a
        flat is re-let, so a match opens a review and a person decides.
      */
      duplicates: verdictFor(looksLike),
      looksLikeListings: looksLike.map((m) => m.id),
    };
  }

  /** ECDSA P-256 over SHA-256 of exactly the string the phone signed. */
  private signed(claim: CaptureClaim, publicKey: string, signature: unknown): boolean {
    if (typeof signature !== 'string' || signature.length === 0) return false;
    try {
      return verify(
        // Named, not null. `verify(null, …)` is Ed25519's pre-hashed form; a
        // P-256 key needs the digest algorithm said out loud, and getting this
        // wrong throws rather than returning false.
        'sha256',
        Buffer.from(claimMessage(claim), 'utf8'),
        createPublicKey({
          key: Buffer.from(publicKey, 'base64'),
          format: 'der',
          type: 'spki',
        }),
        Buffer.from(signature, 'base64'),
      );
    } catch {
      // A malformed signature is a failed verification, not a 500. This route
      // is reachable by anybody with an agent token and will be probed.
      return false;
    }
  }
}
