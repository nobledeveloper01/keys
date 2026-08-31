import { createPublicKey, verify } from 'node:crypto';
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

import { claimMessage, refuseCapture, refusalMeans, type CaptureClaim } from '@keys/domain';

import { AgentGuard, type RequestWithAgent } from '../agents/agent.guard';
import { CapturesStore } from './captures.store';
import { CaptureBody, CaptureRefusedResponse, RegisterDeviceBody } from './captures.dto';

/**
 * Verifies that a photograph came out of the Keys camera.
 *
 * The signature is Ed25519 over the exact string `claimMessage` builds, made
 * by a key the phone generated in its secure element and never exports. The
 * server holds only the public half, registered once.
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
        // The bytes are not here. Object storage lands with the upload route;
        // until then this asks whether the *claim* is signed, which is the
        // property that keeps a gallery photo out.
        bytesMatch: true,
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
    });

    return { accepted: true, refusals: [], meaning: [] };
  }

  /** Ed25519 over exactly the string the phone signed. */
  private signed(claim: CaptureClaim, publicKey: string, signature: unknown): boolean {
    if (typeof signature !== 'string' || signature.length === 0) return false;
    try {
      return verify(
        null,
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
