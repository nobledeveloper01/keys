import { randomBytes, randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';

import {
  offerContact,
  type Conversation,
  type ExchangeState,
  type Inspection,
  type InspectionState,
  type Outcome,
  type Speaker,
  type Suspension,
} from '@keys/domain';

import { hashPhone } from '../reports/reports.store';

/**
 * Somebody looking for a flat.
 *
 * A separate account from an agent, not a role on one. Merging them would put
 * a tenant one KYC check away from being able to list, and the whole tier
 * ladder rests on an agent account being a thing somebody deliberately opened.
 */
export interface StoredTenant {
  readonly id: string;
  readonly displayName: string;
  /** Hashed, like every phone number in this product. */
  readonly phoneHash: string;
  readonly joinedAt: Date;
}

export interface StoredMessage {
  readonly id: string;
  readonly conversationId: string;
  readonly speaker: Speaker;
  readonly body: string;
  readonly sentAt: Date;
}

/**
 * A conversation, plus the numbers each side has offered.
 *
 * The numbers are here rather than on the accounts. See `Conversation` in the
 * domain for why — briefly: every phone in this product is a hash because the
 * only thing done with one is match it, and a number that has to be *revealed*
 * belongs in the one place whose purpose is revealing it once.
 */
export interface StoredConversation extends Conversation {
  readonly tenantContact: string | null;
  readonly agentContact: string | null;
}

export abstract class MarketStore {
  abstract createTenant(input: {
    displayName: string;
    phone: string;
    now: Date;
  }): Await<{ tenant: StoredTenant; token: string }>;

  abstract tenantByToken(token: string): Await<StoredTenant | null>;
  abstract tenantById(id: string): Await<StoredTenant | null>;

  /**
   * Start talking about a listing, or return the conversation already open.
   *
   * Idempotent per (tenant, listing) on purpose. A tenant who taps twice does
   * not get two threads, and an agent does not get the same person twice in
   * their list — which is both a nuisance and, at scale, a way to flood
   * somebody's inbox with one account.
   */
  abstract openConversation(input: {
    listingId: string;
    tenantId: string;
    agentId: string;
    now: Date;
  }): Await<StoredConversation>;

  abstract conversation(id: string): Await<StoredConversation | null>;
  abstract conversationsForTenant(tenantId: string): Await<readonly StoredConversation[]>;
  abstract conversationsForAgent(agentId: string): Await<readonly StoredConversation[]>;

  abstract say(input: {
    conversationId: string;
    speaker: Speaker;
    body: string;
    now: Date;
  }): Await<StoredMessage>;

  abstract messages(conversationId: string): Await<readonly StoredMessage[]>;

  /**
   * Offer your number.
   *
   * The state transition is the domain's `offerContact`; this only stores what
   * it decided and the number itself. Nothing else in the server computes an
   * exchange state, so there is no second opinion about whether two people
   * agreed.
   */
  abstract offer(input: {
    conversationId: string;
    by: 'tenant' | 'agent';
    contact: string;
  }): Await<StoredConversation | null>;

  /** Take back an offer nobody has answered. Deletes the number. */
  abstract withdrawOffer(input: {
    conversationId: string;
    by: 'tenant' | 'agent';
  }): Await<StoredConversation | null>;

  abstract requestInspection(input: {
    conversationId: string;
    listingId: string;
    tenantId: string;
    now: Date;
  }): Await<Inspection>;

  abstract answerInspection(input: {
    id: string;
    agentId: string;
    state: Extract<InspectionState, 'agreed' | 'declined'>;
    feeKobo: number;
  }): Await<Inspection | null>;

  abstract inspection(id: string): Await<Inspection | null>;
  abstract inspectionsForTenant(tenantId: string): Await<readonly Inspection[]>;

  /**
   * By listing, not by agent.
   *
   * This store does not know who owns a listing — the agents store does — and
   * a copy of that ownership here would be a second answer to a question that
   * already has one. The caller passes the ids it is entitled to.
   */
  abstract inspectionsForListings(listingIds: readonly string[]): Await<readonly Inspection[]>;

  abstract recordOutcome(input: {
    id: string;
    tenantId: string;
    outcome: Outcome;
    now: Date;
  }): Await<Inspection | null>;

  /** Every unlifted suspension against a listing. */
  abstract suspensionsFor(listingId: string): Await<readonly Suspension[]>;
  abstract suspend(input: { listingId: string; reportedBy: string; now: Date }): Await<void>;
  abstract liftSuspensions(input: { listingId: string; at: Date }): Await<void>;
}

type Await<T> = T | Promise<T>;

function hashToken(token: string): string {
  return hashPhone(token);
}

/** The in-memory store. Same behaviour as Postgres, no persistence. */
@Injectable()
export class MemoryMarketStore extends MarketStore {
  private readonly tenants = new Map<string, StoredTenant>();
  private readonly tokens = new Map<string, string>();
  private readonly conversations = new Map<string, StoredConversation>();
  private readonly said: StoredMessage[] = [];
  private readonly inspections = new Map<string, Inspection>();
  private readonly suspensions: Suspension[] = [];

  createTenant(input: { displayName: string; phone: string; now: Date }) {
    const tenant: StoredTenant = {
      id: randomUUID(),
      displayName: input.displayName,
      phoneHash: hashPhone(input.phone),
      joinedAt: input.now,
    };
    this.tenants.set(tenant.id, tenant);
    const token = randomBytes(32).toString('hex');
    this.tokens.set(hashToken(token), tenant.id);
    return { tenant, token };
  }

  tenantByToken(token: string) {
    const id = this.tokens.get(hashToken(token));
    return id ? (this.tenants.get(id) ?? null) : null;
  }

  tenantById(id: string) {
    return this.tenants.get(id) ?? null;
  }

  openConversation(input: { listingId: string; tenantId: string; agentId: string; now: Date }) {
    const already = [...this.conversations.values()].find(
      (c) => c.listingId === input.listingId && c.tenantId === input.tenantId,
    );
    if (already) return already;

    const conversation: StoredConversation = {
      id: randomUUID(),
      listingId: input.listingId,
      tenantId: input.tenantId,
      agentId: input.agentId,
      exchange: 'none',
      startedAt: input.now,
      tenantContact: null,
      agentContact: null,
    };
    this.conversations.set(conversation.id, conversation);
    return conversation;
  }

  conversation(id: string) {
    return this.conversations.get(id) ?? null;
  }

  conversationsForTenant(tenantId: string) {
    return [...this.conversations.values()].filter((c) => c.tenantId === tenantId);
  }

  conversationsForAgent(agentId: string) {
    return [...this.conversations.values()].filter((c) => c.agentId === agentId);
  }

  say(input: { conversationId: string; speaker: Speaker; body: string; now: Date }) {
    const message: StoredMessage = {
      id: randomUUID(),
      conversationId: input.conversationId,
      speaker: input.speaker,
      body: input.body,
      sentAt: input.now,
    };
    this.said.push(message);
    return message;
  }

  messages(conversationId: string) {
    return this.said.filter((m) => m.conversationId === conversationId);
  }

  offer(input: { conversationId: string; by: 'tenant' | 'agent'; contact: string }) {
    const conversation = this.conversations.get(input.conversationId);
    if (!conversation) return null;
    const exchange: ExchangeState = offerContact(conversation.exchange, input.by);
    const next: StoredConversation = {
      ...conversation,
      exchange,
      ...(input.by === 'tenant'
        ? { tenantContact: input.contact }
        : { agentContact: input.contact }),
    };
    this.conversations.set(next.id, next);
    return next;
  }

  withdrawOffer(input: { conversationId: string; by: 'tenant' | 'agent' }) {
    const conversation = this.conversations.get(input.conversationId);
    if (!conversation) return null;
    const next: StoredConversation = {
      ...conversation,
      exchange: 'none',
      // The number goes, not just the flag. A withdrawn offer that left the
      // digits in the row would be a withdrawal in name only.
      ...(input.by === 'tenant' ? { tenantContact: null } : { agentContact: null }),
    };
    this.conversations.set(next.id, next);
    return next;
  }

  requestInspection(input: {
    conversationId: string;
    listingId: string;
    tenantId: string;
    now: Date;
  }) {
    const inspection: Inspection = {
      id: randomUUID(),
      listingId: input.listingId,
      tenantId: input.tenantId,
      state: 'requested',
      // Nothing is declared until the agent answers with a figure.
      feeKobo: 0,
      outcome: null,
    };
    this.inspections.set(inspection.id, inspection);
    return inspection;
  }

  answerInspection(input: {
    id: string;
    agentId: string;
    state: 'agreed' | 'declined';
    feeKobo: number;
  }) {
    const inspection = this.inspections.get(input.id);
    if (!inspection) return null;
    const next: Inspection = { ...inspection, state: input.state, feeKobo: input.feeKobo };
    this.inspections.set(next.id, next);
    return next;
  }

  inspection(id: string) {
    return this.inspections.get(id) ?? null;
  }

  inspectionsForTenant(tenantId: string) {
    return [...this.inspections.values()].filter((i) => i.tenantId === tenantId);
  }

  inspectionsForListings(listingIds: readonly string[]) {
    const wanted = new Set(listingIds);
    return [...this.inspections.values()].filter((i) => wanted.has(i.listingId));
  }

  recordOutcome(input: { id: string; tenantId: string; outcome: Outcome; now: Date }) {
    const inspection = this.inspections.get(input.id);
    if (!inspection || inspection.tenantId !== input.tenantId) return null;
    const next: Inspection = { ...inspection, state: 'done', outcome: input.outcome };
    this.inspections.set(next.id, next);
    return next;
  }

  suspensionsFor(listingId: string) {
    return this.suspensions.filter((s) => s.listingId === listingId && s.liftedAt === null);
  }

  suspend(input: { listingId: string; reportedBy: string; now: Date }) {
    this.suspensions.push({
      listingId: input.listingId,
      reportedBy: input.reportedBy,
      at: input.now,
      liftedAt: null,
    });
  }

  liftSuspensions(input: { listingId: string; at: Date }) {
    for (let i = 0; i < this.suspensions.length; i += 1) {
      const s = this.suspensions[i]!;
      if (s.listingId === input.listingId && s.liftedAt === null) {
        this.suspensions[i] = { ...s, liftedAt: input.at };
      }
    }
  }
}
