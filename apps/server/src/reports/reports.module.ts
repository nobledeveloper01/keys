import { Module } from '@nestjs/common';

import { HealthController } from '../health.controller';
import { ReplyController } from './reply.controller';
import { ReportsController } from './reports.controller';
import { PostgresReportsStore } from './reports.postgres';
import { InMemoryReportsStore, ReportsStore } from './reports.store';
import { ReviewController } from './review.controller';

/**
 * Three doors onto one store, and they are not the same size.
 *
 * `ReportsController` is public and returns counts. `ReplyController` is
 * reachable by a texted capability and returns one report to the person it
 * names. `ReviewController` is behind the reviewer guard and returns
 * everything. Nothing else may read the store.
 */
@Module({
  controllers: [ReportsController, ReplyController, ReviewController, HealthController],
  providers: [
    {
      provide: ReportsStore,
      useFactory: (): ReportsStore => {
        /*
          Postgres when it is configured, memory when it is not.

          Deliberately not the other way round with a localhost default. A
          server that silently falls back to memory is a server that loses
          every report on the next restart while `/healthz` and every log line
          look normal — so the fallback is the one that announces itself:
          `durable: false`, said out loud on the health endpoint.
        */
        const url = process.env.KEYS_DATABASE_URL;
        return url ? new PostgresReportsStore(url) : new InMemoryReportsStore();
      },
    },
  ],
  // The agents module needs the registry: an upheld report costs an agent
  // the `established` badge, and one import beats a copied count.
  exports: [ReportsStore],
})
export class ReportsModule {}
