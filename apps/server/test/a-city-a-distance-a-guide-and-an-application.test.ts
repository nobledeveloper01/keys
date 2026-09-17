import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { Pool } from 'pg';

import { AppModule } from '../src/app.module';
import { AgentsStore } from '../src/agents/agents.store';
import { aTenant, aVerifiedListing, KYC_TOKEN, REVIEWER_TOKEN } from './helpers/verified';

/**
 * ADR-0013 to ADR-0016 on the running server: a search in Abuja returns
 * only Abuja; a listing four kilometres from the place a tenant named says
 * four kilometres and never a minute; an area guide with four answers shows
 * nothing and one with five shows counts and no person; an application is
 * the tenant's own words with a status the tenant sees every change of, and
 * no response carries a number about a person.
 */
const DATABASE_URL = process.env.KEYS_TEST_DATABASE_URL;
const STORES: Array<[name: string, url: string | undefined]> = [
  ['in memory', undefined],
  ...(DATABASE_URL ? ([['postgres', DATABASE_URL]] as Array<[string, string]>) : []),
];

const YABA = { latitude: 6.5095, longitude: 3.3711 };
const MARINA = { latitude: 6.4507, longitude: 3.3939 };
const WUSE = { latitude: 9.0692, longitude: 7.4787 };

