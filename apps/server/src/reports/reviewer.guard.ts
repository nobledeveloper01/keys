import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { timingSafeEqual } from 'node:crypto';

/**
 * The only door to unreviewed reports.
 *
 * Deliberately a shared secret out of the environment rather than a role on a
 * user account, because a role on a user account is a thing that can be
 * granted by a bug in a sign-up flow. This cannot: there is no code path in
 * this product that writes KEYS_REVIEWER_TOKEN.
 *
 * If the variable is unset the guard refuses everything. An unconfigured
 * server is a server with no review console, not a server with an open one.
 */
@Injectable()
export class ReviewerGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const expected = process.env.KEYS_REVIEWER_TOKEN ?? '';
    if (expected.length < 32) {
      throw new ForbiddenException(
        'The review console is not configured on this server.',
      );
    }

    const header = context.switchToHttp().getRequest<{
      headers: Record<string, string | string[] | undefined>;
    }>().headers['x-reviewer-token'];
    const presented = Array.isArray(header) ? '' : (header ?? '');

    const a = Buffer.from(presented);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      throw new ForbiddenException('Not a reviewer.');
    }
    return true;
  }
}
