import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Pool } from 'pg';

import type { Answer, Application, ApplicationEvent, Profile, TenantStanding } from '@keys/domain';

import { ReachStore } from './reach.store';

interface AnswerRow {
  tenant_id: string;
  area_id: string;
  month: string;
  power: string;
  water: string;
  transport: string[];
  market: string;
}

interface ApplicationRow {
  id: string;
  listing_id: string;
  tenant_id: string;
  agent_id: string;
  profile: Profile;
  standing: TenantStanding;
}

const UUID = /^[0-9a-f-]{36}$/i;

@Injectable()
export class PostgresReachStore extends ReachStore implements OnModuleInit, OnModuleDestroy {
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

  async answer(a: Answer): Promise<void> {
    await this.pool.query('INSERT INTO area_answers (tenant_id, area_id, month, power, water, transport, market) VALUES ($1,$2,$3,$4,$5,$6,$7)', [a.tenantId, a.areaId, a.month, a.power, a.water, [...a.transport], a.market]);
  }

  async answersFor(areaId: string): Promise<Answer[]> {
    const r = await this.pool.query<AnswerRow>('SELECT * FROM area_answers WHERE area_id = $1 ORDER BY seq', [areaId]);
    return r.rows.map((row) => ({ tenantId: row.tenant_id, areaId: row.area_id, month: row.month, power: row.power as Answer['power'], water: row.water as Answer['water'], transport: row.transport as Answer['transport'], market: row.market as Answer['market'] }));
  }

  private async events(id: string): Promise<ApplicationEvent[]> {
    const r = await this.pool.query<{ event: Record<string, unknown> }>('SELECT event FROM application_events WHERE application_id = $1 ORDER BY seq', [id]);
    return r.rows.map((row) => ({ ...row.event, at: new Date(row.event.at as string) }) as unknown as ApplicationEvent);
  }

  private async fromRow(row: ApplicationRow): Promise<Application> {
    return { id: row.id, listingId: row.listing_id, tenantId: row.tenant_id, agentId: row.agent_id, profile: row.profile, standing: row.standing, events: await this.events(row.id) };
  }

  async createApplication(a: Application): Promise<Application> {
    await this.pool.query('INSERT INTO applications (id, listing_id, tenant_id, agent_id, profile, standing) VALUES ($1,$2,$3,$4,$5,$6)', [a.id, a.listingId, a.tenantId, a.agentId, JSON.stringify(a.profile), JSON.stringify(a.standing)]);
    for (const e of a.events) await this.pool.query('INSERT INTO application_events (application_id, event) VALUES ($1,$2)', [a.id, JSON.stringify(e)]);
    return a;
  }

  async application(id: string): Promise<Application | null> {
    if (!UUID.test(id)) return null;
    const r = await this.pool.query<ApplicationRow>('SELECT * FROM applications WHERE id = $1', [id]);
    return r.rows[0] ? this.fromRow(r.rows[0]) : null;
  }

  private async byColumn(column: 'tenant_id' | 'agent_id' | 'listing_id', value: string): Promise<Application[]> {
    const r = await this.pool.query<ApplicationRow>(`SELECT * FROM applications WHERE ${column} = $1 ORDER BY created_seq`, [value]);
    return Promise.all(r.rows.map((row) => this.fromRow(row)));
  }
  applicationsForTenant(tenantId: string) {
    return this.byColumn('tenant_id', tenantId);
  }
  applicationsForAgent(agentId: string) {
    return this.byColumn('agent_id', agentId);
  }
  applicationsForListing(listingId: string) {
    return this.byColumn('listing_id', listingId);
  }

  async appendApplicationEvent(id: string, event: ApplicationEvent): Promise<Application> {
    await this.pool.query('INSERT INTO application_events (application_id, event) VALUES ($1,$2)', [id, JSON.stringify(event)]);
    const a = await this.application(id);
    if (!a) throw new Error('no such application');
    return a;
  }
}
