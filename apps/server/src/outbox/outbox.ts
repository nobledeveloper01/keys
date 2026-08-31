import { Injectable, Logger } from '@nestjs/common';

export interface OutboundText {
  readonly toPhoneHash: string;
  readonly body: string;
  readonly queuedAt: Date;
}

/**
 * Texts this server owes, and cannot yet send.
 *
 * There is no SMS provider until phase 3, and the honest thing to do about
 * that is queue the message and say so — not to hand the code back in the
 * response, which is the shortcut that would quietly turn every landlord
 * confirmation into a self-confirmation.
 *
 * Deliberately has no controller. Nothing in this product exposes an outbox
 * over HTTP, in any role, because a one-time code sitting in a queue is a
 * one-time code, and a reviewer who can read it is a reviewer who can grant
 * authority over a stranger's flat.
 */
@Injectable()
export class Outbox {
  private readonly queued: OutboundText[] = [];

  private readonly log = new Logger(Outbox.name);

  queue(text: Omit<OutboundText, 'queuedAt'>, now: Date): void {
    this.queued.push({ ...text, queuedAt: now });

    /*
      A development sink, and both halves of the guard are load-bearing.

      Without an SMS provider nobody — including the people building this — can
      complete a landlord confirmation, which means the flow cannot be
      exercised, demonstrated, or QA'd at all. That is not a reason to hand the
      code back in the response: that shortcut turns every landlord
      confirmation into a self-confirmation permanently, in production, for
      real users.

      So the code goes to the server's own log, only when somebody has set
      KEYS_SMS_LOG deliberately, and never when NODE_ENV says production. A
      one-time code in a log line is a genuine risk — logs get shipped,
      aggregated, and read by people who should not be able to grant authority
      over a stranger's flat — and the price of that risk is a flow nobody can
      test, so it is paid only on a machine somebody is sitting at.
    */
    if (process.env.KEYS_SMS_LOG === '1' && process.env.NODE_ENV !== 'production') {
      this.log.warn(`[dev sms] to ${text.toPhoneHash.slice(0, 12)}…  ${text.body}`);
    }
  }

  /** In-process only. Phase 3's sender drains this; no route reaches it. */
  pending(): readonly OutboundText[] {
    return this.queued;
  }

  get depth(): number {
    return this.queued.length;
  }
}
