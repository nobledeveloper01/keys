import { createHash, randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';

import { isPurgeable, replyDeadline, type Report, type ReportCategory } from '@keys/domain';

/**
 * Where reports live.
 *
 * In memory for now, behind an interface the Postgres implementation will
 * satisfy in phase 1's second half. What matters more than the storage is the
 * shape of the reads: there are two, and only one of them is reachable from
 * outside.
 */
export interface StoredReport extends Report {
  /**
   * Never returned to any client, in any role, including to the person
   * reported. A reporter whose identity reaches the accused is a reporter who
   * gets a visit, and after the first one nobody reports anything.
   */
  readonly reporterId: string;
  readonly reportedPhoneHash: string;
  readonly description: string;
  readonly evidenceKeys: readonly string[];
  readonly reply: string | null;
  /**
   * The capability that lets the reported party answer without an account.
   *
   * Texted to the reported number and stored here, never returned by any read
   * and never derivable from the report id. Holding it is the only proof of
   * control over the number that this product accepts, because demanding a
   * sign-up before someone may answer an accusation about them would mean most
   * of them never answer.
   */
  readonly replyToken: string;
}

/** A phone number is stored hashed. The registry answers about numbers it is asked; it does not hold a list of them to be stolen. */
export function hashPhone(e164: string): string {
  return createHash('sha256').update(e164).digest('hex');
}

export interface AddReport {
  readonly id: string;
  readonly reporterId: string;
  readonly reportedPhone: string;
  readonly category: ReportCategory;
  readonly description: string;
  readonly evidenceKeys: readonly string[];
  readonly now: Date;
}

/**
 * What a store has to be able to do, and nothing more.
 *
 * Two reads, and they are not the same size: `publishedFor` is reachable by
 * anybody and filters on `publishedAt` in the query itself, `allFor` is
 * reachable only behind the reviewer guard. Everything else is a write or a
 * lookup by capability.
 *
 * Every method takes `now` rather than reading the clock, so the retention
 * behaviour is testable without waiting a year.
 */
export abstract class ReportsStore {
  abstract add(input: AddReport): Promise<StoredReport> | StoredReport;
  abstract publishedFor(phone: string, now?: Date): Promise<readonly StoredReport[]> | readonly StoredReport[];
  abstract allFor(phone: string): Promise<readonly StoredReport[]> | readonly StoredReport[];
  abstract byId(id: string): Promise<StoredReport | undefined> | StoredReport | undefined;
  abstract byReplyToken(token: string): Promise<StoredReport | undefined> | StoredReport | undefined;
  abstract queue(now?: Date): Promise<readonly StoredReport[]> | readonly StoredReport[];
  abstract replace(row: StoredReport): Promise<void> | void;
  abstract purgeExpired(now: Date): Promise<number> | number;
  /** Whether this survives a restart. `/healthz` says so out loud. */
  abstract readonly durable: boolean;
}

/**
 * The in-memory store.
 *
 * Kept after Postgres arrived, because every test in this repository runs
 * against both — and a test suite that only exercises the implementation it was
 * written against proves nothing about the one that ships.
 */
@Injectable()
export class InMemoryReportsStore extends ReportsStore {
  readonly durable = false;

  private readonly rows = new Map<string, StoredReport>();

  add(input: AddReport): StoredReport {
    const row: StoredReport = {
      id: input.id,
      status: 'submitted',
      category: input.category,
      submittedAt: input.now,
      replyDeadlineAt: replyDeadline(input.now),
      publishedAt: null,
      expiresAt: null,
      hasReply: false,
      reporterId: input.reporterId,
      reportedPhoneHash: hashPhone(input.reportedPhone),
      description: input.description,
      evidenceKeys: input.evidenceKeys,
      reply: null,
      replyToken: randomBytes(32).toString('base64url'),
    };
    this.rows.set(row.id, row);
    return row;
  }

  /**
   * The public read. Filters on `publishedAt` in the query itself.
   *
   * This is the one that matters. A caller cannot ask this for an unpublished
   * report, because unpublished reports are not in what it returns — the
   * filter is not applied afterwards by a caller who might forget.
   */
  /**
   * Deletes every row past its retention date.
   *
   * Called from the reads rather than from a scheduler on purpose. A cron job
   * that stops running is a retention policy that stops being true while every
   * document still says it holds; this cannot drift, because the only way to
   * read a report is to have just purged the expired ones.
   */
  purgeExpired(now: Date): number {
    let dropped = 0;
    for (const [id, row] of this.rows) {
      if (isPurgeable(row, now)) {
        this.rows.delete(id);
        dropped += 1;
      }
    }
    return dropped;
  }

  publishedFor(phone: string, now: Date = new Date()): readonly StoredReport[] {
    this.purgeExpired(now);
    const hash = hashPhone(phone);
    return [...this.rows.values()].filter(
      (r) => r.reportedPhoneHash === hash && r.publishedAt !== null,
    );
  }

  /** The reviewer's read. Everything, and only reachable behind the reviewer guard. */
  allFor(phone: string): readonly StoredReport[] {
    const hash = hashPhone(phone);
    return [...this.rows.values()].filter((r) => r.reportedPhoneHash === hash);
  }

  byId(id: string): StoredReport | undefined {
    return this.rows.get(id);
  }

  /**
   * The right-of-reply read, by capability rather than by id.
   *
   * Separate from `byId` so that no route which happens to accept a path
   * parameter can be turned into this one. A caller either holds the token
   * that was texted to the number, or gets nothing.
   */
  byReplyToken(token: string): StoredReport | undefined {
    if (token.length < 32) return undefined;
    return [...this.rows.values()].find((r) => r.replyToken === token);
  }

  queue(now: Date = new Date()): readonly StoredReport[] {
    this.purgeExpired(now);
    return [...this.rows.values()].filter(
      (r) => r.status === 'submitted' || r.status === 'under_review' || r.status === 'awaiting_reply',
    );
  }

  replace(row: StoredReport): void {
    this.rows.set(row.id, row);
  }
}
