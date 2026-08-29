import { Module } from '@nestjs/common';

import { ReplyController } from './reply.controller';
import { ReportsController } from './reports.controller';
import { ReportsStore } from './reports.store';
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
  controllers: [ReportsController, ReplyController, ReviewController],
  providers: [ReportsStore],
})
export class ReportsModule {}
