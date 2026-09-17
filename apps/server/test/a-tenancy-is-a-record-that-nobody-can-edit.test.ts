import { createHash, generateKeyPairSync, sign, type KeyObject } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { Pool } from 'pg';

import { AppModule } from '../src/app.module';
import { AgentsStore } from '../src/agents/agents.store';
import { aTenant, aVerifiedListing, KYC_TOKEN, REVIEWER_TOKEN } from './helpers/verified';

/**
 * ADR-0009 through ADR-0012 on the running server: a tenancy opens only on a
 * property the letting side holds authority over; it is a draft until both
 * signed the same bytes; only the letting side records and only after
 * signing; a wrong amount is corrected, never edited, and the receipt says
 * so; the tenant disputes; a ticket cannot be moved along an edge that is
 * not the caller's; a condition record changes until somebody acknowledged
 * it and never after; a move-out is compared to its move-in; and no
 * response anywhere carries a total or a word about paying.
 */
const DATABASE_URL = process.env.KEYS_TEST_DATABASE_URL;
const STORES: Array<[name: string, url: string | undefined]> = [
  ['in memory', undefined],
  ...(DATABASE_URL ? ([['postgres', DATABASE_URL]] as Array<[string, string]>) : []),
];

function keyPair() {
  const { publicKey, privateKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  return { publicKey: publicKey.export({ format: 'der', type: 'spki' }).toString('base64'), privateKey };
}
function signed(message: string, privateKey: KeyObject): string {
  return sign('sha256', Buffer.from(message, 'utf8'), privateKey).toString('base64');
}
const HASH = createHash('sha256').update('a photograph').digest('hex');

describe.each(STORES)('a tenancy is a record nobody can edit (%s)', (_name, databaseUrl) => {
  let app: INestApplication;
  let agents: AgentsStore;
  let seed = 700;

  beforeAll(async () => {
    process.env.KEYS_REVIEWER_TOKEN = REVIEWER_TOKEN;
    process.env.KEYS_KYC_TOKEN = KYC_TOKEN;
    if (databaseUrl) process.env.KEYS_DATABASE_URL = databaseUrl;
    else delete process.env.KEYS_DATABASE_URL;
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    await app.listen(0);
    agents = app.get(AgentsStore);
    if (databaseUrl) {
      const pool = new Pool({ connectionString: databaseUrl });
      await pool.query('TRUNCATE agents, tenants, tenancies CASCADE');
      await pool.end();
    }
  });
  afterAll(async () => {
    await app.close();
  });

  /** A letting side with authority, a tenant with a key, and the agent's device. */
  async function parties() {
    seed += 1;
    const listing = await aVerifiedListing(app, agents, { seed });
    const tenant = await aTenant(app, `Tenant ${seed}`);
    const tenantKeys = keyPair();
    await request(app.getHttpServer()).post('/v1/tenants/me/key').set('x-tenant-token', tenant.token).send({ publicKey: tenantKeys.publicKey }).expect(201);
    const agentKeys = keyPair();
    const device = await request(app.getHttpServer()).post('/v1/captures/devices').set('x-agent-token', listing.token).send({ publicKey: agentKeys.publicKey }).expect(201);
    return { listing, tenant, tenantKeys, agentKeys, deviceId: device.body.deviceId as string };
  }

  async function opened() {
    const p = await parties();
    const t = await request(app.getHttpServer())
      .post('/v1/tenancies')
      .set('x-agent-token', p.listing.token)
      .send({ propertyId: p.listing.propertyId, tenantId: p.tenant.id, rentKobo: 100_000_00, period: 'monthly', periods: 12, cautionDepositKobo: 100_000_00, startsOn: '2026-10-01' })
      .expect(201);
    return { ...p, tenancy: t.body as { id: string; signed: boolean } };
  }

  async function bothSign(p: Awaited<ReturnType<typeof opened>>) {
    const agreement = await request(app.getHttpServer()).get(`/v1/tenancies/${p.tenancy.id}/agreement`).set('x-tenant-token', p.tenant.token).expect(200);
    const message = agreement.body.message as string;
    await request(app.getHttpServer()).post(`/v1/tenancies/${p.tenancy.id}/sign`).set('x-tenant-token', p.tenant.token).send({ signature: signed(message, p.tenantKeys.privateKey) }).expect(201);
    const after = await request(app.getHttpServer()).post(`/v1/tenancies/${p.tenancy.id}/sign`).set('x-agent-token', p.listing.token).send({ signature: signed(message, p.agentKeys.privateKey), deviceId: p.deviceId }).expect(201);
    return after.body as { signed: boolean };
  }

  it('opens only on a property the letting side holds authority over, for a tenant that exists', async () => {
    const p = await parties();
    await request(app.getHttpServer())
      .post('/v1/tenancies')
      .set('x-agent-token', p.listing.token)
      .send({ propertyId: 'somebody else’s flat', tenantId: p.tenant.id, rentKobo: 1, period: 'monthly', periods: 1, cautionDepositKobo: 0, startsOn: '2026-10-01' })
      .expect(403);
    await request(app.getHttpServer())
      .post('/v1/tenancies')
      .set('x-agent-token', p.listing.token)
      .send({ propertyId: p.listing.propertyId, tenantId: 'nobody', rentKobo: 1, period: 'monthly', periods: 1, cautionDepositKobo: 0, startsOn: '2026-10-01' })
      .expect(400);
  });

  it('is a draft until both signed the same bytes; a signature over other bytes, or by a stranger, is refused; a third party cannot even read it', async () => {
    const p = await opened();
    expect(p.tenancy.signed).toBe(false);
    const agreement = await request(app.getHttpServer()).get(`/v1/tenancies/${p.tenancy.id}/agreement`).set('x-tenant-token', p.tenant.token).expect(200);
    expect(agreement.body.templateLegallyReviewed).toBe(false);
    expect(agreement.body.legalAdvice).toMatch(/not giving legal advice/);
    // The tenant signs something else.
    await request(app.getHttpServer()).post(`/v1/tenancies/${p.tenancy.id}/sign`).set('x-tenant-token', p.tenant.token).send({ signature: signed('something else', p.tenantKeys.privateKey) }).expect(403);
    // A stranger cannot see it at all.
    const stranger = await aTenant(app, `Stranger ${seed}`);
    await request(app.getHttpServer()).get(`/v1/tenancies/${p.tenancy.id}`).set('x-tenant-token', stranger.token).expect(404);
    // Recording before signing is refused.
    await request(app.getHttpServer()).post(`/v1/tenancies/${p.tenancy.id}/payments`).set('x-agent-token', p.listing.token).send({ periodIndex: 1, amountKobo: 100_000_00, receivedOn: '2026-10-01' }).expect(403);
    expect((await bothSign(p)).signed).toBe(true);
    const mine = await request(app.getHttpServer()).get('/v1/tenancies/mine').set('x-tenant-token', p.tenant.token).expect(200);
    expect(mine.body).toHaveLength(1);
    expect(mine.body[0].schedule).toHaveLength(12);
  });

  it('records, corrects rather than edits, disputes, and every receipt says Keys did not touch the money', async () => {
    const p = await opened();
    await bothSign(p);
    const http = app.getHttpServer();
    // The tenant cannot record.
    await request(http).post(`/v1/tenancies/${p.tenancy.id}/payments`).set('x-tenant-token', p.tenant.token).send({ periodIndex: 1, amountKobo: 100_000_00, receivedOn: '2026-10-01' }).expect(401);
    const recorded = await request(http).post(`/v1/tenancies/${p.tenancy.id}/payments`).set('x-agent-token', p.listing.token).send({ periodIndex: 1, amountKobo: 1_000_000_00, receivedOn: '2026-10-01', note: 'cash' }).expect(201);
    const paymentId = (recorded.body.entries as Array<{ kind: string; id?: string }>).find((e) => e.kind === 'payment_recorded')!.id!;
    expect(recorded.body.recorded[0].recordedKobo).toBe(1_000_000_00);
    // A correction without a reason is an edit, and refused.
    await request(http).post(`/v1/tenancies/${p.tenancy.id}/payments/${paymentId}/correct`).set('x-agent-token', p.listing.token).send({ amountKobo: 100_000_00, note: '' }).expect(400);
    const corrected = await request(http).post(`/v1/tenancies/${p.tenancy.id}/payments/${paymentId}/correct`).set('x-agent-token', p.listing.token).send({ amountKobo: 100_000_00, note: 'one zero too many' }).expect(201);
    expect(corrected.body.recorded[0].recordedKobo).toBe(100_000_00);
    expect(corrected.body.entries).toHaveLength(4);
    // The tenant disputes; both see it.
    const disputed = await request(http).post(`/v1/tenancies/${p.tenancy.id}/payments/${paymentId}/dispute`).set('x-tenant-token', p.tenant.token).send({ note: 'I paid on the 3rd, not the 1st' }).expect(201);
    expect(disputed.body.recorded[0].disputed).toBe(true);
    const asLetting = await request(http).get(`/v1/tenancies/${p.tenancy.id}`).set('x-agent-token', p.listing.token).expect(200);
    expect(asLetting.body.recorded[0].disputed).toBe(true);
    // The receipt.
    const rec = await request(http).get(`/v1/tenancies/${p.tenancy.id}/receipts`).set('x-tenant-token', p.tenant.token).expect(200);
    expect(rec.body).toHaveLength(1);
    expect(rec.body[0].text).toMatch(/corrected to: 10000000 kobo/);
    expect(rec.body[0].text).toMatch(/did not receive, hold or move the money/);
    // Nothing anywhere says pay, balance or total.
    for (const body of [recorded.body, corrected.body, disputed.body, rec.body]) {
      expect(JSON.stringify(body)).not.toMatch(/\b(pay now|balance|total|wallet|escrow)\b/i);
    }
  });

  it('a ticket moves only along the caller’s own edges, keeps every event, and cannot be deleted', async () => {
    const p = await opened();
    await bothSign(p);
    const http = app.getHttpServer();
    const opened1 = await request(http).post(`/v1/tenancies/${p.tenancy.id}/tickets`).set('x-tenant-token', p.tenant.token).send({ category: 'plumbing', description: 'The kitchen tap drips when closed', photoHashes: [HASH] }).expect(201);
    const id = opened1.body.id as string;
    expect(opened1.body.state).toBe('open');
    expect(opened1.body.moves).toEqual([]);
    // The tenant cannot resolve; the letting side cannot close.
    await request(http).post(`/v1/tickets/${id}/move`).set('x-tenant-token', p.tenant.token).send({ to: 'resolved' }).expect(403);
    await request(http).post(`/v1/tickets/${id}/move`).set('x-agent-token', p.listing.token).send({ to: 'acknowledged' }).expect(201);
    await request(http).post(`/v1/tickets/${id}/move`).set('x-agent-token', p.listing.token).send({ to: 'resolved', note: 'washer replaced' }).expect(201);
    await request(http).post(`/v1/tickets/${id}/move`).set('x-agent-token', p.listing.token).send({ to: 'closed' }).expect(403);
    const closed = await request(http).post(`/v1/tickets/${id}/move`).set('x-tenant-token', p.tenant.token).send({ to: 'closed' }).expect(201);
    expect(closed.body.state).toBe('closed');
    expect(closed.body.events).toHaveLength(4);
    await request(http).delete(`/v1/tickets/${id}`).set('x-tenant-token', p.tenant.token).expect(404);
    const list = await request(http).get(`/v1/tenancies/${p.tenancy.id}/tickets`).set('x-agent-token', p.listing.token).expect(200);
    expect(list.body[0].events).toHaveLength(4);
  });

  it('a condition record changes until somebody acknowledged it and never after; a move-out is compared to its move-in', async () => {
    const p = await opened();
    await bothSign(p);
    const http = app.getHttpServer();
    const rooms = [{ name: 'Kitchen', items: [{ caption: 'Tap', photoHash: HASH, verdict: 'snag' }, { caption: 'Tiles', photoHash: HASH, verdict: 'fine' }] }];
    // Not whole: a bad hash.
    await request(http).post(`/v1/tenancies/${p.tenancy.id}/condition`).set('x-tenant-token', p.tenant.token).send({ walk: 'move_in', rooms: [{ name: 'Kitchen', items: [{ caption: 'Tap', photoHash: 'nope', verdict: 'snag' }] }], takenAt: '2026-10-01T10:00:00.000Z' }).expect(400);
    const moveIn = await request(http).post(`/v1/tenancies/${p.tenancy.id}/condition`).set('x-tenant-token', p.tenant.token).send({ walk: 'move_in', rooms, takenAt: '2026-10-01T10:00:00.000Z' }).expect(201);
    const inId = moveIn.body.id as string;
    expect(moveIn.body.acknowledgedByBoth).toBe(false);
    // A move-out cannot compare to an unacknowledged move-in.
    await request(http).post(`/v1/tenancies/${p.tenancy.id}/condition`).set('x-tenant-token', p.tenant.token).send({ walk: 'move_out', comparesTo: inId, rooms, takenAt: '2027-10-01T10:00:00.000Z' }).expect(403);
    // The draft changes; the tenant acknowledges; the letting side's signature over other bytes is refused; after both, it does not change.
    await request(http).put(`/v1/condition/${inId}`).set('x-agent-token', p.listing.token).send({ rooms: [{ name: 'Kitchen', items: [{ caption: 'Tap', photoHash: HASH, verdict: 'fine' }] }], takenAt: '2026-10-01T10:00:00.000Z' }).expect(200);
    const current = await request(http).get(`/v1/tenancies/${p.tenancy.id}/condition`).set('x-tenant-token', p.tenant.token).expect(200);
    const message = current.body[0].message as string;
    await request(http).post(`/v1/condition/${inId}/acknowledge`).set('x-tenant-token', p.tenant.token).send({ signature: signed(message, p.tenantKeys.privateKey) }).expect(201);
    await request(http).put(`/v1/condition/${inId}`).set('x-agent-token', p.listing.token).send({ rooms, takenAt: '2026-10-01T10:00:00.000Z' }).expect(403);
    await request(http).post(`/v1/condition/${inId}/acknowledge`).set('x-agent-token', p.listing.token).send({ signature: signed(message + 'x', p.agentKeys.privateKey), deviceId: p.deviceId }).expect(403);
    const both = await request(http).post(`/v1/condition/${inId}/acknowledge`).set('x-agent-token', p.listing.token).send({ signature: signed(message, p.agentKeys.privateKey), deviceId: p.deviceId }).expect(201);
    expect(both.body.acknowledgedByBoth).toBe(true);
    // The move-out, a year on: the tap is fine now, the tiles are gone.
    const moveOut = await request(http).post(`/v1/tenancies/${p.tenancy.id}/condition`).set('x-agent-token', p.listing.token).send({ walk: 'move_out', comparesTo: inId, rooms: [{ name: 'Kitchen', items: [{ caption: 'Tap', photoHash: HASH, verdict: 'fine' }, { caption: 'Sink', photoHash: HASH, verdict: 'snag' }] }], takenAt: '2027-10-01T10:00:00.000Z' }).expect(201);
    const compared = await request(http).get(`/v1/condition/${moveOut.body.id}/compare`).set('x-tenant-token', p.tenant.token).expect(200);
    expect(compared.body).toEqual([{ room: 'Kitchen', newSnags: [], fixed: [], missing: [], added: ['Sink'] }]);
    expect(JSON.stringify(compared.body)).not.toMatch(/kobo|naira/);
  });

  it('the portfolio is facts per tenancy and carries no total', async () => {
    const p = await opened();
    await bothSign(p);
    const rows = await request(app.getHttpServer()).get('/v1/tenancies/portfolio').set('x-agent-token', p.listing.token).expect(200);
    expect(rows.body).toHaveLength(1);
    expect(rows.body[0].nextDueOn).toBe('2026-10-01');
    expect(rows.body[0].signed).toBe(true);
    expect(JSON.stringify(rows.body)).not.toMatch(/total/i);
  });
});
