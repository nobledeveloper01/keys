import { Module } from '@nestjs/common';

import { CapturesStore, InMemoryCapturesStore } from './captures.store';

/**
 * The store on its own, so two modules can share it without a cycle.
 *
 * `CapturesModule` needs `AgentsModule` for the guard that resolves an agent
 * token. `AgentsModule` needs the captures store, because whether a reviewer
 * has blocked an image is one of the seven conditions behind the Verified
 * badge. Left as two modules importing each other, Nest resolves one of them
 * to `undefined` and the failure is a null dereference in a route far from
 * either file.
 *
 * A module that provides one thing and imports nothing cannot take part in a
 * cycle, which is the whole reason it exists.
 */
@Module({
  providers: [{ provide: CapturesStore, useClass: InMemoryCapturesStore }],
  exports: [CapturesStore],
})
export class CapturesStoreModule {}
