import { Module } from '@nestjs/common';

import { CapturesStoreModule } from '../captures/captures-store.module';
import { MarketStoreModule } from '../market/market-store.module';
import { ReportsModule } from '../reports/reports.module';
import { AgentReviewController } from './agent-review.controller';
import { AgentsController } from './agents.controller';
import { SearchController } from './search.controller';
import { AgentsStoreModule } from './agents-store.module';
import { AuthorityController } from './authority.controller';
import { OutboxModule } from '../outbox/outbox.module';

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
  imports: [AgentsStoreModule, ReportsModule, CapturesStoreModule, MarketStoreModule, OutboxModule],
  controllers: [AgentsController, AuthorityController, AgentReviewController, SearchController],
  /*
    The module, not the provider.

    Nest will not re-export a provider it did not itself declare — the store is
    `AgentsStoreModule`'s now — and the error it gives when you try says
    "cannot export a provider that is not part of the currently processed
    module", which is exactly what is happening and takes a moment to read as
    such.
  */
  exports: [AgentsStoreModule],
})
export class AgentsModule {}
