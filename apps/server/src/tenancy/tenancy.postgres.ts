import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Pool } from 'pg';

import type { Acknowledgement, Agreement, ConditionRecord, RentPeriod, Tenancy, TenancyEntry, Ticket, TicketEvent } from '@keys/domain';

import { TenancyStore, type StoredRecord, type TenantKey } from './tenancy.store';

/**
 * The same record, durable. Entries and events are JSON in order — the
 * domain folds them and the store does not interpret them — and the
 * agreement's blanks are columns so a query can find a tenancy by party.
 * There is no amount column anywhere a balance could be summed from by
 * accident; the arithmetic is the domain's.
 */
interface TenancyRow {
  id: string;
  property_id: string;
  tenant_id: string;
  letting_id: string;
  template_version: string;
  rent_kobo: string;
  period: string;
  periods: number;
  caution_deposit_kobo: string;
  starts_on: Date;
}

interface RecordRow {
  id: string;
  tenancy_id: string;
  walk: string;
  compares_to: string | null;
  rooms: ConditionRecord['rooms'];
  taken_at: Date;
}

const UUID = /^[0-9a-f-]{36}$/i;

/** Dates come back from JSON as strings; every entry kind names its own. */
function reviveEntry(e: Record<string, unknown>): TenancyEntry {
  const out = { ...e, at: new Date(e.at as string) } as Record<string, unknown>;
  if (typeof e.receivedOn === 'string') out.receivedOn = new Date(e.receivedOn);
  return out as unknown as TenancyEntry;
}
function reviveEvent(e: Record<string, unknown>): TicketEvent {
  return { ...e, at: new Date(e.at as string) } as unknown as TicketEvent;
}

@Injectable()
export class PostgresTenancyStore extends TenancyStore implements OnModuleInit, OnModuleDestroy {
  private readonly pool: Pool;

