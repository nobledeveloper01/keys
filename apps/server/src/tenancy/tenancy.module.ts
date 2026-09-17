import { Module } from '@nestjs/common';

import { AgentsModule } from '../agents/agents.module';
import { CapturesStoreModule } from '../captures/captures-store.module';
import { MarketStoreModule } from '../market/market-store.module';
import { TenancyController } from './tenancy.controller';
import { PostgresTenancyStore } from './tenancy.postgres';
import { MemoryTenancyStore, TenancyStore } from './tenancy.store';

/**
 * The tenancy (Phase 7). Imports the agents store for authority, the market
 * store for the tenant and the captures store for the agent's device keys —
 * all three are questions those stores already answer.
 */
@Module({
  imports: [AgentsModule, MarketStoreModule, CapturesStoreModule],
  controllers: [TenancyController],
  providers: [{ provide: TenancyStore, useClass: process.env.KEYS_DATABASE_URL ? PostgresTenancyStore : MemoryTenancyStore }],
  exports: [TenancyStore],
})
export class TenancyModule {}
