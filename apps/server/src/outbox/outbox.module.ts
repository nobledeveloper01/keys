import { Module } from '@nestjs/common';

import { LogSmsSender, Outbox, SmsSender } from './outbox';

/**
 * The outbox on its own, because three modules owe texts now.
 *
 * It started inside `AgentsModule`, which was right while only the landlord
 * flow sent anything. The registry owes one too — a report generates a reply
 * capability, and phase 1 shipped without anything that delivers it, so the
 * right of reply this product promises has been a token in a database column.
 *
 * The sender is a provider behind an interface (ADR-0017): the logging one
 * today, a real one when R1 and R7 have a provider, and no caller changes.
 */
@Module({
  providers: [
    LogSmsSender,
    { provide: 'SmsSender', useExisting: LogSmsSender },
    { provide: Outbox, useFactory: (sender: SmsSender) => new Outbox(sender), inject: ['SmsSender'] },
  ],
  exports: [Outbox],
})
export class OutboxModule {}
