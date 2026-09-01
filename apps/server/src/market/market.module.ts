import { Module } from '@nestjs/common';

import { AgentsModule } from '../agents/agents.module';
import { MarketController } from './market.controller';
import { MarketStoreModule } from './market-store.module';

/**
 * Conversations, inspections and outcomes.
 *
 * Depends on the agents store because a conversation is *about a listing* and
 * an inspection is *on somebody's property* — both questions the agents store
 * already answers. Copying either here would be a second answer to a question
 * with one.
 */
@Module({
  imports: [MarketStoreModule, AgentsModule],
  controllers: [MarketController],
})
export class MarketModule {}
