import { Module } from '@nestjs/common';

import { MarketModule } from './market/market.module';
import { AgentsModule } from './agents/agents.module';
import { CapturesModule } from './captures/captures.module';
import { ReportsModule } from './reports/reports.module';
import { TenancyModule } from './tenancy/tenancy.module';
import { ReachModule } from './reach/reach.module';

/**
 * `HealthController` lives in `ReportsModule` rather than here, because it asks
 * the store whether it is durable and a controller has to be in the module that
 * provides what it injects.
 */
@Module({
  imports: [ReportsModule, AgentsModule,
    MarketModule, CapturesModule, TenancyModule, ReachModule],
})
export class AppModule {}
