import { randomUUID } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Pool } from 'pg';

import { HashIndex, hashesFor, type DuplicateDecision, type Grey, type Match } from '@keys/domain';

import {
  CapturesStore,
  type Device,
  type DuplicatePair,
  type StoredCapture,
} from './captures.store';

/** Anything that is not a uuid cannot be a row, and must not reach a query. */
const UUID = /^[0-9a-f-]{36}$/i;

/**
 * The durable captures store.
 *
 * Until this existed there was only the in-memory one, so every photograph and
 * walkthrough in the product vanished on restart — and with them
 * `capture_on_site` and `walkthrough_video` on every listing. A deploy silently
 * un-verified the whole catalogue, and nothing anywhere said so.
 *
 * ## The index is rebuilt per query, on purpose
 *
 * Matching is a BK-tree over perceptual hashes, and a BK-tree does not live in
 * Postgres. The choice was between reimplementing the distance search in SQL —
 * a second implementation of the one question this store exists to answer — and
 * loading the hashes to run the *same* `HashIndex` the memory store runs.
 *
 * This does the second. Two stores that disagree about whether two photographs
 * are the same picture is the failure that matters here, and it is precisely
 * the shape of the bug that cost this codebase `assessListing`.
 *
 * The cost is a table scan per capture. At Lagos scale — thousands of listings,
 * a handful of uploads a minute — that is nothing. When it stops being nothing,
 * the fix is a coarse pre-filter in SQL that *narrows* the candidate set before
 * the same `HashIndex` runs over it, never a different answer computed a
 * different way.
 */
@Injectable()
export class PostgresCapturesStore extends CapturesStore implements OnModuleInit, OnModuleDestroy {
  private readonly pool: Pool;

  constructor(connectionString: string) {
    super();
    this.pool = new Pool({ connectionString, max: 8 });
  }

