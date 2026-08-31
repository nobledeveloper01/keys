import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { AgentsStore, type StoredAgent } from './agents.store';

export interface RequestWithAgent {
  headers: Record<string, string | string[] | undefined>;
  agent?: StoredAgent;
}

/**
 * Resolves an agent token into an agent, and nothing more.
 *
 * Note what this guard does *not* attach: a tier. Every other product I have
 * seen put the role on the session at this point, and that is the mistake —
 * once a tier rides on the request, every route becomes a place where it might
 * be trusted, and the client is one middleware bug away from choosing its own.
 * Here the tier is computed from evidence at the point of use, every time.
 */
@Injectable()
export class AgentGuard implements CanActivate {
  constructor(private readonly store: AgentsStore) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithAgent>();
    const header = request.headers['x-agent-token'];
    const presented = Array.isArray(header) ? '' : (header ?? '');
    if (!presented) throw new UnauthorizedException('Sign in first.');

    const agent = await this.store.agentByToken(presented);
    if (!agent) throw new UnauthorizedException('Sign in first.');

    request.agent = agent;
    return true;
  }
}
