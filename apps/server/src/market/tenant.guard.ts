import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { MarketStore, type StoredTenant } from './market.store';

export interface RequestWithTenant {
  headers: Record<string, string | string[] | undefined>;
  tenant?: StoredTenant;
}

/**
 * Resolves a tenant token into a tenant.
 *
 * A separate header from the agent's, deliberately. One header for both would
 * mean every route that meant "an agent" would accept a tenant token that
 * happened to resolve, and the difference between the two accounts is the
 * difference between somebody who can list a property and somebody who cannot.
 */
@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private readonly store: MarketStore) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithTenant>();
    const header = request.headers['x-tenant-token'];
    const presented = Array.isArray(header) ? '' : (header ?? '');
    if (!presented) throw new UnauthorizedException('Sign in first.');

    const tenant = await this.store.tenantByToken(presented);
    if (!tenant) throw new UnauthorizedException('Sign in first.');

    request.tenant = tenant;
    return true;
  }
}
