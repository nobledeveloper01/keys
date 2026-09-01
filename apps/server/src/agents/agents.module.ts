import { Module } from '@nestjs/common';

import { CapturesStoreModule } from '../captures/captures-store.module';
import { MarketStoreModule } from '../market/market-store.module';
import { ReportsModule } from '../reports/reports.module';
import { AgentReviewController } from './agent-review.controller';
import { AgentsController } from './agents.controller';
import { SearchController } from './search.controller';
import { AgentsStore, InMemoryAgentsStore } from './agents.store';
import { AuthorityController } from './authority.controller';
import { OutboxModule } from '../outbox/outbox.module';
import { PostgresAgentsStore } from './agents.postgres';

/**
 * Three doors again, and again they are not the same size.
 *
 * `AgentsController` is the agent's own — it may draft, it may ask a landlord
 * for a confirmation, and it may publish only what a landlord has already
 * confirmed. `AuthorityController` is the landlord's, reachable by a texted
 * code and by nothing else. `AgentReviewController` is Keys' own, behind the
 * reviewer guard.
 *
 * `ReportsModule` is imported because an upheld scam report costs an agent the
 * `established` badge. That is one import rather than a copied count, so the
 * registry and the ladder cannot disagree about what has been upheld.
 *
 * `CapturesStoreModule` — the store alone, not `CapturesModule` — because a
 * blocked image is one of the eight Verified conditions, and `CapturesModule`
 * imports this one for the agent guard. Two modules importing each other
 * resolve to `undefined` somewhere and fail as a null dereference in a route
 * far from either file.
 */
@Module({
  imports: [ReportsModule, CapturesStoreModule, MarketStoreModule, OutboxModule],
  controllers: [AgentsController, AuthorityController, AgentReviewController, SearchController],
  providers: [
    {
      provide: AgentsStore,
      useFactory: (): AgentsStore => {
        const url = process.env.KEYS_DATABASE_URL;
        return url ? new PostgresAgentsStore(url) : new InMemoryAgentsStore();
      },
    },
  ],
  exports: [AgentsStore],
})
export class AgentsModule {}
