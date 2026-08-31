import { Module } from '@nestjs/common';

import { AgentsModule } from '../agents/agents.module';
import { CapturesStoreModule } from './captures-store.module';
import { CapturesController } from './captures.controller';
import { DuplicatesController } from './duplicates.controller';

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
  imports: [AgentsModule, CapturesStoreModule],
  controllers: [CapturesController, DuplicatesController],
})
export class CapturesModule {}
