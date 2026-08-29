import {
  InMemoryReportsStore,
  ReportsStore,
} from '../src/reports/reports.store';
import { PostgresReportsStore } from '../src/reports/reports.postgres';

/**
 * The store filter, held directly.
 *
 * This test exists because of a hole the adversarial gate did not catch.
 * Deleting `publishedAt !== null` from `publishedFor` left every route test
 * green, because the controller passes what it gets through `standing`, which
 * filters again. Two filters, one of them load-bearing and one of them unheld
 * by anything — until a later change makes the unheld one the last line.
 *
 * So it is held here, on its own, without a controller in the way — and against
 * both stores, because in Postgres the same rule is a `WHERE` clause and a
 * mistake in it looks nothing like a mistake in an `Array.filter`.
 */

const PHONE = '+2348011122233';
const OTHER = '+2349099988877';
const DATABASE_URL = process.env.KEYS_TEST_DATABASE_URL;

const STORES: Array<[string, () => ReportsStore]> = [
  ['in memory', () => new InMemoryReportsStore()],
  ...(DATABASE_URL
    ? ([['postgres', () => new PostgresReportsStore(DATABASE_URL)]] as Array<
        [string, () => ReportsStore]
      >)
    : []),
];

const uuid = (n: number) => `0000000${n}-0000-4000-8000-00000000000${n}`;

describe.each(STORES)('the public read cannot see unpublished reports (%s)', (name, make) => {
  let store: ReportsStore;
  let id: string;

  beforeEach(async () => {
    store = make();
    const init = store as { onModuleInit?: () => Promise<void> };
    if (init.onModuleInit) await init.onModuleInit();

    // Each case starts from an empty table. Postgres does not forget between
    // tests the way a new `Map` does.
    for (const phone of [PHONE, OTHER]) {
      for (const row of await store.allFor(phone)) {
        await store.replace({ ...row, expiresAt: new Date(0) });
      }
    }
    await store.purgeExpired(new Date());

    id = uuid(1);
    await store.add({
      id,
      reporterId: 'reporter',
      reportedPhone: PHONE,
      category: 'fake_listing',
      description: 'A flat that had already been let three times.',
      evidenceKeys: ['chat.png'],
      now: new Date('2026-01-01T00:00:00Z'),
    });
  });

  afterEach(async () => {
    for (const phone of [PHONE, OTHER]) {
      for (const row of await store.allFor(phone)) {
        await store.replace({ ...row, expiresAt: new Date(0) });
      }
    }
    await store.purgeExpired(new Date());
    const done = store as { onModuleDestroy?: () => Promise<void> };
    if (done.onModuleDestroy) await done.onModuleDestroy();
  });

  const row = async () => (await store.byId(id))!;

  it('excludes a submitted report', async () => {
    expect(await store.publishedFor(PHONE)).toHaveLength(0);
  });

  it('excludes a report under review', async () => {
    await store.replace({ ...(await row()), status: 'under_review' });
    expect(await store.publishedFor(PHONE)).toHaveLength(0);
  });

  it('excludes a report decided but never given a publication date', async () => {
    await store.replace({ ...(await row()), status: 'not_upheld', publishedAt: null });
    expect(await store.publishedFor(PHONE)).toHaveLength(0);
  });

  it('includes one only once it has a publication date', async () => {
    await store.replace({
      ...(await row()),
      status: 'upheld',
      publishedAt: new Date('2026-01-09T00:00:00Z'),
    });
    expect(await store.publishedFor(PHONE)).toHaveLength(1);
  });

  it('never returns another number’s reports', async () => {
    await store.replace({
      ...(await row()),
      status: 'upheld',
      publishedAt: new Date('2026-01-09T00:00:00Z'),
    });
    expect(await store.publishedFor(OTHER)).toHaveLength(0);
  });

  it('drops a report once its deletion date has passed, on the read itself', async () => {
    await store.replace({
      ...(await row()),
      status: 'not_upheld',
      expiresAt: new Date('2027-01-01T00:00:00Z'),
    });

    // The day before: still held, because a reviewer looking for a pattern of
    // eleven dismissed reports needs the ten that came first.
    await store.publishedFor(PHONE, new Date('2026-12-31T00:00:00Z'));
    expect(await store.allFor(PHONE)).toHaveLength(1);

    // The day after: gone, and gone because the read purged it rather than
    // because a scheduler somewhere was still running.
    await store.publishedFor(PHONE, new Date('2027-01-02T00:00:00Z'));
    expect(await store.allFor(PHONE)).toHaveLength(0);
    expect(await store.byId(id)).toBeUndefined();
  });

  it('never drops a report that has no deletion date', async () => {
    await store.publishedFor(PHONE, new Date('2099-01-01T00:00:00Z'));
    expect(await store.byId(id)).toBeDefined();
  });

  it('the reviewer read sees what the public read hides, so this is not passing by returning nothing', async () => {
    expect(await store.allFor(PHONE)).toHaveLength(1);
  });

  if (name === 'postgres') {
    it('the table itself refuses a published report that nobody upheld', async () => {
      /*
        The third place the rule lives, and the only one a psql session cannot
        walk past. `review()` decides it, `publishedFor` filters on it, and this
        refuses to hold a row that breaks it — each guarding a different way of
        getting it wrong.
      */
      await expect(
        store.replace({
          ...(await row()),
          status: 'submitted',
          publishedAt: new Date('2026-01-09T00:00:00Z'),
        }),
      ).rejects.toThrow(/reports_only_upheld_is_published/);
    });
  }
});
