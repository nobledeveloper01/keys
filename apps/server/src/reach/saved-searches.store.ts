import { Injectable } from '@nestjs/common';

import type { SearchParams, Seen } from '@keys/domain';

type Await<T> = Promise<T> | T;

/** A saved search as the server holds it: the box and the answer it last saw (ADR-0020). */
export interface SavedSearch {
  readonly id: string;
  readonly tenantId: string;
  readonly params: SearchParams;
  readonly seen: readonly Seen[];
  readonly savedAt: Date;
  readonly readAt: Date;
}

export abstract class SavedSearchesStore {
  abstract save(s: SavedSearch): Await<void>;
  abstract forTenant(tenantId: string): Await<readonly SavedSearch[]>;
  abstract byId(id: string): Await<SavedSearch | null>;
  /** The answer just read becomes what the search last saw. */
  abstract markSeen(id: string, seen: readonly Seen[], readAt: Date): Await<void>;
  abstract remove(id: string, tenantId: string): Await<boolean>;
}

@Injectable()
export class MemorySavedSearchesStore extends SavedSearchesStore {
  private readonly rows = new Map<string, SavedSearch>();

  save(s: SavedSearch) {
    this.rows.set(s.id, s);
  }
  forTenant(tenantId: string) {
    return [...this.rows.values()].filter((s) => s.tenantId === tenantId).sort((a, b) => a.savedAt.getTime() - b.savedAt.getTime());
  }
  byId(id: string) {
    return this.rows.get(id) ?? null;
  }
  markSeen(id: string, seen: readonly Seen[], readAt: Date) {
    const row = this.rows.get(id);
    if (row) this.rows.set(id, { ...row, seen, readAt });
  }
  remove(id: string, tenantId: string) {
    const row = this.rows.get(id);
    if (!row || row.tenantId !== tenantId) return false;
    this.rows.delete(id);
    return true;
  }
}
