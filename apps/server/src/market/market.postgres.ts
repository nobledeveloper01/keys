import { randomBytes, randomUUID } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Pool } from 'pg';

import {
  offerContact,
  type Inspection,
  type InspectionState,
  type Outcome,
  type Speaker,
  type Suspension,
} from '@keys/domain';

import { hashPhone } from '../reports/reports.store';
import { MarketStore, type StoredConversation, type StoredMessage, type StoredTenant } from './market.store';

interface ConversationRow {
  id: string;
  listing_id: string;
  tenant_id: string;
  agent_id: string;
  exchange: string;
  started_at: Date;
  tenant_contact: string | null;
  agent_contact: string | null;
}

interface InspectionRow {
  id: string;
  listing_id: string;
  tenant_id: string;
  state: string;
  fee_kobo: string;
  outcome: string | null;
}

const CONVERSATION_COLUMNS =
  'id, listing_id, tenant_id, agent_id, exchange, started_at, tenant_contact, agent_contact';
const INSPECTION_COLUMNS = 'id, listing_id, tenant_id, state, fee_kobo, outcome';

/** Anything that is not a uuid cannot be a row, and must not reach the query. */
const UUID = /^[0-9a-f-]{36}$/i;

@Injectable()
export class PostgresMarketStore extends MarketStore implements OnModuleInit, OnModuleDestroy {
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

  async createTenant(input: { displayName: string; phone: string; now: Date }) {
    const tenant: StoredTenant = {
      id: randomUUID(),
      displayName: input.displayName,
      phoneHash: hashPhone(input.phone),
      joinedAt: input.now,
    };
    const token = randomBytes(32).toString('hex');
    await this.pool.query(
      'INSERT INTO tenants (id, name, phone_hash, joined_at) VALUES ($1,$2,$3,$4)',
      [tenant.id, tenant.displayName, tenant.phoneHash, tenant.joinedAt],
    );
    await this.pool.query(
      'INSERT INTO tenant_tokens (token_hash, tenant_id) VALUES ($1,$2)',
      [hashPhone(token), tenant.id],
    );
    return { tenant, token };
  }

  async tenantByToken(token: string) {
    const { rows } = await this.pool.query<{
      id: string;
      name: string;
      phone_hash: string;
      joined_at: Date;
    }>(
      `SELECT t.id, t.name, t.phone_hash, t.joined_at
         FROM tenants t JOIN tenant_tokens k ON k.tenant_id = t.id
        WHERE k.token_hash = $1`,
      [hashPhone(token)],
    );
    return rows[0] ? this.hydrateTenant(rows[0]) : null;
  }

  async tenantById(id: string) {
    if (!UUID.test(id)) return null;
    const { rows } = await this.pool.query<{
      id: string;
      name: string;
      phone_hash: string;
      joined_at: Date;
    }>('SELECT id, name, phone_hash, joined_at FROM tenants WHERE id = $1', [id]);
    return rows[0] ? this.hydrateTenant(rows[0]) : null;
  }

  private hydrateTenant(row: {
    id: string;
    name: string;
    phone_hash: string;
    joined_at: Date;
  }): StoredTenant {
    return {
      id: row.id,
      displayName: row.name,
      phoneHash: row.phone_hash,
      joinedAt: row.joined_at,
    };
  }

  async openConversation(input: {
    listingId: string;
    tenantId: string;
    agentId: string;
    now: Date;
  }) {
    /*
      The unique constraint does the deduplication, not a read-then-write.

      Checking for an existing thread and inserting if there is none is two
      statements with a gap in the middle, and two taps land in that gap. The
      constraint is in the schema, so `ON CONFLICT` is the only version that is
      true under concurrency.
    */
    const { rows } = await this.pool.query<ConversationRow>(
      `INSERT INTO conversations (id, listing_id, tenant_id, agent_id, started_at)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (listing_id, tenant_id) DO UPDATE SET listing_id = EXCLUDED.listing_id
       RETURNING ${CONVERSATION_COLUMNS}`,
      [randomUUID(), input.listingId, input.tenantId, input.agentId, input.now],
    );
    return this.hydrateConversation(rows[0]!);
  }

