import { Module } from '@nestjs/common';

import { MarketStore, MemoryMarketStore } from './market.store';
import { PostgresMarketStore } from './market.postgres';

/**
 * The market store on its own, so that `assessListing` can read suspensions
 * without pulling in the controller that writes them.
 *
 * A listing's badge depends on whether somebody went there and found nothing,
 * which makes suspensions an input to verification rather than a feature
 * beside it — the same shape as the captures store, and for the same reason.
 */
@Module({
  providers: [
    {
      provide: MarketStore,
      useClass: process.env.KEYS_DATABASE_URL ? PostgresMarketStore : MemoryMarketStore,
    },
  ],
  exports: [MarketStore],
})
export class MarketStoreModule {}