  async onModuleInit(): Promise<void> {
    const dir = join(__dirname, '../../migrations');
    for (const file of readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()) {
      await this.pool.query(readFileSync(join(dir, file), 'utf8'));
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }

  async registerDevice(input: { agentId: string; publicKey: string; now: Date }) {
    const device: Device = {
      id: `device-${randomUUID()}`,
      agentId: input.agentId,
      publicKey: input.publicKey,
      registeredAt: input.now,
    };
    await this.pool.query(
      'INSERT INTO devices (id, agent_id, public_key, registered_at) VALUES ($1,$2,$3,$4)',
      [device.id, device.agentId, device.publicKey, device.registeredAt],
    );
    return device;
  }

  async device(id: string) {
    const { rows } = await this.pool.query<{
      id: string;
      agent_id: string;
      public_key: string;
      registered_at: Date;
    }>('SELECT id, agent_id, public_key, registered_at FROM devices WHERE id = $1', [id]);
    const row = rows[0];
    return row
      ? {
          id: row.id,
          agentId: row.agent_id,
          publicKey: row.public_key,
          registeredAt: row.registered_at,
        }
      : null;
  }

  async claimNonce(nonce: string, now: Date) {
    /*
      One statement, and the primary key does the deciding.

      A SELECT then an INSERT is two statements with a gap, and the gap is
      exactly long enough to accept the same signed capture twice.
    */
    const { rowCount } = await this.pool.query(
      'INSERT INTO capture_nonces (nonce, spent_at) VALUES ($1,$2) ON CONFLICT DO NOTHING',
      [nonce, now],
    );
    return (rowCount ?? 0) > 0;
  }

  async record(capture: StoredCapture) {
    await this.pool.query(
      `INSERT INTO captures
         (id, listing_id, device_id, sha256, captured_at, latitude, longitude,
          distance_m, kind, duration_seconds, media_key)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [
        capture.id,
        capture.listingId,
        capture.deviceId,
        capture.sha256,
        capture.capturedAt,
        capture.latitude,
        capture.longitude,
        capture.distanceM,
        capture.kind,
        capture.durationSeconds,
        capture.mediaKey,
      ],
    );
  }

  async capturesFor(listingId: string) {
    if (!UUID.test(listingId)) return [];
    const { rows } = await this.pool.query<{
      id: string;
      listing_id: string;
      device_id: string;
      sha256: string;
      captured_at: Date;
      latitude: string;
      longitude: string;
      distance_m: string | null;
      kind: string;
      duration_seconds: number | null;
      media_key: string | null;
    }>(
      `SELECT id, listing_id, device_id, sha256, captured_at, latitude, longitude,
              distance_m, kind, duration_seconds, media_key
         FROM captures WHERE listing_id = $1 ORDER BY captured_at`,
      [listingId],
    );
    return rows.map(
      (row): StoredCapture => ({
        id: row.id,
        listingId: row.listing_id,
        deviceId: row.device_id,
        sha256: row.sha256,
        capturedAt: row.captured_at,
        /*
          NUMERIC arrives as a string — the driver will not round what Postgres
          kept exactly. A coordinate left as a string fails as a distance of
          `NaN`, and `NaN` compares false against every radius, so a listing
          would lose `capture_on_site` for a reason nobody could see.
        */
        latitude: Number(row.latitude),
        longitude: Number(row.longitude),
        distanceM: row.distance_m === null ? null : Number(row.distance_m),
        kind: row.kind as 'photo' | 'video',
        durationSeconds: row.duration_seconds,
        mediaKey: row.media_key,
        /*
          Not read back.

          `looksLike` is what the *upload* was told at the moment it arrived.
          What matters afterwards is whether a reviewer blocked a pair, which
          `isBlocked` answers from `duplicate_pairs` — reconstructing it here
          would be a second answer to a question that already has one.
        */
        looksLike: [],
      }),
    );
  }

  async indexAndMatch(listingId: string, image: Grey) {
    const { rows } = await this.pool.query<{ listing_id: string; hash: string }>(
      'SELECT listing_id, hash FROM image_hashes',
    );

    /*
      The same `HashIndex` the memory store uses, rebuilt from the rows.

      Reimplementing the distance search in SQL would be a second answer to the
      one question this store exists to answer, and two stores disagreeing
      about whether two photographs are the same picture is the exact shape of
      the bug that cost this codebase `assessListing`.
    */
    const index = new HashIndex();
    for (const row of rows) index.add(row.listing_id, BigInt(row.hash));

    // Matched before it is added, and its own listing filtered out: an agent
    // adding a second photograph of the same room must not open a duplicate
    // review against themselves.
    const found = index.nearImage(image).filter((match) => match.id !== listingId);

    for (const hash of hashesFor(image)) {
      await this.pool.query('INSERT INTO image_hashes (listing_id, hash) VALUES ($1,$2)', [
        listingId,
        hash.toString(),
      ]);
    }
    return found;
  }

  /** One key per unordered pair, so A to B and B to A are the same question. */
  private static key(a: string, b: string): string {
    return [a, b].sort().join('::');
  }

  async openPairs(listingId: string, matches: readonly Match[], now: Date) {
    for (const match of matches) {
      // A decided pair stays decided: `DO NOTHING` rather than an upsert, so
      // an agent cannot reset a block by uploading the picture again.
      await this.pool.query(
        `INSERT INTO duplicate_pairs
           (pair_key, listing_id, matched_listing_id, distance, first_seen_at)
         VALUES ($1,$2,$3,$4,$5) ON CONFLICT (pair_key) DO NOTHING`,
        [PostgresCapturesStore.key(listingId, match.id), listingId, match.id, match.distance, now],
      );
    }
  }

  async pendingPairs() {
    const { rows } = await this.pool.query<{
      listing_id: string;
      matched_listing_id: string;
      distance: number;
      first_seen_at: Date;
      decision: string;
      reviewer: string | null;
      reasoning: string | null;
    }>(
      `SELECT listing_id, matched_listing_id, distance, first_seen_at, decision, reviewer, reasoning
         FROM duplicate_pairs WHERE decision = 'pending' ORDER BY distance`,
    );
    return rows.map(
      (row): DuplicatePair => ({
        listingId: row.listing_id,
        matchedListingId: row.matched_listing_id,
        distance: row.distance,
        firstSeenAt: row.first_seen_at,
        decision: row.decision as DuplicateDecision,
        reviewer: row.reviewer,
        reasoning: row.reasoning,
      }),
    );
  }

  async decidePair(input: {
    listingId: string;
    matchedListingId: string;
    decision: Exclude<DuplicateDecision, 'pending'>;
    reviewer: string;
    reasoning: string;
  }) {
    // `decision = 'pending'` is in the WHERE clause, so a second reviewer
    // deciding the same pair changes nothing rather than overwriting the first.
    const { rowCount } = await this.pool.query(
      `UPDATE duplicate_pairs SET decision = $2, reviewer = $3, reasoning = $4
        WHERE pair_key = $1 AND decision = 'pending'`,
      [
        PostgresCapturesStore.key(input.listingId, input.matchedListingId),
        input.decision,
        input.reviewer,
        input.reasoning,
      ],
    );
    return (rowCount ?? 0) > 0;
  }

  async isBlocked(listingId: string) {
    if (!UUID.test(listingId)) return false;
    /*
      Only the copy is blocked, not the original.

      The pair is stored unordered so one decision settles the question, but
      the consequence is not symmetric: `listing_id` is whoever uploaded
      second, and blocking the listing that had the picture first would punish
      the agent who was copied.
    */
    const { rowCount } = await this.pool.query(
      `SELECT 1 FROM duplicate_pairs WHERE listing_id = $1 AND decision = 'blocked' LIMIT 1`,
      [listingId],
    );
    return (rowCount ?? 0) > 0;
  }
}
