import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { randomBytes, randomUUID } from 'node:crypto';

import { Injectable, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { Pool, type PoolClient } from 'pg';

import {
  MAX_AGENTS_PER_LANDLORD,
  cascade,
  landlordIsNotTheAgent,
  mayList,
  type Evidence,
} from '@keys/domain';

import { hashPhone } from '../reports/reports.store';
import {
  AUTHORITY_CODE_MINUTES,
  AgentsStore,
  LandlordIsTheAgent,
  LandlordVouchesForTooMany,
  MAX_CODE_ATTEMPTS,
  hashToken,
  type Challenge,
  type ChallengePurpose,
  type Listing,
  type StoredAgent,
} from './agents.store';

interface EvidenceRow {
  agent_id: string;
  kind: string;
  attestor_kind: string;
  attestor_vendor: string | null;
  attestor_reference: string | null;
  attestor_phone_hash: string | null;
  property_id: string | null;
  attested_at: Date;
  revoked_at: Date | null;
}

function hydrate(row: EvidenceRow): Evidence {
  const attestor =
    row.attestor_kind === 'vendor'
      ? ({
          kind: 'vendor' as const,
          vendor: row.attestor_vendor!,
          reference: row.attestor_reference!,
        })
      : row.attestor_kind === 'landlord'
        ? ({ kind: 'landlord' as const, phoneHash: row.attestor_phone_hash! })
        : ({ kind: 'registry' as const });

  return {
    kind: row.kind as Evidence['kind'],
    agentId: row.agent_id,
    attestor,
    at: row.attested_at,
    revokedAt: row.revoked_at,
    propertyId: row.property_id,
  };
}

interface ListingRow {
  id: string;
  agent_id: string;
  property_id: string;
  title: string;
  published_at: Date | null;
  last_confirmed_at: Date | null;
}

const LISTING_COLUMNS =
  'id, agent_id, property_id, title, published_at, last_confirmed_at';

const EVIDENCE_COLUMNS = `
  agent_id, kind, attestor_kind, attestor_vendor, attestor_reference,
  attestor_phone_hash, property_id, attested_at, revoked_at
`;

/**
 * The durable store.
 *
 * The part worth reading is `withdraw`. A revocation and the unpublishing it
 * causes happen in one transaction, and the listings are locked with
 * `FOR UPDATE` before `cascade` decides — otherwise a publish racing the
 * revocation lands after the sweep and the listing stays up under an authority
 * that no longer exists. That race is the whole reason the phase gate says
 * "atomically" rather than "and then".
 */
@Injectable()
export class PostgresAgentsStore extends AgentsStore implements OnModuleInit, OnModuleDestroy {
  readonly durable = true;

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

  async createAgent(input: { displayName: string; phone: string; now: Date }) {
    const token = randomBytes(32).toString('hex');
    const agent: StoredAgent = {
      id: randomUUID(),
      displayName: input.displayName,
      phoneHash: hashPhone(input.phone),
      joinedAt: input.now,
    };
    await this.pool.query(
      `INSERT INTO agents (id, display_name, phone_hash, token_hash, joined_at)
       VALUES ($1,$2,$3,$4,$5)`,
      [agent.id, agent.displayName, agent.phoneHash, hashToken(token), agent.joinedAt],
    );
    return { agent, token };
  }

  private async agentWhere(clause: string, value: string): Promise<StoredAgent | null> {
    const result = await this.pool.query<{
      id: string;
      display_name: string;
      phone_hash: string;
      joined_at: Date;
    }>(
      `SELECT id, display_name, phone_hash, joined_at FROM agents WHERE ${clause} = $1`,
      [value],
    );
    const row = result.rows[0];
    return row
      ? {
          id: row.id,
          displayName: row.display_name,
          phoneHash: row.phone_hash,
          joinedAt: row.joined_at,
        }
      : null;
  }

  async agentByToken(token: string) {
    return this.agentWhere('token_hash', hashToken(token));
  }

  async agentByPhoneHash(hash: string) {
    return this.agentWhere('phone_hash', hash);
  }

  async everyAgent() {
    const result = await this.pool.query<{
      id: string;
      display_name: string;
      phone_hash: string;
      joined_at: Date;
    }>(
      'SELECT id, display_name, phone_hash, joined_at FROM agents ORDER BY joined_at DESC',
    );
    return result.rows.map((row) => ({
      id: row.id,
      displayName: row.display_name,
      phoneHash: row.phone_hash,
      joinedAt: row.joined_at,
    }));
  }

  async agentById(id: string) {
    // The id comes off a URL, so a value that is not a UUID reaches this query
    // routinely. Postgres raises rather than returning nothing, and a lookup
    // for a nonsense id is a 404, not a 500.
    if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
    return this.agentWhere('id', id);
  }

  async evidenceFor(agentId: string) {
    if (!/^[0-9a-f-]{36}$/i.test(agentId)) return [];
    const result = await this.pool.query<EvidenceRow>(
      `SELECT ${EVIDENCE_COLUMNS} FROM agent_evidence WHERE agent_id = $1`,
      [agentId],
    );
    return result.rows.map(hydrate);
  }

  async recordIdentity(input: {
    agentId: string;
    vendor: string;
    reference: string;
    now: Date;
  }) {
    await this.pool.query(
      `INSERT INTO agent_evidence
         (agent_id, kind, attestor_kind, attestor_vendor, attestor_reference, attested_at)
       VALUES ($1,'identity','vendor',$2,$3,$4)`,
      [input.agentId, input.vendor, input.reference, input.now],
    );
  }

  async openChallenge(input: {
    purpose: ChallengePurpose;
    agentId: string;
    propertyId: string;
    landlordPhone: string;
    now: Date;
  }) {
    const landlordPhoneHash = hashPhone(input.landlordPhone);
    const agent = await this.agentById(input.agentId);
    if (
      agent &&
      !landlordIsNotTheAgent({ kind: 'landlord', phoneHash: landlordPhoneHash }, [
        agent.phoneHash,
      ])
    ) {
      throw new LandlordIsTheAgent();
    }

    // The ceiling is on grants only: a landlord who has hit it must still be
    // able to take authority back.
    if (input.purpose === 'grant') {
      const counted = await this.pool.query<{ agent_id: string }>(
        `SELECT DISTINCT agent_id FROM agent_evidence
          WHERE kind = 'authority' AND revoked_at IS NULL AND attestor_phone_hash = $1`,
        [landlordPhoneHash],
      );
      const distinct = new Set(counted.rows.map((r) => r.agent_id));
      distinct.add(input.agentId);
      if (distinct.size > MAX_AGENTS_PER_LANDLORD) throw new LandlordVouchesForTooMany();
    }

    return this.issue(
      input.purpose,
      input.agentId,
      input.propertyId,
      landlordPhoneHash,
      input.now,
    );
  }

  async openWithdrawal(input: { agentId: string; propertyId: string; now: Date }) {
    if (!/^[0-9a-f-]{36}$/i.test(input.agentId)) return null;
    const granted = await this.pool.query<{ attestor_phone_hash: string }>(
      `SELECT attestor_phone_hash FROM agent_evidence
        WHERE kind = 'authority' AND agent_id = $1 AND property_id = $2
          AND revoked_at IS NULL AND attestor_phone_hash IS NOT NULL
        ORDER BY id LIMIT 1`,
      [input.agentId, input.propertyId],
    );
    const row = granted.rows[0];
    if (!row) return null;
    return this.issue('revoke', input.agentId, input.propertyId, row.attestor_phone_hash, input.now);
  }

  private async issue(
    purpose: ChallengePurpose,
    agentId: string,
    propertyId: string,
    landlordPhoneHash: string,
    now: Date,
  ) {
    const challenge: Challenge = {
      id: randomUUID(),
      purpose,
      agentId,
      propertyId,
      landlordPhoneHash,
      expiresAt: new Date(now.getTime() + AUTHORITY_CODE_MINUTES * 60_000),
    };
    const code = String(randomBytes(4).readUInt32BE(0) % 1_000_000).padStart(6, '0');
    await this.pool.query(
      `INSERT INTO landlord_challenges
         (id, purpose, agent_id, property_id, landlord_phone_hash, code_hash, expires_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [
        challenge.id,
        challenge.purpose,
        challenge.agentId,
        challenge.propertyId,
        landlordPhoneHash,
        hashToken(code),
        challenge.expiresAt,
      ],
    );
    return { challenge, code };
  }

  async answerChallenge(input: { challengeId: string; code: string; now: Date }) {
    if (!/^[0-9a-f-]{36}$/i.test(input.challengeId)) return null;

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      /*
        Locked for the whole answer.

        Without `FOR UPDATE` two concurrent guesses both read `attempts = 4`,
        both write 5, and the ceiling costs an attacker one attempt instead of
        the search space. The lock is also what makes "used" mean used: a
        correct code answered twice must grant once.
      */
      const found = await client.query<{
        purpose: string;
        agent_id: string;
        property_id: string;
        landlord_phone_hash: string;
        code_hash: string;
        attempts: number;
        used: boolean;
        expires_at: Date;
      }>(
        `SELECT purpose, agent_id, property_id, landlord_phone_hash, code_hash,
                attempts, used, expires_at
           FROM landlord_challenges WHERE id = $1 FOR UPDATE`,
        [input.challengeId],
      );
      const challenge = found.rows[0];
      if (
        !challenge ||
        challenge.used ||
        challenge.expires_at <= input.now ||
        challenge.attempts >= MAX_CODE_ATTEMPTS
      ) {
        await client.query('COMMIT');
        return null;
      }

      if (hashToken(input.code) !== challenge.code_hash) {
        await client.query(
          'UPDATE landlord_challenges SET attempts = attempts + 1 WHERE id = $1',
          [input.challengeId],
        );
        await client.query('COMMIT');
        return null;
      }

      await client.query('UPDATE landlord_challenges SET used = TRUE WHERE id = $1', [
        input.challengeId,
      ]);

      if (challenge.purpose === 'grant') {
        await client.query(
          `INSERT INTO agent_evidence
             (agent_id, kind, attestor_kind, attestor_phone_hash, property_id, attested_at)
           VALUES ($1,'authority','landlord',$2,$3,$4)`,
          [
            challenge.agent_id,
            challenge.landlord_phone_hash,
            challenge.property_id,
            input.now,
          ],
        );
        await client.query('COMMIT');
        return { purpose: 'grant' as const, unpublished: [] };
      }

      const going = await this.withdraw(
        client,
        `kind = 'authority' AND agent_id = $1 AND property_id = $2
           AND attestor_phone_hash = $3 AND revoked_at IS NULL`,
        [challenge.agent_id, challenge.property_id, challenge.landlord_phone_hash],
        challenge.agent_id,
        input.now,
      );
      await client.query('COMMIT');
      return { purpose: 'revoke' as const, unpublished: going };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async revokeIdentity(input: { agentId: string; now: Date }) {
    if (!/^[0-9a-f-]{36}$/i.test(input.agentId)) return [];
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const going = await this.withdraw(
        client,
        `kind = 'identity' AND agent_id = $1 AND revoked_at IS NULL`,
        [input.agentId],
        input.agentId,
        input.now,
      );
      await client.query('COMMIT');
      return going;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Revoke one evidence row and unpublish what stood on it, inside the caller's
   * transaction. The listings are locked before `cascade` sees them, so a
   * publish racing this revocation cannot land after the sweep has passed.
   */
  private async withdraw(
    client: PoolClient,
    where: string,
    params: unknown[],
    agentId: string,
    now: Date,
  ): Promise<readonly string[]> {
    const target = await client.query<EvidenceRow & { id: string }>(
      `SELECT id, ${EVIDENCE_COLUMNS} FROM agent_evidence
        WHERE ${where} ORDER BY id LIMIT 1 FOR UPDATE`,
      params,
    );
    const row = target.rows[0];
    if (!row) return [];

    await client.query('UPDATE agent_evidence SET revoked_at = $1 WHERE id = $2', [
      now,
      row.id,
    ]);

    const listings = await client.query<{
      id: string;
      agent_id: string;
      property_id: string;
      published_at: Date | null;
    }>(
      `SELECT id, agent_id, property_id, published_at FROM listings
        WHERE agent_id = $1 FOR UPDATE`,
      [agentId],
    );

    const going = cascade(
      { ...hydrate(row), revokedAt: now },
      listings.rows.map((l) => ({
        id: l.id,
        agentId: l.agent_id,
        propertyId: l.property_id,
        publishedAt: l.published_at,
      })),
    );
    if (going.length > 0) {
      await client.query(
        'UPDATE listings SET published_at = NULL WHERE id = ANY($1::uuid[])',
        [[...going]],
      );
    }
    return going;
  }

  async createListing(input: {
    agentId: string;
    propertyId: string;
    title: string;
    now: Date;
  }) {
    const listing: Listing = {
      id: randomUUID(),
      agentId: input.agentId,
      propertyId: input.propertyId,
      title: input.title,
      publishedAt: null,
      lastConfirmedAt: null,
    };
    await this.pool.query(
      `INSERT INTO listings (id, agent_id, property_id, title, created_at)
       VALUES ($1,$2,$3,$4,$5)`,
      [listing.id, listing.agentId, listing.propertyId, listing.title, input.now],
    );
    return listing;
  }

  private hydrateListing(row: ListingRow): Listing {
    return {
      id: row.id,
      agentId: row.agent_id,
      propertyId: row.property_id,
      title: row.title,
      publishedAt: row.published_at,
      lastConfirmedAt: row.last_confirmed_at,
    };
  }

  async listingsOf(agentId: string) {
    if (!/^[0-9a-f-]{36}$/i.test(agentId)) return [];
    const result = await this.pool.query<ListingRow>(
      `SELECT ${LISTING_COLUMNS} FROM listings WHERE agent_id = $1`,
      [agentId],
    );
    return result.rows.map((r) => this.hydrateListing(r));
  }

  async listing(id: string) {
    if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
    const result = await this.pool.query<ListingRow>(
      `SELECT ${LISTING_COLUMNS} FROM listings WHERE id = $1`,
      [id],
    );
    const row = result.rows[0];
    return row ? this.hydrateListing(row) : null;
  }

  async publishListing(id: string, now: Date) {
    const listing = await this.listing(id);
    if (!listing) return;

    // The store asks the rule again, the same belt-and-braces the registry
    // uses on its one dangerous query. A published listing on an authority
    // nobody granted is the exact harm this product sells itself as stopping.
    const evidence = await this.evidenceFor(listing.agentId);
    if (!mayList(evidence, listing.propertyId, now)) return;

    await this.pool.query('UPDATE listings SET published_at = $1 WHERE id = $2', [now, id]);
  }

  async confirmStillAvailable(id: string, now: Date) {
    if (!/^[0-9a-f-]{36}$/i.test(id)) return false;
    const result = await this.pool.query(
      'UPDATE listings SET last_confirmed_at = $1 WHERE id = $2',
      [now, id],
    );
    return (result.rowCount ?? 0) > 0;
  }

  async publishedListings() {
    const result = await this.pool.query<ListingRow>(
      `SELECT ${LISTING_COLUMNS} FROM listings WHERE published_at IS NOT NULL`,
    );
    return result.rows.map((r) => this.hydrateListing(r));
  }
}
