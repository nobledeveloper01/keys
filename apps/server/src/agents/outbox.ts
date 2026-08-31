import { Injectable } from '@nestjs/common';

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

  queue(text: Omit<OutboundText, 'queuedAt'>, now: Date): void {
    this.queued.push({ ...text, queuedAt: now });
  }

  /** In-process only. Phase 3's sender drains this; no route reaches it. */
  pending(): readonly OutboundText[] {
    return this.queued;
  }

  get depth(): number {
    return this.queued.length;
  }
}
