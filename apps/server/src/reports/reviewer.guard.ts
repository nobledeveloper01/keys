import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { createHash, timingSafeEqual } from 'node:crypto';

/** Who decided. Attached to the request by the guard, recorded on every action. */
export interface Reviewer {
  readonly name: string;
}

export interface RequestWithReviewer {
  headers: Record<string, string | string[] | undefined>;
  reviewer?: Reviewer;
}

/**
 * Resolves `KEYS_REVIEWERS` into named reviewers.
 *
 * Format: `name:token,name:token`. Tokens are at least 32 characters.
 *
 * Named, not a single shared secret, because every decision this console takes
 * is a public claim about somebody and **"a reviewer" is not an answer to "who
 * decided this".** If a report is challenged a year from now, the audit row has
 * to name a person. Real accounts arrive with agent verification in phase 2;
 * until then this is the smallest thing that still attributes.
 */
export function reviewers(): ReadonlyMap<string, Reviewer> {
  const map = new Map<string, Reviewer>();
  for (const entry of (process.env.KEYS_REVIEWERS ?? '').split(',')) {
    const [name, token] = entry.split(':').map((part) => part.trim());
    if (!name || !token || token.length < 32) continue;
    map.set(token, { name });
  }

  // The older single-token form, kept because it is what the tests and the
  // running deployment use. It resolves to a reviewer called `unattributed`,
  // which is deliberately an unpleasant thing to read in an audit trail.
  const single = process.env.KEYS_REVIEWER_TOKEN ?? '';
  if (single.length >= 32 && !map.has(single)) {
    map.set(single, { name: 'unattributed' });
  }
  return map;
}

/**
 * The only door to unreviewed reports.
 *
 * Deliberately a shared secret out of the environment rather than a role on a
 * user account, because a role on a user account is a thing that can be
 * granted by a bug in a sign-up flow. This cannot: there is no code path in
 * this product that writes `KEYS_REVIEWERS`.
 *
 * If nothing is configured the guard refuses everything. An unconfigured server
 * is a server with no review console, not a server with an open one.
 */
@Injectable()
export class ReviewerGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const known = reviewers();
    if (known.size === 0) {
      throw new ForbiddenException(
        'The review console is not configured on this server.',
      );
    }

    const request = context.switchToHttp().getRequest<RequestWithReviewer>();
    const header = request.headers['x-reviewer-token'];
    const presented = Array.isArray(header) ? '' : (header ?? '');

    /*
      Compared in constant time, over a digest.

      Hashing first means every comparison is the same length whatever was
      presented, so a length check cannot leak the length of a real token —
      `timingSafeEqual` throws on a mismatch rather than returning false, and
      the obvious `if (a.length !== b.length) return false` in front of it is
      itself the leak.
    */
    const offered = createHash('sha256').update(presented).digest();
    for (const [token, reviewer] of known) {
      if (timingSafeEqual(offered, createHash('sha256').update(token).digest())) {
        request.reviewer = reviewer;
        return true;
      }
    }
    throw new ForbiddenException('Not a reviewer.');
  }
}
