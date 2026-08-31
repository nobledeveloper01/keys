import { Module } from '@nestjs/common';

import { Outbox } from './outbox';

/**
 * The outbox on its own, because three modules owe texts now.
 *
 * It started inside `AgentsModule`, which was right while only the landlord
 * flow sent anything. The registry owes one too — a report generates a reply
 * capability, and phase 1 shipped without anything that delivers it, so the
 * right of reply this product promises has been a token in a database column.
 *
 * One provider, no imports, so it cannot take part in a module cycle.
 */
@Module({
  providers: [Outbox],
  exports: [Outbox],
})
export class OutboxModule {}
