import { ReportsStore } from '../src/reports/reports.store';

/**
 * The store filter, held directly.
 *
 * This test exists because of a hole the adversarial gate did not catch.
 * Deleting `publishedAt !== null` from `publishedFor` left every route test
 * green, because the controller passes what it gets through `standing`, which
 * filters again. Two filters, one of them load-bearing and one of them unheld
 * by anything — until a later change makes the unheld one the last line.
 *
 * So it is held here, on its own, without a controller in the way.
 */
const PHONE = '+2348011122233';

function seed() {
  const store = new ReportsStore();
  const row = store.add({
    id: 'r1',
    reporterId: 'reporter',
    reportedPhone: PHONE,
    category: 'fake_listing',
    description: 'A flat that had already been let three times.',
    evidenceKeys: ['chat.png'],
    now: new Date('2026-01-01T00:00:00Z'),
  });
  return { store, row };
}

describe('the public read cannot see unpublished reports', () => {
  it('excludes a submitted report', () => {
    const { store } = seed();
    expect(store.publishedFor(PHONE)).toHaveLength(0);
  });

  it('excludes a report under review', () => {
    const { store, row } = seed();
    store.replace({ ...row, status: 'under_review' });
    expect(store.publishedFor(PHONE)).toHaveLength(0);
  });

  it('excludes a report decided but never given a publication date', () => {
    const { store, row } = seed();
    store.replace({ ...row, status: 'not_upheld', publishedAt: null });
    expect(store.publishedFor(PHONE)).toHaveLength(0);
  });

  it('includes one only once it has a publication date', () => {
    const { store, row } = seed();
    store.replace({ ...row, status: 'upheld', publishedAt: new Date('2026-01-09T00:00:00Z') });
    expect(store.publishedFor(PHONE)).toHaveLength(1);
  });

  it('never returns another number’s reports', () => {
    const { store, row } = seed();
    store.replace({ ...row, status: 'upheld', publishedAt: new Date('2026-01-09T00:00:00Z') });
    expect(store.publishedFor('+2349099988877')).toHaveLength(0);
  });

  it('drops a report once its deletion date has passed, on the read itself', () => {
    const { store, row } = seed();
    store.replace({ ...row, status: 'not_upheld', expiresAt: new Date('2027-01-01T00:00:00Z') });

    // The day before: still held, because a reviewer looking for a pattern of
    // eleven dismissed reports needs the ten that came first.
    expect(store.allFor(PHONE)).toHaveLength(1);
    expect(store.queue(new Date('2026-12-31T00:00:00Z'))).toHaveLength(0); // decided, so not queued
    expect(store.allFor(PHONE)).toHaveLength(1);

    // The day after: gone, and gone because the read purged it rather than
    // because a scheduler somewhere was still running.
    store.publishedFor(PHONE, new Date('2027-01-02T00:00:00Z'));
    expect(store.allFor(PHONE)).toHaveLength(0);
    expect(store.byId(row.id)).toBeUndefined();
  });

  it('never drops a report that has no deletion date', () => {
    const { store, row } = seed();
    store.publishedFor(PHONE, new Date('2099-01-01T00:00:00Z'));
    expect(store.byId(row.id)).toBeDefined();
  });

  it('the reviewer read sees what the public read hides, so this is not passing by returning nothing', () => {
    const { store } = seed();
    expect(store.allFor(PHONE)).toHaveLength(1);
  });
});
