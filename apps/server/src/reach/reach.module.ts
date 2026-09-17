import { Module } from '@nestjs/common';

import { AgentsModule } from '../agents/agents.module';
import { MarketStoreModule } from '../market/market-store.module';
import { TenancyModule } from '../tenancy/tenancy.module';
import { ReachController } from './reach.controller';
import { PostgresReachStore } from './reach.postgres';
import { MemoryReachStore, ReachStore } from './reach.store';

/** Cities, area guides and applications (Phase 8). Tenancies answer which areas a tenant may speak for. */
@Module({
  imports: [AgentsModule, MarketStoreModule, TenancyModule],
  controllers: [ReachController],
  providers: [{ provide: ReachStore, useClass: process.env.KEYS_DATABASE_URL ? PostgresReachStore : MemoryReachStore }],
})
export class ReachModule {}
