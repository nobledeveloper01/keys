import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { createHash, timingSafeEqual } from 'node:crypto';

/**
 * The KYC vendor's door, and only the vendor's.
 *
 * An identity check is the bottom rung of the whole ladder, so the route that
 * records one is the highest-value target in this product: forge an identity
 * attestation and every tier above it becomes reachable. It is therefore a
 * shared secret out of the environment — not a role, not a signed-in agent —
 * and an unconfigured server refuses every call rather than accepting them.
 *
 * The vendor is not chosen yet. What is fixed is the shape: the agent never
 * touches this route, and the reference the vendor sends is stored so the
 * check can be pulled again if the finding is ever disputed.
 */
@Injectable()
export class VendorGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const secret = process.env.KEYS_KYC_TOKEN ?? '';
    if (secret.length < 32) {
      throw new ForbiddenException('Identity checks are not configured on this server.');
    }

    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | string[] | undefined>;
    }>();
    const header = request.headers['x-kyc-token'];
    const presented = Array.isArray(header) ? '' : (header ?? '');

    // Hashed first, then compared in constant time — the length check people
    // put in front of `timingSafeEqual` is itself the leak.
    const offered = createHash('sha256').update(presented).digest();
    const known = createHash('sha256').update(secret).digest();
    if (!timingSafeEqual(offered, known)) throw new ForbiddenException('Not the vendor.');
    return true;
  }
}
