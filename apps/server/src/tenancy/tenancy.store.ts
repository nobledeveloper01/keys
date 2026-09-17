import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';

import type { Acknowledgement, Agreement, ConditionRecord, Tenancy, TenancyEntry, Ticket, TicketEvent } from '@keys/domain';

type Await<T> = Promise<T> | T;

/**
 * The tenancy record (ADR-0009, ADR-0012): agreements, the entries appended
 * to them, tickets and their events, condition records and their
 * acknowledgements. Nothing here has an update path. The domain folds these
 * into what a screen shows; the store only keeps them in order.
 */
export interface TenantKey {
  readonly tenantId: string;
  readonly publicKey: string;
  readonly registeredAt: Date;
}

export interface StoredRecord {
  readonly record: ConditionRecord;
  readonly acknowledgements: readonly Acknowledgement[];
}

export abstract class TenancyStore {
  abstract createTenancy(agreement: Agreement): Await<Tenancy>;
  abstract tenancy(id: string): Await<Tenancy | null>;
  abstract tenanciesForTenant(tenantId: string): Await<readonly Tenancy[]>;
  abstract tenanciesForLetting(lettingId: string): Await<readonly Tenancy[]>;
  /** Appends; the caller has already asked the domain whether it may. */
  abstract append(tenancyId: string, entry: TenancyEntry): Await<Tenancy>;

  abstract registerTenantKey(tenantId: string, publicKey: string, now: Date): Await<void>;
  abstract tenantKey(tenantId: string): Await<TenantKey | null>;

  abstract createTicket(ticket: Ticket): Await<Ticket>;
  abstract ticket(id: string): Await<Ticket | null>;
  abstract ticketsForTenancy(tenancyId: string): Await<readonly Ticket[]>;
  abstract appendTicketEvent(ticketId: string, event: TicketEvent): Await<Ticket>;

  abstract createRecord(record: ConditionRecord): Await<StoredRecord>;
  /** Replaces a draft's rooms; refused by the caller once anybody has acknowledged. */
  abstract replaceRecord(record: ConditionRecord): Await<StoredRecord>;
  abstract record(id: string): Await<StoredRecord | null>;
  abstract recordsForTenancy(tenancyId: string): Await<readonly StoredRecord[]>;
  abstract acknowledge(recordId: string, ack: Acknowledgement): Await<StoredRecord>;

  newId(): string {
    return randomUUID();
  }
}

@Injectable()
export class MemoryTenancyStore extends TenancyStore {
  private readonly tenancies = new Map<string, Tenancy>();
  private readonly keys = new Map<string, TenantKey>();
  private readonly tickets = new Map<string, Ticket>();
  private readonly records = new Map<string, StoredRecord>();

  createTenancy(agreement: Agreement): Tenancy {
    const t: Tenancy = { id: this.newId(), agreement, entries: [] };
    this.tenancies.set(t.id, t);
    return t;
  }
  tenancy(id: string) {
    return this.tenancies.get(id) ?? null;
  }
  tenanciesForTenant(tenantId: string) {
    return [...this.tenancies.values()].filter((t) => t.agreement.tenantId === tenantId);
  }
  tenanciesForLetting(lettingId: string) {
    return [...this.tenancies.values()].filter((t) => t.agreement.lettingId === lettingId);
  }
  append(tenancyId: string, entry: TenancyEntry): Tenancy {
    const t = this.tenancies.get(tenancyId);
    if (!t) throw new Error('no such tenancy');
    const next = { ...t, entries: [...t.entries, entry] };
    this.tenancies.set(tenancyId, next);
    return next;
  }
  registerTenantKey(tenantId: string, publicKey: string, now: Date) {
    this.keys.set(tenantId, { tenantId, publicKey, registeredAt: now });
  }
  tenantKey(tenantId: string) {
    return this.keys.get(tenantId) ?? null;
  }
  createTicket(ticket: Ticket) {
    this.tickets.set(ticket.id, ticket);
    return ticket;
  }
  ticket(id: string) {
    return this.tickets.get(id) ?? null;
  }
  ticketsForTenancy(tenancyId: string) {
    return [...this.tickets.values()].filter((k) => k.tenancyId === tenancyId);
  }
  appendTicketEvent(ticketId: string, event: TicketEvent): Ticket {
    const k = this.tickets.get(ticketId);
    if (!k) throw new Error('no such ticket');
    const next = { ...k, events: [...k.events, event] };
    this.tickets.set(ticketId, next);
    return next;
  }
  createRecord(record: ConditionRecord): StoredRecord {
    const s = { record, acknowledgements: [] };
    this.records.set(record.id, s);
    return s;
  }
  replaceRecord(record: ConditionRecord): StoredRecord {
    const prev = this.records.get(record.id);
    const s = { record, acknowledgements: prev?.acknowledgements ?? [] };
    this.records.set(record.id, s);
    return s;
  }
  record(id: string) {
    return this.records.get(id) ?? null;
  }
  recordsForTenancy(tenancyId: string) {
    return [...this.records.values()].filter((r) => r.record.tenancyId === tenancyId);
  }
  acknowledge(recordId: string, ack: Acknowledgement): StoredRecord {
    const s = this.records.get(recordId);
    if (!s) throw new Error('no such record');
    const next = { record: s.record, acknowledgements: [...s.acknowledgements, ack] };
    this.records.set(recordId, next);
    return next;
  }
}
