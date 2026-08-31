import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Pool } from 'pg';
import * as request from 'supertest';

import { TIERS, tierOf } from '@keys/domain';

import { AppModule } from '../src/app.module';
import { AgentsStore } from '../src/agents/agents.store';
import { ReportsStore } from '../src/reports/reports.store';

/*
  Run against every store, for the same reason phase 1's gate does: a suite
  that only exercises a `Map` proves something about a `Map`, and the server
  that ships is talking to Postgres, where the rule is a transaction and a
  mistake looks completely different.
*/
const DATABASE_URL = process.env.KEYS_TEST_DATABASE_URL;
if (!DATABASE_URL) {
  console.warn(
    '\n  ! KEYS_TEST_DATABASE_URL is not set — this suite is running against ' +
      'the in-memory store only.\n    The revocation cascade is a transaction on the ' +
      'shipping server. Set it to cover both.\n',
  );
}

const STORES: Array<[name: string, url: string | undefined]> = [
  ['in memory', undefined],
  ...(DATABASE_URL ? ([['postgres', DATABASE_URL]] as Array<[string, string]>) : []),
];

/**
 * Phase 2's exit gate.
 *
 * Two claims, and neither is "the controller checks the tier".
 *
 *   1. **No value a client sends raises a tier.** Not on the routes somebody
 *      remembered to guard — on every route this server exposes, read out of
 *      the running router, with every tier-shaped field a hostile caller might
 *      try, in the body and in the query string.
 *
 *   2. **A revocation and the unpublishing it causes are one operation.** The
 *      listing is dark the moment the landlord's code is accepted, not on the
 *      next sweep.
 *
 * The routes are not listed here. A route added in phase 4 is covered on the
 * day it is added, by someone who never opened this file.
 */

const REVIEWER = 'x'.repeat(48);
const KYC = 'k'.repeat(48);

interface Route {
  readonly method: string;
  readonly path: string;
}

function routesOf(app: INestApplication): Route[] {
  const server = app.getHttpAdapter().getInstance() as {
    router?: { stack: unknown[] };
    _router?: { stack: unknown[] };
  };
  const stack = (server.router ?? server._router)?.stack ?? [];
  const found: Route[] = [];
  for (const layer of stack as Array<{
    route?: { path: string; methods: Record<string, boolean> };
  }>) {
    if (!layer.route) continue;
    for (const [method, on] of Object.entries(layer.route.methods)) {
      if (on) found.push({ method: method.toUpperCase(), path: layer.route.path });
    }
  }
  return found;
}

/**
 * Every name a tier might plausibly hide behind, at every level a body nests
 * to. Names, because the attack is not a clever value — it is `{"tier":
 * "established"}` posted at a route whose handler happens to spread its body
 * into something.
 */
const TIER_FIELDS = [
  'tier',
  'Tier',
  'TIER',
  'level',
  'rank',
  'verified',
  'isVerified',
  'is_verified',
  'verificationTier',
  'verification_tier',
  'trustLevel',
  'badge',
  'evidence',
  'attestor',
  'upheldReports',
  'joinedAt',
  'revokedAt',
  'publishedAt',
  'published_at',
];

