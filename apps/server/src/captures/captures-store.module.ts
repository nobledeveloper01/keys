import { Module } from '@nestjs/common';

import { CapturesStore, InMemoryCapturesStore } from './captures.store';
import { PostgresCapturesStore } from './captures.postgres';

/**
 * The store on its own, so two modules can share it without a cycle.
 *
 * `CapturesModule` needs `AgentsModule` for the guard that resolves an agent
 * token. `AgentsModule` needs the captures store, because whether a reviewer
 * has blocked an image is one of the eight conditions behind the Verified
 * badge. Left as two modules importing each other, Nest resolves one of them
 * to `undefined` and the failure is a null dereference in a route far from
 * either file.
 *
 * A module that provides one thing and imports nothing cannot take part in a
 * cycle, which is the whole reason it exists.
 */
@Module({
  providers: [
    {
      provide: CapturesStore,
      useFactory: (): CapturesStore => {
        /*
          The same switch every other store makes, and it was missing here.

          Without a durable implementation this was memory-only in production
          as well as in tests, so every photograph and walkthrough vanished on
          restart — taking `capture_on_site` and `walkthrough_video` with them
          on every listing in the catalogue, silently, on every deploy.
        */
        const url = process.env.KEYS_DATABASE_URL;
        return url ? new PostgresCapturesStore(url) : new InMemoryCapturesStore();
      },
    },
  ],
  exports: [CapturesStore],
})
export class CapturesStoreModule {}
