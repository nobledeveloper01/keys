import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { LANGUAGES, say } from '@keys/domain';

import { ReportsStore } from './reports/reports.store';

/**
 * Whether the server is up, and what it is honest about.
 *
 * `durable` is stated rather than assumed. The previous project defaulted to
 * an in-memory store so a reviewer would not have to provision Postgres to
 * read the Swagger page, and that is a good default — but a service that
 * cannot say whether its data survives a restart is a service somebody will
 * eventually trust with data that does not.
 */
@ApiTags('health')
@Controller('healthz')
export class HealthController {
  constructor(private readonly store: ReportsStore) {}

  @Get()
  @ApiOperation({ summary: 'Liveness, and whether the store is durable.' })
  get() {
    return {
      status: 'ok',
      /*
        Asked of the store rather than inferred from the environment.

        Reading `KEYS_DATABASE_URL` here would mean this endpoint reports
        `durable: true` because a variable is set, which is a claim about
        configuration rather than about where the data actually went. The store
        itself is the only thing that knows.
      */
      store: this.store.durable ? 'postgres' : 'in-memory',
      durable: this.store.durable,

      /*
        Proof that the server and the phone are running the same rules.

        Not decoration. On the previous project the server was C# and every
        shared rule existed twice, held together by a generated parity suite;
        a third of the server work was keeping two implementations agreeing.
        Here the server imports the TypeScript the phone imports, so this line
        is served by exactly the code that renders it on a device. If this
        import ever breaks, the build fails rather than the meanings drifting.
      */
      languages: LANGUAGES,
      verified: say('en', 'verified'),
    };
  }
}
