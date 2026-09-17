import { Injectable, Logger } from '@nestjs/common';

import { hashPhone } from '../reports/reports.store';

export interface OutboundText {
  readonly toPhoneHash: string;
  /**
   * The number, in plain, for one message (ADR-0017). Present from the moment
   * the message is queued until it is sent or given up on, and null after —
   * the row keeps the hash, the body and when, and nothing that could
   * address anybody again.
   */
  readonly to: string | null;
  readonly body: string;
  readonly queuedAt: Date;
  readonly sentAt: Date | null;
  readonly attempts: number;
}

/** What sends a text. One method; a provider is a second implementation. */
export interface SmsSender {
  /** True when the provider accepted it. False is a refusal, and is retried a bounded number of times. */
  send(to: string, body: string): Promise<boolean>;
}

/** After this many refusals the number is dropped with the message: a queue that keeps failed numbers forever is a directory. */
export const MAX_SEND_ATTEMPTS = 3;

/**
 * The sender that exists today: it writes that a message went and the hash it
 * went to — never the number, never the body, which holds a one-time code.
 * Under `KEYS_SMS_LOG=1` outside production the body is logged too, so the
 * landlord flow can be exercised on a machine somebody is sitting at.
 */
@Injectable()
export class LogSmsSender implements SmsSender {
  private readonly log = new Logger('sms');

  send(to: string, body: string): Promise<boolean> {
    const hash = hashPhone(to).slice(0, 12);
    if (process.env.KEYS_SMS_LOG === '1' && process.env.NODE_ENV !== 'production') {
      this.log.warn(`[dev sms] to ${hash}…  ${body}`);
    } else {
      this.log.log(`sent ${body.length} chars to ${hash}…`);
    }
    return Promise.resolve(true);
  }
}

/**
 * Texts this server owes.
 *
 * The one place a number is written in plain, for one message, and forgotten
 * when it is sent (ADR-0017). Every caller that queues here already holds
 * the number at that instant — the reporter typed it, the agent typed the
 * landlord's, the landlord typed their own — so nothing is ever un-hashed;
 * the account stores stay hashes.
 *
 * Deliberately has no controller. Nothing in this product exposes an outbox
 * over HTTP, in any role, because a one-time code sitting in a queue is a
 * one-time code, and a reviewer who can read it is a reviewer who can grant
 * authority over a stranger's flat.
 */
@Injectable()
export class Outbox {
  private rows: OutboundText[] = [];

  constructor(private readonly sender: SmsSender) {}

  queue(text: { readonly to: string; readonly body: string }, now: Date): void {
    this.rows.push({
      toPhoneHash: hashPhone(text.to),
      to: text.to,
      body: text.body,
      queuedAt: now,
      sentAt: null,
      attempts: 0,
    });
  }

  /**
   * Send what is waiting. Called by whoever runs the server's clock; a test
   * calls it directly. A sent row forgets its number; a refused row is tried
   * again next time, and dropped — number and all — after the last attempt.
   */
  async drain(now: Date): Promise<{ sent: number; dropped: number }> {
    let sent = 0;
    let dropped = 0;
    const kept: OutboundText[] = [];
    for (const row of this.rows) {
      if (row.sentAt !== null || row.to === null) {
        kept.push(row);
        continue;
      }
      const ok = await this.sender.send(row.to, row.body);
      if (ok) {
        kept.push({ ...row, to: null, sentAt: now });
        sent++;
      } else if (row.attempts + 1 >= MAX_SEND_ATTEMPTS) {
        dropped++;
      } else {
        kept.push({ ...row, attempts: row.attempts + 1 });
      }
    }
    this.rows = kept;
    return { sent, dropped };
  }

  /** In-process only. Rows with the number redacted: a reader of this list learns who was written to, never where. */
  pending(): readonly Omit<OutboundText, 'to'>[] {
    return this.rows.filter((r) => r.sentAt === null).map(redacted);
  }

  /** Every row, number redacted, for a test to search. */
  record(): readonly Omit<OutboundText, 'to'>[] {
    return this.rows.map(redacted);
  }

  /** How many plaintext numbers this process holds right now. The figure `/healthz` could say. */
  get numbersHeld(): number {
    return this.rows.filter((r) => r.to !== null).length;
  }

  get depth(): number {
    return this.pending().length;
  }
}

/** The row without its number. */
function redacted(row: OutboundText): Omit<OutboundText, 'to'> {
  return { toPhoneHash: row.toPhoneHash, body: row.body, queuedAt: row.queuedAt, sentAt: row.sentAt, attempts: row.attempts };
}