  constructor() {
    super();
    this.pool = new Pool({ connectionString: process.env.KEYS_DATABASE_URL, max: 8 });
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

  private async entries(id: string): Promise<TenancyEntry[]> {
    const r = await this.pool.query<{ entry: Record<string, unknown> }>('SELECT entry FROM tenancy_entries WHERE tenancy_id = $1 ORDER BY seq', [id]);
    return r.rows.map((row) => reviveEntry(row.entry));
  }

  private async fromRow(row: TenancyRow): Promise<Tenancy> {
    const agreement: Agreement = {
      templateVersion: row.template_version,
      propertyId: row.property_id,
      tenantId: row.tenant_id,
      lettingId: row.letting_id,
      rentKobo: Number(row.rent_kobo),
      period: row.period as RentPeriod,
      periods: row.periods,
      cautionDepositKobo: Number(row.caution_deposit_kobo),
      startsOn: new Date(row.starts_on),
    };
    return { id: row.id, agreement, entries: await this.entries(row.id) };
  }

  async createTenancy(agreement: Agreement): Promise<Tenancy> {
    const id = this.newId();
    await this.pool.query(
      'INSERT INTO tenancies (id, property_id, tenant_id, letting_id, template_version, rent_kobo, period, periods, caution_deposit_kobo, starts_on) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',
      [id, agreement.propertyId, agreement.tenantId, agreement.lettingId, agreement.templateVersion, agreement.rentKobo, agreement.period, agreement.periods, agreement.cautionDepositKobo, agreement.startsOn],
    );
    return { id, agreement, entries: [] };
  }

  async tenancy(id: string): Promise<Tenancy | null> {
    if (!UUID.test(id)) return null;
    const r = await this.pool.query<TenancyRow>('SELECT * FROM tenancies WHERE id = $1', [id]);
    return r.rows[0] ? this.fromRow(r.rows[0]) : null;
  }

  private async byColumn(column: 'tenant_id' | 'letting_id', value: string): Promise<Tenancy[]> {
    const r = await this.pool.query<TenancyRow>(`SELECT * FROM tenancies WHERE ${column} = $1 ORDER BY starts_on`, [value]);
    return Promise.all(r.rows.map((row) => this.fromRow(row)));
  }
  tenanciesForTenant(tenantId: string) {
    return this.byColumn('tenant_id', tenantId);
  }
  tenanciesForLetting(lettingId: string) {
    return this.byColumn('letting_id', lettingId);
  }

  async append(tenancyId: string, entry: TenancyEntry): Promise<Tenancy> {
    await this.pool.query('INSERT INTO tenancy_entries (tenancy_id, entry) VALUES ($1, $2)', [tenancyId, JSON.stringify(entry)]);
    const t = await this.tenancy(tenancyId);
    if (!t) throw new Error('no such tenancy');
    return t;
  }

  async registerTenantKey(tenantId: string, publicKey: string, now: Date): Promise<void> {
    await this.pool.query(
      'INSERT INTO tenant_keys (tenant_id, public_key, registered_at) VALUES ($1,$2,$3) ON CONFLICT (tenant_id) DO UPDATE SET public_key = EXCLUDED.public_key, registered_at = EXCLUDED.registered_at',
      [tenantId, publicKey, now],
    );
  }
  async tenantKey(tenantId: string): Promise<TenantKey | null> {
    const r = await this.pool.query<{ tenant_id: string; public_key: string; registered_at: Date }>('SELECT * FROM tenant_keys WHERE tenant_id = $1', [tenantId]);
    const row = r.rows[0];
    return row ? { tenantId: row.tenant_id, publicKey: row.public_key, registeredAt: new Date(row.registered_at) } : null;
  }

  private async events(ticketId: string): Promise<TicketEvent[]> {
    const r = await this.pool.query<{ event: Record<string, unknown> }>('SELECT event FROM ticket_events WHERE ticket_id = $1 ORDER BY seq', [ticketId]);
    return r.rows.map((row) => reviveEvent(row.event));
  }
  async createTicket(ticket: Ticket): Promise<Ticket> {
    await this.pool.query('INSERT INTO tickets (id, tenancy_id) VALUES ($1,$2)', [ticket.id, ticket.tenancyId]);
    for (const e of ticket.events) await this.pool.query('INSERT INTO ticket_events (ticket_id, event) VALUES ($1,$2)', [ticket.id, JSON.stringify(e)]);
    return ticket;
  }
  async ticket(id: string): Promise<Ticket | null> {
    if (!UUID.test(id)) return null;
    const r = await this.pool.query<{ id: string; tenancy_id: string }>('SELECT * FROM tickets WHERE id = $1', [id]);
    const row = r.rows[0];
    return row ? { id: row.id, tenancyId: row.tenancy_id, events: await this.events(row.id) } : null;
  }
  async ticketsForTenancy(tenancyId: string): Promise<Ticket[]> {
    const r = await this.pool.query<{ id: string; tenancy_id: string }>('SELECT * FROM tickets WHERE tenancy_id = $1 ORDER BY created_seq', [tenancyId]);
    return Promise.all(r.rows.map(async (row) => ({ id: row.id, tenancyId: row.tenancy_id, events: await this.events(row.id) })));
  }
  async appendTicketEvent(ticketId: string, event: TicketEvent): Promise<Ticket> {
    await this.pool.query('INSERT INTO ticket_events (ticket_id, event) VALUES ($1,$2)', [ticketId, JSON.stringify(event)]);
    const k = await this.ticket(ticketId);
    if (!k) throw new Error('no such ticket');
    return k;
  }

  private async acks(recordId: string): Promise<Acknowledgement[]> {
    const r = await this.pool.query<{ by: string; at: Date; signature: string }>('SELECT * FROM condition_acknowledgements WHERE record_id = $1 ORDER BY seq', [recordId]);
    return r.rows.map((row) => ({ by: row.by, at: new Date(row.at), signature: row.signature }));
  }
  private fromRecordRow(row: RecordRow): ConditionRecord {
    return { id: row.id, tenancyId: row.tenancy_id, walk: row.walk as ConditionRecord['walk'], comparesTo: row.compares_to, rooms: row.rooms, takenAt: new Date(row.taken_at) };
  }
  async createRecord(record: ConditionRecord): Promise<StoredRecord> {
    await this.pool.query('INSERT INTO condition_records (id, tenancy_id, walk, compares_to, rooms, taken_at) VALUES ($1,$2,$3,$4,$5,$6)', [record.id, record.tenancyId, record.walk, record.comparesTo, JSON.stringify(record.rooms), record.takenAt]);
    return { record, acknowledgements: [] };
  }
  async replaceRecord(record: ConditionRecord): Promise<StoredRecord> {
    await this.pool.query('UPDATE condition_records SET rooms = $2, taken_at = $3 WHERE id = $1', [record.id, JSON.stringify(record.rooms), record.takenAt]);
    return { record, acknowledgements: await this.acks(record.id) };
  }
  async record(id: string): Promise<StoredRecord | null> {
    if (!UUID.test(id)) return null;
    const r = await this.pool.query<RecordRow>('SELECT * FROM condition_records WHERE id = $1', [id]);
    const row = r.rows[0];
    return row ? { record: this.fromRecordRow(row), acknowledgements: await this.acks(id) } : null;
  }
  async recordsForTenancy(tenancyId: string): Promise<StoredRecord[]> {
    const r = await this.pool.query<RecordRow>('SELECT * FROM condition_records WHERE tenancy_id = $1 ORDER BY taken_at', [tenancyId]);
    return Promise.all(r.rows.map(async (row) => ({ record: this.fromRecordRow(row), acknowledgements: await this.acks(row.id) })));
  }
  async acknowledge(recordId: string, ack: Acknowledgement): Promise<StoredRecord> {
    await this.pool.query('INSERT INTO condition_acknowledgements (record_id, by, at, signature) VALUES ($1,$2,$3,$4)', [recordId, ack.by, ack.at, ack.signature]);
    const s = await this.record(recordId);
    if (!s) throw new Error('no such record');
    return s;
  }
}
