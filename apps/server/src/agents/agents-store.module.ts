import { Module } from '@nestjs/common';

import { AgentsStore, InMemoryAgentsStore } from './agents.store';
import { PostgresAgentsStore } from './agents.postgres';

/**
 * The agents store on its own, so two modules can share it without a cycle.
 *
 * The third time this shape has been needed — captures, market, and now
 * reports — and each time for the same reason. `AgentsModule` imports
 * `ReportsModule`, because an upheld report costs an agent the `established`
 * badge. `ReportsModule` now needs to ask whose listing a report is about,
 * because a report filed from a listing page has no phone number in it.
 *
 * Left as two modules importing each other, Nest resolves one of them to
 * `undefined` and the failure arrives as a null dereference in a route far from
 * either file. A module that provides one thing and imports nothing cannot take
 * part in a cycle.
 */
@Module({
  providers: [
    {
      provide: AgentsStore,
      useFactory: (): AgentsStore => {
        const url = process.env.KEYS_DATABASE_URL;
        return url ? new PostgresAgentsStore(url) : new InMemoryAgentsStore();
      },
    },
  ],
  exports: [AgentsStore],
})
export class AgentsStoreModule {}