describe.each(STORES)('no client can raise its own tier (%s)', (_name, databaseUrl) => {
  let app: INestApplication;
  let agents: AgentsStore;
  let token: string;
  let agentId: string;
  let listingId: string;

  beforeAll(async () => {
    process.env.KEYS_REVIEWER_TOKEN = REVIEWER;
    process.env.KEYS_KYC_TOKEN = KYC;
    if (databaseUrl) {
      process.env.KEYS_DATABASE_URL = databaseUrl;
    } else {
      delete process.env.KEYS_DATABASE_URL;
    }

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    /*
      Bound once, on purpose.

      `request(app.getHttpServer())` calls `listen(0)` itself when the server
      is not already listening, and the route walk below makes on the order of
      a thousand calls. A thousand ephemeral listeners is a thousand file
      descriptors, and the symptom is `socket hang up` on a test that looks
      like it is failing for a security reason.
    */
    await app.listen(0);
    agents = app.get(AgentsStore);

    /*
      A clean set of tables, and this is not housekeeping.

      The suite left its rows behind and the *next* run failed on the landlord
      ceiling: seven runs meant seven agents vouched for by the same test
      phone number, which is exactly what `MAX_AGENTS_PER_LANDLORD` exists to
      refuse. The rule was right and the fixture was accumulating — a failure
      that says nothing about the server and costs an hour to read.
    */
    if (databaseUrl) {
      const pool = new Pool({ connectionString: databaseUrl });
      await pool.query('TRUNCATE agents CASCADE');
      await pool.end();
    }

    const signedUp = await request(app.getHttpServer())
      .post('/v1/agents')
      .send({ displayName: 'Adaeze Nwosu', phone: '+2348011111111' })
      .expect(201);
    agentId = signedUp.body.agentId;
    token = signedUp.body.token;
  });

  afterAll(async () => {
    await app.close();
    delete process.env.KEYS_REVIEWER_TOKEN;
    delete process.env.KEYS_KYC_TOKEN;
    delete process.env.KEYS_DATABASE_URL;
  });

  it('has routes to test, and knows how many', () => {
    /*
      The gate's own liveness check, and it is not decoration — this repo has
      shipped five gates that were green because they were looking at nothing.
      If a Nest upgrade changes the router shape and `routesOf` starts
      returning an empty list, every assertion below passes vacuously and this
      one is what fails.
    */
    const routes = routesOf(app);
    expect(routes.length).toBeGreaterThanOrEqual(12);
    expect(routes.some((r) => r.path.includes('agents'))).toBe(true);
    expect(routes.some((r) => r.path.includes('authority'))).toBe(true);
  });

  it('starts unverified, whatever it says about itself at sign-up', async () => {
    const claiming = await request(app.getHttpServer())
      .post('/v1/agents')
      .send({
        displayName: 'Totally Legitimate Estates',
        phone: '+2348022222222',
        tier: 'established',
        verified: true,
        evidence: [{ kind: 'identity', attestor: { kind: 'vendor', vendor: 'x' } }],
      })
      .expect(201);

    const profile = await request(app.getHttpServer())
      .get(`/v1/agents/${claiming.body.agentId}`)
      .expect(200);
    expect(profile.body.tier).toBe('unverified');
    expect(profile.body.confirmedProperties).toBe(0);
  });

  it('is not raised by any tier-shaped field, on any route, in body or query', async () => {
    const routes = routesOf(app);
    const before = (await request(app.getHttpServer()).get(`/v1/agents/${agentId}`)).body.tier;
    expect(before).toBe('unverified');

    let attempted = 0;
    for (const route of routes) {
      // Substituted rather than skipped: a route with an id in it is exactly
      // where a caller would try, so it is tried with this agent's own id.
      const path = route.path
        .replace(':id', agentId)
        .replace(/:[A-Za-z]+/g, agentId);

      for (const field of TIER_FIELDS) {
        for (const value of ['established', 'authority', true, 999]) {
          const body: Record<string, unknown> = {
            [field]: value,
            // A nested copy, because a handler that spreads a sub-object into
            // a record is the shape this attack actually takes.
            agent: { [field]: value },
            data: { attributes: { [field]: value } },
          };

          const send = (req: request.Test) =>
            req
              .set('x-agent-token', token)
              .set('x-reviewer-token', REVIEWER)
              .set('x-kyc-token', KYC)
              .query({ [field]: String(value) })
              .send(body);

          attempted += 1;
          const server = app.getHttpServer();
          let response: request.Response | undefined;
          if (route.method === 'GET') response = await send(request(server).get(path));
          else if (route.method === 'POST') response = await send(request(server).post(path));
          else if (route.method === 'PUT') response = await send(request(server).put(path));
          else if (route.method === 'PATCH') response = await send(request(server).patch(path));
          else if (route.method === 'DELETE') response = await send(request(server).delete(path));

          /*
            What the route *says*, not only what the store ends up holding.

            The first version of this walk checked the agent's profile once at
            the end, and a handler that echoed the caller's own claimed tier
            straight back passed it — the store was untouched, so the final
            state was fine, and every client on earth would have believed the
            response. Reflecting a tier is raising a tier as far as anybody
            reading the screen is concerned.
          */
          const said = JSON.stringify(response?.body ?? {});
          for (const higher of TIERS.slice(1)) {
            expect(said).not.toContain(`"${higher}"`);
          }
          expect(said).not.toMatch(/"(verified|isVerified|is_verified)":\s*true/);
        }
      }
    }
    expect(attempted).toBeGreaterThan(100);

    const after = await request(app.getHttpServer()).get(`/v1/agents/${agentId}`).expect(200);
    expect(after.body.tier).toBe('unverified');
    expect(after.body.confirmedProperties).toBe(0);
    expect(after.body.upheldReports).toBe(0);

    // And the store agrees — not only the read the app happens to serve.
    const evidence = await agents.evidenceFor(agentId);
    expect(evidence).toHaveLength(0);
  });

  it('will not let an agent post their own identity check', async () => {
    // The KYC route is the bottom rung: forge an attestation there and every
    // tier above it becomes reachable. An agent token must not open it.
    await request(app.getHttpServer())
      .post('/v1/authority/identity')
      .set('x-agent-token', token)
      .send({ agentId, vendor: 'smile-id', reference: 'forged' })
      .expect(403);

    // Nor the reviewer's token. Different door, different job.
    await request(app.getHttpServer())
      .post('/v1/authority/identity')
      .set('x-reviewer-token', REVIEWER)
      .send({ agentId, vendor: 'smile-id', reference: 'forged' })
      .expect(403);

    expect(await agents.evidenceFor(agentId)).toHaveLength(0);
  });

  it('never returns a landlord code from any route', async () => {
    await request(app.getHttpServer())
      .post('/v1/authority/identity')
      .set('x-kyc-token', KYC)
      .send({ agentId, vendor: 'smile-id', reference: 'check-1' })
      .expect(201);

    const asked = await request(app.getHttpServer())
      .post('/v1/agents/me/authority')
      .set('x-agent-token', token)
      .send({ propertyId: 'flat-1', landlordPhone: '+2348099999999' })
      .expect(201);

    /*
      The code is the whole game.

      The agent is the one who asked for the text, so if any response anywhere
      carries the six digits, the landlord confirmation becomes a
      self-confirmation through the mechanism built to prevent one. Six digits
      are found by pattern rather than by comparison, because the point is that
      the test does not know the code either.
    */
    const bodies = [JSON.stringify(asked.body)];
    for (const route of routesOf(app)) {
      const path = route.path.replace(/:[A-Za-z]+/g, asked.body.challengeId);
      if (route.method !== 'GET') continue;
      const response = await request(app.getHttpServer())
        .get(path)
        .set('x-agent-token', token)
        .set('x-reviewer-token', REVIEWER)
        .set('x-kyc-token', KYC);
      bodies.push(JSON.stringify(response.body));
    }
    for (const body of bodies) {
      expect(body).not.toMatch(/\b\d{6}\b/);
    }
    expect(asked.body.delivered).toBe(false);
  });

  it('will not publish a listing on a property no landlord confirmed', async () => {
    const draft = await request(app.getHttpServer())
      .post('/v1/agents/me/listings')
      .set('x-agent-token', token)
      .send({ propertyId: 'flat-nobody-gave-me', title: '2 bed, Yaba' })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/v1/agents/me/listings/${draft.body.id}/publish`)
      .set('x-agent-token', token)
      .send({ tier: 'established', publishedAt: new Date().toISOString() })
      .expect(403);

    const mine = await request(app.getHttpServer())
      .get('/v1/agents/me/listings')
      .set('x-agent-token', token)
      .expect(200);
    expect(mine.body.find((l: { id: string }) => l.id === draft.body.id).publishedAt).toBeNull();
  });

  it('publishes only after the landlord answers, and only that property', async () => {
    const { challenge, code } = await agents.openChallenge({
      purpose: 'grant',
      agentId,
      propertyId: 'flat-2',
      landlordPhone: '+2348088888888',
      now: new Date(),
    });

    // A wrong code changes nothing.
    await request(app.getHttpServer())
      .post('/v1/authority/confirm')
      .send({ challengeId: challenge.id, code: '000000' })
      .expect(400);
    expect(
      (await request(app.getHttpServer()).get(`/v1/agents/${agentId}`)).body.tier,
    ).toBe('identity');

    await request(app.getHttpServer())
      .post('/v1/authority/confirm')
      .send({ challengeId: challenge.id, code })
      .expect(201);

    const profile = await request(app.getHttpServer()).get(`/v1/agents/${agentId}`).expect(200);
    expect(profile.body.tier).toBe('authority');
    expect(profile.body.confirmedProperties).toBe(1);

    const draft = await request(app.getHttpServer())
      .post('/v1/agents/me/listings')
      .set('x-agent-token', token)
      .send({ propertyId: 'flat-2', title: '3 bed, Surulere' })
      .expect(201);
    listingId = draft.body.id;

    const published = await request(app.getHttpServer())
      .post(`/v1/agents/me/listings/${listingId}/publish`)
      .set('x-agent-token', token)
      .expect(201);
    expect(published.body.publishedAt).not.toBeNull();

    // A second property is still refused. Authority is about a person and a
    // flat together, and one confirmation is not a licence.
    const other = await request(app.getHttpServer())
      .post('/v1/agents/me/listings')
      .set('x-agent-token', token)
      .send({ propertyId: 'flat-3', title: 'Studio, Ikeja' })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/v1/agents/me/listings/${other.body.id}/publish`)
      .set('x-agent-token', token)
      .expect(403);
  });

  it('a code cannot be spent twice', async () => {
    const { challenge, code } = await agents.openChallenge({
      purpose: 'grant',
      agentId,
      propertyId: 'flat-4',
      landlordPhone: '+2348077777777',
      now: new Date(),
    });
    await request(app.getHttpServer())
      .post('/v1/authority/confirm')
      .send({ challengeId: challenge.id, code })
      .expect(201);
    await request(app.getHttpServer())
      .post('/v1/authority/confirm')
      .send({ challengeId: challenge.id, code })
      .expect(400);
  });

  it('unpublishes in the same call that withdraws, not on a later sweep', async () => {
    const before = await request(app.getHttpServer())
      .get('/v1/agents/me/listings')
      .set('x-agent-token', token)
      .expect(200);
    expect(
      before.body.find((l: { id: string }) => l.id === listingId).publishedAt,
    ).not.toBeNull();

    const { challenge, code } = await agents.openChallenge({
      purpose: 'revoke',
      agentId,
      propertyId: 'flat-2',
      landlordPhone: '+2348088888888',
      now: new Date(),
    });

    const answered = await request(app.getHttpServer())
      .post('/v1/authority/confirm')
      .send({ challengeId: challenge.id, code })
      .expect(201);

    /*
      The listing is named in the response to the withdrawal itself.

      That is the atomicity claim stated where it can be checked: the landlord
      is told what went dark in the same breath as the confirmation, because it
      went dark inside the same transaction. A cron job that catches up in
      thirty seconds would pass a weaker version of this test and would leave a
      flat on the market for thirty seconds after its owner said stop.
    */
    expect(answered.body.unpublishedListings).toContain(listingId);
    expect((await agents.publishedListings()).map((l) => l.id)).not.toContain(listingId);

    const after = await request(app.getHttpServer())
      .get('/v1/agents/me/listings')
      .set('x-agent-token', token)
      .expect(200);
    expect(after.body.find((l: { id: string }) => l.id === listingId).publishedAt).toBeNull();

    // And republishing it is refused, because the authority is gone.
    await request(app.getHttpServer())
      .post(`/v1/agents/me/listings/${listingId}/publish`)
      .set('x-agent-token', token)
      .expect(403);
  });

  it('a withdrawn identity takes every listing down, on every property', async () => {
    // Rebuild: two properties, both published.
    const properties = ['flat-5', 'flat-6'];
    const ids: string[] = [];
    for (const [index, propertyId] of properties.entries()) {
      const { challenge, code } = await agents.openChallenge({
        purpose: 'grant',
        agentId,
        propertyId,
        landlordPhone: `+23480666666${index}${index}`,
        now: new Date(),
      });
      await request(app.getHttpServer())
        .post('/v1/authority/confirm')
        .send({ challengeId: challenge.id, code })
        .expect(201);

      const draft = await request(app.getHttpServer())
        .post('/v1/agents/me/listings')
        .set('x-agent-token', token)
        .send({ propertyId, title: `Flat ${propertyId}` })
        .expect(201);
      await request(app.getHttpServer())
        .post(`/v1/agents/me/listings/${draft.body.id}/publish`)
        .set('x-agent-token', token)
        .expect(201);
      ids.push(draft.body.id);
    }

    const withdrawn = await request(app.getHttpServer())
      .post(`/v1/review/agents/${agentId}/withdraw-identity`)
      .set('x-reviewer-token', REVIEWER)
      .expect(201);

    for (const id of ids) expect(withdrawn.body.unpublishedListings).toContain(id);
    expect(withdrawn.body.by).toBe('unattributed');

    /*
      Asked of the store, not of the response.

      An earlier version of this stopped at the response body — and it stayed
      green with the cascade's `UPDATE` deleted, because `cascade()` still
      *named* the listings it meant to take down. The server was reporting
      what it intended rather than what happened, and the test was reading the
      report. What has to be checked is the row.
    */
    const stillPublished = await agents.publishedListings();
    for (const id of ids) {
      expect(stillPublished.map((l) => l.id)).not.toContain(id);
    }

    const profile = await request(app.getHttpServer()).get(`/v1/agents/${agentId}`).expect(200);
    expect(profile.body.tier).toBe('unverified');

    // The landlord confirmations are untouched and still live — and prove
    // nothing, because the person they confirmed is no longer verified as
    // being that person.
    const evidence = await agents.evidenceFor(agentId);
    const liveAuthority = evidence.filter((e) => e.kind === 'authority' && !e.revokedAt);
    expect(liveAuthority.length).toBeGreaterThan(0);
    expect(tierOf(evidence, { joinedAt: new Date(0), upheldReports: 0 }, new Date())).toBe(
      'unverified',
    );

    for (const id of ids) {
      await request(app.getHttpServer())
        .post(`/v1/agents/me/listings/${id}/publish`)
        .set('x-agent-token', token)
        .expect(403);
    }
  });

  it('is not a reverse phone directory for accounts that verified nothing', async () => {
    const phone = '+2348044444444';
    const signedUp = await request(app.getHttpServer())
      .post('/v1/agents')
      .send({ displayName: 'Findable Estates', phone })
      .expect(201);

    // Signed up and nothing else: typing the number must not return a name.
    const hidden = await request(app.getHttpServer())
      .get('/v1/agents')
      .query({ phone })
      .expect(404);
    expect(JSON.stringify(hidden.body)).not.toContain('Findable');

    await request(app.getHttpServer())
      .post('/v1/authority/identity')
      .set('x-kyc-token', KYC)
      .send({ agentId: signedUp.body.agentId, vendor: 'smile-id', reference: 'check-2' })
      .expect(201);

    // Verified: now they are a checkable business, which is what they signed
    // up to be.
    const found = await request(app.getHttpServer())
      .get('/v1/agents')
      .query({ phone })
      .expect(200);
    expect(found.body.displayName).toBe('Findable Estates');
    expect(found.body.tier).toBe('identity');

    // And withdrawing the identity takes them back out of the directory.
    await request(app.getHttpServer())
      .post(`/v1/review/agents/${signedUp.body.agentId}/withdraw-identity`)
      .set('x-reviewer-token', REVIEWER)
      .expect(201);
    await request(app.getHttpServer()).get('/v1/agents').query({ phone }).expect(404);
  });

  it('will not let an agent be their own landlord', async () => {
    const signedUp = await request(app.getHttpServer())
      .post('/v1/agents')
      .send({ displayName: 'Two SIM Properties', phone: '+2348033333333' })
      .expect(201);

    await request(app.getHttpServer())
      .post('/v1/agents/me/authority')
      .set('x-agent-token', signedUp.body.token)
      .send({ propertyId: 'flat-7', landlordPhone: '+2348033333333' })
      .expect(403);
  });

  it('publishes nothing above the tier the evidence supports, ever', async () => {
    // The gate stated as a property rather than as a route walk: whatever the
    // profile says, it equals what the domain computes from the stored
    // evidence. If those ever disagree, something is carrying a tier.
    const store = app.get(ReportsStore);
    const agent = await agents.agentById(agentId);
    const evidence = await agents.evidenceFor(agentId);
    const upheld = await store.publishedForHash(agent!.phoneHash);
    const computed = tierOf(
      evidence,
      { joinedAt: agent!.joinedAt, upheldReports: upheld.length },
      new Date(),
    );

    const profile = await request(app.getHttpServer()).get(`/v1/agents/${agentId}`).expect(200);
    expect(profile.body.tier).toBe(computed);
    expect(TIERS).toContain(profile.body.tier);
  });
});
