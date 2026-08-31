import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { Injectable, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { Pool } from 'pg';

import { replyDeadline, type ReportCategory, type ReportStatus } from '@keys/domain';

import {
  hashPhone,
  ReportsStore,
  type AddReport,
  type Decision,
  type StoredReport,
  type Throughput,
} from './reports.store';
import { randomBytes } from 'node:crypto';

interface Row {
  id: string;
  reporter_id: string;
  reported_phone_hash: string;
  status: string;
  category: string;
  description: string;
  evidence_keys: string[];
  submitted_at: Date;
  reply_deadline_at: Date;
  published_at: Date | null;
  expires_at: Date | null;
  has_reply: boolean;
  reply: string | null;
  reply_token: string;
}

const COLUMNS = `
  id, reporter_id, reported_phone_hash, status, category, description,
  evidence_keys, submitted_at, reply_deadline_at, published_at, expires_at,
  has_reply, reply, reply_token
`;

function hydrate(row: Row): StoredReport {
  return {
    id: row.id,
    status: row.status as ReportStatus,
    category: row.category as ReportCategory,
    submittedAt: row.submitted_at,
    replyDeadlineAt: row.reply_deadline_at,
    publishedAt: row.published_at,
    expiresAt: row.expires_at,
    hasReply: row.has_reply,
    reporterId: row.reporter_id,
    reportedPhoneHash: row.reported_phone_hash,
    description: row.description,
    evidenceKeys: row.evidence_keys,
    reply: row.reply,
    replyToken: row.reply_token,
  };
}

/**
 * The durable store.
 *
 * The publication rule is in three places on purpose, and that is not
 * duplication in the sense that matters: `review()` decides, this class filters
 * in the query, and the table's `CHECK` constraints refuse to hold a row that
 * breaks it. Each one guards a different way of getting it wrong — a bug in the
 * console, a caller who forgets, and a migration or a psql session that never
 * went through the application at all.
 */
@Injectable()
export class PostgresReportsStore
  extends ReportsStore
  implements OnModuleInit, OnModuleDestroy
{
  readonly durable = true;

  private readonly pool: Pool;

  constructor(connectionString: string) {
    super();
    this.pool = new Pool({ connectionString, max: 8 });
  }

  async onModuleInit(): Promise<void> {
    /*
      Every migration, in filename order, on boot.

      Reading the directory rather than naming files means adding one cannot be
      followed by forgetting to run it — which is how the second migration would
      have been written, applied by hand in psql, and then missing from every
      fresh clone. Each is idempotent (`IF NOT EXISTS`), so re-running the set
      is the normal case rather than the recovery case.
    */
    const dir = join(__dirname, '../../migrations');
    for (const file of readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()) {
      await this.pool.query(readFileSync(join(dir, file), 'utf8'));
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }

  async add(input: AddReport): Promise<StoredReport> {
    const result = await this.pool.query<Row>(
      `INSERT INTO reports (
         id, reporter_id, reported_phone_hash, status, category, description,
         evidence_keys, submitted_at, reply_deadline_at, has_reply, reply_token
       ) VALUES ($1,$2,$3,'submitted',$4,$5,$6,$7,$8,FALSE,$9)
       RETURNING ${COLUMNS}`,
      [
        input.id,
        input.reporterId,
        hashPhone(input.reportedPhone),
        input.category,
        input.description,
        [...input.evidenceKeys],
        input.now,
        replyDeadline(input.now),
        randomBytes(32).toString('base64url'),
      ],
    );
    return hydrate(result.rows[0]!);
  }

  /**
   * The public read. `published_at IS NOT NULL` is in the SQL, not applied by a
   * caller afterwards, so there is no way to ask this for an unpublished report.
   */
  async publishedFor(phone: string, now: Date = new Date()): Promise<readonly StoredReport[]> {
    await this.purgeExpired(now);
    const result = await this.pool.query<Row>(
      `SELECT ${COLUMNS} FROM reports
        WHERE reported_phone_hash = $1 AND published_at IS NOT NULL`,
      [hashPhone(phone)],
    );
    return result.rows.map(hydrate);
  }

  /** The reviewer's read. Everything, and only reachable behind the reviewer guard. */
  async allFor(phone: string): Promise<readonly StoredReport[]> {
    const result = await this.pool.query<Row>(
      `SELECT ${COLUMNS} FROM reports WHERE reported_phone_hash = $1`,
      [hashPhone(phone)],
    );
    return result.rows.map(hydrate);
  }

  async byId(id: string): Promise<StoredReport | undefined> {
    // Guarded, because `id` reaches here from a path parameter and Postgres
    // raises rather than returning nothing when it is not a UUID.
    if (!/^[0-9a-f-]{36}$/i.test(id)) return undefined;
    const result = await this.pool.query<Row>(
      `SELECT ${COLUMNS} FROM reports WHERE id = $1`,
      [id],
    );
    return result.rows[0] ? hydrate(result.rows[0]) : undefined;
  }

  async byReplyToken(token: string): Promise<StoredReport | undefined> {
    if (token.length < 32) return undefined;
    const result = await this.pool.query<Row>(
      `SELECT ${COLUMNS} FROM reports WHERE reply_token = $1`,
      [token],
    );
    return result.rows[0] ? hydrate(result.rows[0]) : undefined;
  }

  async queue(now: Date = new Date()): Promise<readonly StoredReport[]> {
    await this.purgeExpired(now);
    const result = await this.pool.query<Row>(
      `SELECT ${COLUMNS} FROM reports
        WHERE status IN ('submitted', 'under_review', 'awaiting_reply')
        ORDER BY submitted_at ASC`,
    );
    return result.rows.map(hydrate);
  }

  async replace(row: StoredReport): Promise<void> {
    await this.pool.query(
      `UPDATE reports SET
         status = $2, description = $3, evidence_keys = $4,
         published_at = $5, expires_at = $6, has_reply = $7, reply = $8
       WHERE id = $1`,
      [
        row.id,
        row.status,
        row.description,
        [...row.evidenceKeys],
        row.publishedAt,
        row.expiresAt,
        row.hasReply,
        row.reply,
      ],
    );
  }

  async record(entry: Decision): Promise<void> {
    await this.pool.query(
      `INSERT INTO decisions (report_id, reviewer, action, reasoning, decided_at)
       VALUES ($1,$2,$3,$4,$5)`,
      [entry.reportId, entry.reviewer, entry.action, entry.reasoning, entry.at],
    );
  }

  async decisionsFor(reportId: string): Promise<readonly Decision[]> {
    if (!/^[0-9a-f-]{36}$/i.test(reportId)) return [];
    const result = await this.pool.query<{
      report_id: string;
      reviewer: string;
      action: string;
      reasoning: string;
      decided_at: Date;
    }>(
      `SELECT report_id, reviewer, action, reasoning, decided_at
         FROM decisions WHERE report_id = $1 ORDER BY decided_at ASC`,
      [reportId],
    );
    return result.rows.map((r) => ({
      reportId: r.report_id,
      reviewer: r.reviewer,
      action: r.action as Decision['action'],
      reasoning: r.reasoning,
      at: r.decided_at,
    }));
  }

  async since(when: Date): Promise<readonly StoredReport[]> {
    const result = await this.pool.query<Row>(
      `SELECT ${COLUMNS} FROM reports WHERE submitted_at >= $1`,
      [when],
    );
    return result.rows.map(hydrate);
  }

  async throughput(since: Date): Promise<Throughput> {
    const result = await this.pool.query<{ reviewer: string; action: string; n: string }>(
      `SELECT reviewer, action, count(*)::text AS n
         FROM decisions WHERE decided_at >= $1
        GROUP BY reviewer, action`,
      [since],
    );
    const waiting = await this.pool.query<{ n: string; oldest: Date | null }>(
      `SELECT count(*)::text AS n, min(submitted_at) AS oldest
         FROM reports
        WHERE status IN ('submitted', 'under_review', 'awaiting_reply')`,
    );
    return {
      since,
      decisions: result.rows.map((r) => ({
        reviewer: r.reviewer,
        action: r.action,
        count: Number(r.n),
      })),
      waiting: Number(waiting.rows[0]?.n ?? 0),
      oldestWaitingSince: waiting.rows[0]?.oldest ?? null,
    };
  }

  async purgeExpired(now: Date): Promise<number> {
    const result = await this.pool.query(
      `DELETE FROM reports WHERE expires_at IS NOT NULL AND expires_at <= $1`,
      [now],
    );
    return result.rowCount ?? 0;
  }
}
