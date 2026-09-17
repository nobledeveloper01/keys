import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Pool } from 'pg';

import type { SearchParams, Seen } from '@keys/domain';

import { SavedSearchesStore, type SavedSearch } from './saved-searches.store';

interface Row {
  id: string;
  tenant_id: string;
  params: SearchParams;
  seen: Seen[];
  saved_at: Date;
  read_at: Date;
}

const UUID = /^[0-9a-f-]{36}$/i;

function hydrate(r: Row): SavedSearch {
  return { id: r.id, tenantId: r.tenant_id, params: r.params, seen: r.seen, savedAt: r.saved_at, readAt: r.read_at };
}

/** Migrations run in `PostgresReachStore.onModuleInit`, which loads every file in the directory; this store only reads and writes. */
@Injectable()
export class PostgresSavedSearchesStore extends SavedSearchesStore implements OnModuleDestroy {
  private readonly pool: Pool;

  constructor() {
    super();
    this.pool = new Pool({ connectionString: process.env.KEYS_DATABASE_URL, max: 4 });
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }


  async save(s: SavedSearch): Promise<void> {
    await this.pool.query(
      'INSERT INTO saved_searches (id, tenant_id, params, seen, saved_at, read_at) VALUES ($1,$2,$3,$4,$5,$6)',
      [s.id, s.tenantId, JSON.stringify(s.params), JSON.stringify(s.seen), s.savedAt, s.readAt],
    );
  }

  async forTenant(tenantId: string): Promise<readonly SavedSearch[]> {
    const r = await this.pool.query<Row>('SELECT * FROM saved_searches WHERE tenant_id = $1 ORDER BY saved_at, id', [tenantId]);
    return r.rows.map(hydrate);
  }

  async byId(id: string): Promise<SavedSearch | null> {
    if (!UUID.test(id)) return null;
    const r = await this.pool.query<Row>('SELECT * FROM saved_searches WHERE id = $1', [id]);
    return r.rows[0] ? hydrate(r.rows[0]) : null;
  }

  async markSeen(id: string, seen: readonly Seen[], readAt: Date): Promise<void> {
    await this.pool.query('UPDATE saved_searches SET seen = $2, read_at = $3 WHERE id = $1', [id, JSON.stringify(seen), readAt]);
  }

  async remove(id: string, tenantId: string): Promise<boolean> {
    if (!UUID.test(id)) return false;
    const r = await this.pool.query('DELETE FROM saved_searches WHERE id = $1 AND tenant_id = $2', [id, tenantId]);
    return (r.rowCount ?? 0) > 0;
  }
}