describe.each(STORES)('a city, a distance, a guide and an application (%s)', (_name, databaseUrl) => {
  let app: INestApplication;
  let agents: AgentsStore;
  let seed = 800;

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
      await pool.query('TRUNCATE agents, tenants, tenancies, area_answers, applications CASCADE');
      await pool.end();
    }
  });
  afterAll(async () => {
    await app.close();
  });

  const http = () => app.getHttpServer();

  it('a search in Abuja returns only Abuja, and a search by distance says kilometres and never minutes', async () => {
    const lagos = await aVerifiedListing(app, agents, { seed: (seed += 1), point: YABA, title: 'Two bedroom in Yaba' });
    const abuja = await aVerifiedListing(app, agents, { seed: (seed += 1), point: WUSE, title: 'Two bedroom in Wuse' });
    const inAbuja = await request(http()).get('/v1/listings').query({ city: 'abuja' }).expect(200);
    const ids = (inAbuja.body.results as Array<{ id: string }>).map((r) => r.id);
    expect(ids).toContain(abuja.id);
    expect(ids).not.toContain(lagos.id);
    const nowhere = await request(http()).get('/v1/listings').query({ city: 'ibadan' }).expect(200);
    expect((nowhere.body.results as Array<{ id: string }>).map((r) => r.id)).toContain(lagos.id);
    // Within five kilometres of Marina: Yaba is about seven, so it is out; within ten, in — and the row says km.
    const near5 = await request(http()).get('/v1/listings').query({ placeLatitude: MARINA.latitude, placeLongitude: MARINA.longitude, withinKm: 5 }).expect(200);
    expect((near5.body.results as Array<{ id: string }>).map((r) => r.id)).not.toContain(lagos.id);
    const near10 = await request(http()).get('/v1/listings').query({ placeLatitude: MARINA.latitude, placeLongitude: MARINA.longitude, withinKm: 10 }).expect(200);
    const row = (near10.body.results as Array<{ id: string; kmFromPlace: number | null; areaId: string | null }>).find((r) => r.id === lagos.id)!;
    expect(row.kmFromPlace).toBeGreaterThan(6);
    expect(row.kmFromPlace).toBeLessThan(8);
    expect(row.areaId).toBe('lagos:yaba');
    expect(JSON.stringify(near10.body)).not.toMatch(/minute/i);
  });

  it('the cities are data, and the guide is nothing below five separate tenants and counts above', async () => {
    const cities = await request(http()).get('/v1/cities').expect(200);
    expect((cities.body as Array<{ id: string }>).map((c) => c.id)).toEqual(['lagos', 'abuja', 'port_harcourt']);
    await request(http()).get('/v1/areas/lagos:nowhere/guide').expect(404);
    const empty = await request(http()).get('/v1/areas/lagos:yaba/guide').expect(200);
    expect(empty.body.answers).toBe(0);
    expect(empty.body.power).toBeNull();

    // Five tenants with a tenancy in Yaba answer; a sixth with no tenancy cannot.
    const listing = await aVerifiedListing(app, agents, { seed: (seed += 1), point: YABA, title: 'A flat in Yaba' });
    for (let i = 0; i < 5; i += 1) {
      const tenant = await aTenant(app, `Yaba tenant ${seed}-${i}`);
      const t = await request(http())
        .post('/v1/tenancies')
        .set('x-agent-token', listing.token)
        .send({ propertyId: listing.propertyId, tenantId: tenant.id, rentKobo: 1_00, period: 'yearly', periods: 1, cautionDepositKobo: 0, startsOn: '2026-10-01' })
        .expect(201);
      const body = { tenancyId: t.body.id, power: i < 4 ? 'under_4h' : 'over_16h', water: 'borehole', transport: ['bus', 'keke'], market: 'walking' };
      await request(http()).post('/v1/areas/answers').set('x-tenant-token', tenant.token).send(body).expect(201);
      if (i === 3) {
        const four = await request(http()).get('/v1/areas/lagos:yaba/guide').expect(200);
        expect(four.body.answers).toBe(0);
      }
    }
    const stranger = await aTenant(app, `Stranger ${seed}`);
    await request(http()).post('/v1/areas/answers').set('x-tenant-token', stranger.token).send({ tenancyId: 'nope', power: 'under_4h', water: 'borehole', transport: ['bus'], market: 'walking' }).expect(403);
    const five = await request(http()).get('/v1/areas/lagos:yaba/guide').expect(200);
    expect(five.body.answers).toBe(5);
    expect(five.body.power).toEqual({ under_4h: 4, '4_to_8h': 0, '8_to_16h': 0, over_16h: 1 });
    expect(five.body.transport.keke).toBe(5);
    expect(JSON.stringify(five.body)).not.toMatch(/tenant|2026-/);
  });

  it('an application is the tenant’s own words; the agent moves it along a closed list and the tenant sees every change; no response scores anybody', async () => {
    const listing = await aVerifiedListing(app, agents, { seed: (seed += 1), point: YABA, title: 'A flat to apply for' });
    const tenant = await aTenant(app, `Applicant ${seed}`);
    await request(http()).post(`/v1/listings/${listing.id}/applications`).set('x-tenant-token', tenant.token).send({ occupation: '', householdSize: 2, moveInBy: '2026-11-01' }).expect(400);
    const applied = await request(http()).post(`/v1/listings/${listing.id}/applications`).set('x-tenant-token', tenant.token).send({ occupation: 'Nurse', householdSize: 2, moveInBy: '2026-11-01', note: 'Moving for work at LUTH.' }).expect(201);
    const id = applied.body.id as string;
    expect(applied.body.state).toBe('submitted');
    expect(applied.body.standing).toEqual({ accountAgeDays: 0, tenanciesRecorded: 0 });
    // Once, while open.
    await request(http()).post(`/v1/listings/${listing.id}/applications`).set('x-tenant-token', tenant.token).send({ occupation: 'Nurse', householdSize: 2, moveInBy: '2026-11-01' }).expect(403);
    // The tenant cannot shortlist themselves; another agent cannot see it at all.
    await request(http()).post(`/v1/applications/${id}/move`).set('x-tenant-token', tenant.token).send({ to: 'shortlisted' }).expect(401);
    const other = await aVerifiedListing(app, agents, { seed: (seed += 1), point: YABA });
    await request(http()).post(`/v1/applications/${id}/move`).set('x-agent-token', other.token).send({ to: 'seen' }).expect(404);
    const forAgent = await request(http()).get('/v1/agent/applications').set('x-agent-token', listing.token).expect(200);
    expect(forAgent.body).toHaveLength(1);
    expect(forAgent.body[0].profile.note).toBe('Moving for work at LUTH.');
    expect(forAgent.body[0].moves).toEqual(['seen', 'declined']);
    await request(http()).post(`/v1/applications/${id}/move`).set('x-agent-token', listing.token).send({ to: 'offered' }).expect(403);
    await request(http()).post(`/v1/applications/${id}/move`).set('x-agent-token', listing.token).send({ to: 'seen' }).expect(201);
    const shortlisted = await request(http()).post(`/v1/applications/${id}/move`).set('x-agent-token', listing.token).send({ to: 'shortlisted' }).expect(201);
    expect(shortlisted.body.events).toHaveLength(3);
    const mine = await request(http()).get('/v1/applications').set('x-tenant-token', tenant.token).expect(200);
    expect(mine.body[0].state).toBe('shortlisted');
    expect(mine.body[0].events.map((e: { to?: string }) => e.to)).toEqual([undefined, 'seen', 'shortlisted']);
    const withdrawn = await request(http()).post(`/v1/applications/${id}/withdraw`).set('x-tenant-token', tenant.token).expect(201);
    expect(withdrawn.body.state).toBe('withdrawn');
    await request(http()).post(`/v1/applications/${id}/withdraw`).set('x-tenant-token', tenant.token).expect(403);
    // A closed one can be followed by a new one.
    await request(http()).post(`/v1/listings/${listing.id}/applications`).set('x-tenant-token', tenant.token).send({ occupation: 'Nurse', householdSize: 2, moveInBy: '2026-12-01' }).expect(201);
    for (const body of [applied.body, forAgent.body, shortlisted.body, mine.body]) {
      expect(JSON.stringify(body)).not.toMatch(/score|risk|credit|income|ratio/i);
    }
  });
});
