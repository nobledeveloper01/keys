import { Module } from '@nestjs/common';

import { AgentsModule } from '../agents/agents.module';
import { CapturesStoreModule } from '../captures/captures-store.module';
import { ReportsModule } from '../reports/reports.module';
import { MarketStoreModule } from '../market/market-store.module';
import { TenancyModule } from '../tenancy/tenancy.module';
import { ReachController } from './reach.controller';
import { PostgresReachStore } from './reach.postgres';
import { MemoryReachStore, ReachStore } from './reach.store';
import { SavedSearchesController } from './saved-searches.controller';
import { PostgresSavedSearchesStore } from './saved-searches.postgres';
import { MemorySavedSearchesStore, SavedSearchesStore } from './saved-searches.store';

/** Cities, area guides and applications (Phase 8). Tenancies answer which areas a tenant may speak for. */
@Module({
  imports: [AgentsModule, MarketStoreModule, TenancyModule, CapturesStoreModule, ReportsModule],
  controllers: [ReachController, SavedSearchesController],
  providers: [
    { provide: ReachStore, useClass: process.env.KEYS_DATABASE_URL ? PostgresReachStore : MemoryReachStore },
    { provide: SavedSearchesStore, useClass: process.env.KEYS_DATABASE_URL ? PostgresSavedSearchesStore : MemorySavedSearchesStore },
  ],
})
export class ReachModule {}