  private hydrateConversation(row: ConversationRow): StoredConversation {
    return {
      id: row.id,
      listingId: row.listing_id,
      tenantId: row.tenant_id,
      agentId: row.agent_id,
      exchange: row.exchange as StoredConversation['exchange'],
      startedAt: row.started_at,
      tenantContact: row.tenant_contact,
      agentContact: row.agent_contact,
    };
  }

  async conversation(id: string) {
    if (!UUID.test(id)) return null;
    const { rows } = await this.pool.query<ConversationRow>(
      `SELECT ${CONVERSATION_COLUMNS} FROM conversations WHERE id = $1`,
      [id],
    );
    return rows[0] ? this.hydrateConversation(rows[0]) : null;
  }

  async conversationsForTenant(tenantId: string) {
    if (!UUID.test(tenantId)) return [];
    const { rows } = await this.pool.query<ConversationRow>(
      `SELECT ${CONVERSATION_COLUMNS} FROM conversations WHERE tenant_id = $1 ORDER BY started_at`,
      [tenantId],
    );
    return rows.map((r) => this.hydrateConversation(r));
  }

  async conversationsForAgent(agentId: string) {
    if (!UUID.test(agentId)) return [];
    const { rows } = await this.pool.query<ConversationRow>(
      `SELECT ${CONVERSATION_COLUMNS} FROM conversations WHERE agent_id = $1 ORDER BY started_at`,
      [agentId],
    );
    return rows.map((r) => this.hydrateConversation(r));
  }

  async say(input: { conversationId: string; speaker: Speaker; body: string; now: Date }) {
    const message: StoredMessage = {
      id: randomUUID(),
      conversationId: input.conversationId,
      speaker: input.speaker,
      body: input.body,
      sentAt: input.now,
    };
    await this.pool.query(
      'INSERT INTO messages (id, conversation_id, speaker, body, sent_at) VALUES ($1,$2,$3,$4,$5)',
      [message.id, message.conversationId, message.speaker, message.body, message.sentAt],
    );
    return message;
  }

  async messages(conversationId: string) {
    if (!UUID.test(conversationId)) return [];
    const { rows } = await this.pool.query<{
      id: string;
      conversation_id: string;
      speaker: string;
      body: string;
      sent_at: Date;
    }>(
      'SELECT id, conversation_id, speaker, body, sent_at FROM messages WHERE conversation_id = $1 ORDER BY sent_at, id',
      [conversationId],
    );
    return rows.map((r) => ({
      id: r.id,
      conversationId: r.conversation_id,
      speaker: r.speaker as Speaker,
      body: r.body,
      sentAt: r.sent_at,
    }));
  }

  async offer(input: { conversationId: string; by: 'tenant' | 'agent'; contact: string }) {
    const current = await this.conversation(input.conversationId);
    if (!current) return null;
    const exchange = offerContact(current.exchange, input.by);
    const column = input.by === 'tenant' ? 'tenant_contact' : 'agent_contact';
    const { rows } = await this.pool.query<ConversationRow>(
      `UPDATE conversations SET exchange = $2, ${column} = $3 WHERE id = $1
       RETURNING ${CONVERSATION_COLUMNS}`,
      [input.conversationId, exchange, input.contact],
    );
    return rows[0] ? this.hydrateConversation(rows[0]) : null;
  }

  async withdrawOffer(input: { conversationId: string; by: 'tenant' | 'agent' }) {
    const column = input.by === 'tenant' ? 'tenant_contact' : 'agent_contact';
    // NULL, not a flag. A withdrawal that left the digits in the row would be
    // a withdrawal in name only.
    const { rows } = await this.pool.query<ConversationRow>(
      `UPDATE conversations SET exchange = 'none', ${column} = NULL WHERE id = $1
       RETURNING ${CONVERSATION_COLUMNS}`,
      [input.conversationId],
    );
    return rows[0] ? this.hydrateConversation(rows[0]) : null;
  }

  async requestInspection(input: {
    conversationId: string;
    listingId: string;
    tenantId: string;
    now: Date;
  }) {
    const { rows } = await this.pool.query<InspectionRow>(
      `INSERT INTO inspections (id, listing_id, tenant_id, created_at)
       VALUES ($1,$2,$3,$4) RETURNING ${INSPECTION_COLUMNS}`,
      [randomUUID(), input.listingId, input.tenantId, input.now],
    );
    return this.hydrateInspection(rows[0]!);
  }

