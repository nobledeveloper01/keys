import { Module } from '@nestjs/common';

import { AgentsModule } from '../agents/agents.module';
import { CapturesController } from './captures.controller';
import { CapturesStore, InMemoryCapturesStore } from './captures.store';

/**
 * One door, behind the agent guard.
 *
 * `AgentsModule` is imported for `AgentsStore`, which `AgentGuard` resolves a
 * token against. Captures are in their own module rather than folded into that
 * one because the thing they protect is different: agents guard *who somebody
 * is*, this guards *where bytes came from*, and the two have no rules in
 * common.
 */
@Module({
  imports: [AgentsModule],
  controllers: [CapturesController],
  providers: [{ provide: CapturesStore, useClass: InMemoryCapturesStore }],
})
export class CapturesModule {}
