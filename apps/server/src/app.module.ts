import { Module } from '@nestjs/common';

import { AgentsModule } from './agents/agents.module';
import { CapturesModule } from './captures/captures.module';
import { ReportsModule } from './reports/reports.module';

/**
 * `HealthController` lives in `ReportsModule` rather than here, because it asks
 * the store whether it is durable and a controller has to be in the module that
 * provides what it injects.
 */
@Module({
  imports: [ReportsModule, AgentsModule, CapturesModule],
})
export class AppModule {}