  private hydrateInspection(row: InspectionRow): Inspection {
    return {
      id: row.id,
      listingId: row.listing_id,
      tenantId: row.tenant_id,
      state: row.state as InspectionState,
      // BIGINT arrives as a string; the driver will not guess at a double.
      feeKobo: Number(row.fee_kobo),
      outcome: row.outcome as Outcome | null,
    };
  }

  async answerInspection(input: {
    id: string;
    agentId: string;
    state: 'agreed' | 'declined';
    feeKobo: number;
  }) {
    if (!UUID.test(input.id)) return null;
    const { rows } = await this.pool.query<InspectionRow>(
      `UPDATE inspections SET state = $2, fee_kobo = $3 WHERE id = $1
       RETURNING ${INSPECTION_COLUMNS}`,
      [input.id, input.state, input.feeKobo],
    );
    return rows[0] ? this.hydrateInspection(rows[0]) : null;
  }

  async inspection(id: string) {
    if (!UUID.test(id)) return null;
    const { rows } = await this.pool.query<InspectionRow>(
      `SELECT ${INSPECTION_COLUMNS} FROM inspections WHERE id = $1`,
      [id],
    );
    return rows[0] ? this.hydrateInspection(rows[0]) : null;
  }

  async inspectionsForTenant(tenantId: string) {
    if (!UUID.test(tenantId)) return [];
    const { rows } = await this.pool.query<InspectionRow>(
      `SELECT ${INSPECTION_COLUMNS} FROM inspections WHERE tenant_id = $1 ORDER BY created_at`,
      [tenantId],
    );
    return rows.map((r) => this.hydrateInspection(r));
  }

  async inspectionsForListings(listingIds: readonly string[]) {
    const ids = listingIds.filter((id) => UUID.test(id));
    if (ids.length === 0) return [];
    const { rows } = await this.pool.query<InspectionRow>(
      `SELECT ${INSPECTION_COLUMNS} FROM inspections WHERE listing_id = ANY($1) ORDER BY created_at`,
      [ids],
    );
    return rows.map((r) => this.hydrateInspection(r));
  }

  async recordOutcome(input: { id: string; tenantId: string; outcome: Outcome; now: Date }) {
    if (!UUID.test(input.id)) return null;
    /*
      The tenant is in the WHERE clause, not checked beforehand.

      A read, a comparison and then a write is three statements a concurrent
      request can land between. Making ownership part of the update means the
      row either belongs to them at the moment it changes or does not change.
    */
    const { rows } = await this.pool.query<InspectionRow>(
      `UPDATE inspections SET state = 'done', outcome = $3
        WHERE id = $1 AND tenant_id = $2 AND outcome IS NULL
       RETURNING ${INSPECTION_COLUMNS}`,
      [input.id, input.tenantId, input.outcome],
    );
    return rows[0] ? this.hydrateInspection(rows[0]) : null;
  }

  async suspensionsFor(listingId: string) {
    if (!UUID.test(listingId)) return [];
    const { rows } = await this.pool.query<{
      listing_id: string;
      reported_by: string;
      at: Date;
      lifted_at: Date | null;
    }>(
      'SELECT listing_id, reported_by, at, lifted_at FROM suspensions WHERE listing_id = $1 AND lifted_at IS NULL',
      [listingId],
    );
    return rows.map(
      (r): Suspension => ({
        listingId: r.listing_id,
        reportedBy: r.reported_by,
        at: r.at,
        liftedAt: r.lifted_at,
      }),
    );
  }

  async suspend(input: { listingId: string; reportedBy: string; now: Date }) {
    await this.pool.query(
      'INSERT INTO suspensions (listing_id, reported_by, at) VALUES ($1,$2,$3)',
      [input.listingId, input.reportedBy, input.now],
    );
  }

  async liftSuspensions(input: { listingId: string; at: Date }) {
    await this.pool.query(
      'UPDATE suspensions SET lifted_at = $2 WHERE listing_id = $1 AND lifted_at IS NULL',
      [input.listingId, input.at],
    );
  }
}
