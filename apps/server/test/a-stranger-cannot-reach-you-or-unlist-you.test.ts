import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Pool } from 'pg';
import * as request from 'supertest';

import { AppModule } from '../src/app.module';
import { AgentsStore } from '../src/agents/agents.store';
import { ReportsStore } from '../src/reports/reports.store';
import {
  KYC_TOKEN,
  REVIEWER_TOKEN,
  aTenant,
  aVerifiedListing,
  type BuiltListing,
} from './helpers/verified';

/**
 * Phase 5's exit gate.
 *
 * *A stranger cannot reach an agent's phone number, and a stranger cannot take
 * a listing down.*
 *
 * Both halves are the same question — what an unknown party may do to
 * somebody — and both have an obvious wrong answer that ships in most
 * marketplaces. The number in the advert is the wrong answer to the first. An
 * automatic suspension only a reviewer can lift is the wrong answer to the
 * second: it hands anyone with an account a way to take a competitor off the
 * market for as long as the queue is.
 *
 * What makes the second safe is that the remedy is evidence rather than an
 * appeal. The agent walks back to the property and photographs it. Ten
 * minutes for somebody who has the flat, impossible for somebody who never
 * did.
 */
const DATABASE_URL = process.env.KEYS_TEST_DATABASE_URL;
const STORES: Array<[name: string, url: string | undefined]> = [
  ['in memory', undefined],
  ...(DATABASE_URL ? ([['postgres', DATABASE_URL]] as Array<[string, string]>) : []),
];

describe.each(STORES)('a stranger cannot reach you or unlist you (%s)', (_name, databaseUrl) => {
  let app: INestApplication;
  let agents: AgentsStore;
  let seed = 400;

  const build = (options: Parameters<typeof aVerifiedListing>[2] extends infer O ? Partial<O> : never = {}) => {
    seed += 1;
    return aVerifiedListing(app, agents, { seed, ...options });
  };

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
      await pool.query('TRUNCATE agents CASCADE');
      await pool.query('TRUNCATE tenants CASCADE');
      await pool.end();
    }
  });

  afterAll(async () => {
    await app.close();
  });

  describe('reaching somebody', () => {
    let listing: BuiltListing;
    let tenant: { id: string; token: string };
    let conversationId: string;

    beforeAll(async () => {
      listing = await build({});
      tenant = await aTenant(app, `Ada ${seed}`);
      const opened = await request(app.getHttpServer())
        .post('/v1/conversations')
        .set('x-tenant-token', tenant.token)
        .send({ listingId: listing.id, body: 'Is this still available?' })
        .expect(201);
      conversationId = opened.body.id;
    });

    it('lets a tenant ask about a listing without giving anything away', async () => {
      const seen = await request(app.getHttpServer())
        .get(`/v1/conversations/${conversationId}`)
        .set('x-tenant-token', tenant.token)
        .expect(200);

      expect(seen.body.exchange).toBe('none');
      expect(seen.body.theirContact).toBeNull();
      // A name, never a number.
      expect(seen.body.otherPartyName).toContain('Agent');
      expect(JSON.stringify(seen.body)).not.toContain('+234');
    });

    it('refuses a message with a number in it, and says why', async () => {
      /*
        Refused rather than stripped. Silently removing the digits would leave
        somebody believing they had sent their number and waiting for a call
        that never comes.
      */
      const refused = await request(app.getHttpServer())
        .post(`/v1/conversations/${conversationId}/messages`)
        .set('x-tenant-token', tenant.token)
        .send({ body: 'call me on 08031234567' })
        .expect(400);
      expect(JSON.stringify(refused.body)).toMatch(/share my number/i);
    });

    it('shows nothing when only one side has offered', async () => {
      const offered = await request(app.getHttpServer())
        .post(`/v1/conversations/${conversationId}/contact`)
        .set('x-tenant-token', tenant.token)
        .send({ contact: '+2348099998888' })
        .expect(201);

      expect(offered.body.exchange).toBe('tenant_offered');
      expect(offered.body.theirContact).toBeNull();

      // And the agent, looking at the same conversation, does not see it
      // either — offering is not the same as giving.
      const asAgent = await request(app.getHttpServer())
        .get('/v1/agent/conversations')
        .set('x-agent-token', listing.token)
        .expect(200);
      const theirs = asAgent.body.find((c: { id: string }) => c.id === conversationId);
      expect(theirs.theirContact).toBeNull();
      expect(JSON.stringify(asAgent.body)).not.toContain('8099998888');
    });

    it('shows both numbers only once both have offered', async () => {
      const agentOffered = await request(app.getHttpServer())
        .post(`/v1/agent/conversations/${conversationId}/contact`)
        .set('x-agent-token', listing.token)
        .send({ contact: '+2348077776666' })
        .expect(201);

      expect(agentOffered.body.exchange).toBe('exchanged');
      // The agent sees the tenant's...
      expect(agentOffered.body.theirContact).toBe('+2348099998888');

      // ...and the tenant sees the agent's, and neither sees their own echoed
      // back, because a response is built for one reader at a time.
      const asTenant = await request(app.getHttpServer())
        .get(`/v1/conversations/${conversationId}`)
        .set('x-tenant-token', tenant.token)
        .expect(200);
      expect(asTenant.body.theirContact).toBe('+2348077776666');
      expect(asTenant.body.exchange).toBe('exchanged');
    });

    it('tells both of them, in the thread, that it happened', async () => {
      const seen = await request(app.getHttpServer())
        .get(`/v1/conversations/${conversationId}`)
        .set('x-tenant-token', tenant.token)
        .expect(200);
      const fromKeys = seen.body.messages.filter((m: { speaker: string }) => m.speaker === 'keys');
      expect(fromKeys).toHaveLength(1);
    });

    it('never shows a conversation to somebody who is not in it', async () => {
      const nosy = await aTenant(app, `Nosy ${seed}`);
      // A 404, not a 403 — a 403 confirms the id is real.
      await request(app.getHttpServer())
        .get(`/v1/conversations/${conversationId}`)
        .set('x-tenant-token', nosy.token)
        .expect(404);

      const otherAgent = await build({});
      await request(app.getHttpServer())
        .post(`/v1/agent/conversations/${conversationId}/contact`)
        .set('x-agent-token', otherAgent.token)
        .send({ contact: '+2348011112222' })
        .expect(404);
    });

    it('lets an offer be taken back until it is answered, and not after', async () => {
      const other = await build({});
      const shy = await aTenant(app, `Shy ${seed}`);
      const opened = await request(app.getHttpServer())
        .post('/v1/conversations')
        .set('x-tenant-token', shy.token)
        .send({ listingId: other.id, body: 'Hello' })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/v1/conversations/${opened.body.id}/contact`)
        .set('x-tenant-token', shy.token)
        .send({ contact: '+2348055554444' })
        .expect(201);

      const back = await request(app.getHttpServer())
        .delete(`/v1/conversations/${opened.body.id}/contact`)
        .set('x-tenant-token', shy.token)
        .expect(200);
      expect(back.body.exchange).toBe('none');

      /*
        And the number is gone, not merely hidden. If the agent now offers
        theirs, that must not complete an exchange against a number the tenant
        withdrew.
      */
      const agentOffers = await request(app.getHttpServer())
        .post(`/v1/agent/conversations/${opened.body.id}/contact`)
        .set('x-agent-token', other.token)
        .send({ contact: '+2348033332222' })
        .expect(201);
      expect(agentOffers.body.exchange).toBe('agent_offered');
      expect(agentOffers.body.theirContact).toBeNull();

      // Once both have offered, it cannot be taken back — they have read it.
      await request(app.getHttpServer())
        .post(`/v1/conversations/${opened.body.id}/contact`)
        .set('x-tenant-token', shy.token)
        .send({ contact: '+2348055554444' })
        .expect(201);
      const refused = await request(app.getHttpServer())
        .delete(`/v1/conversations/${opened.body.id}/contact`)
        .set('x-tenant-token', shy.token)
        .expect(400);
      expect(JSON.stringify(refused.body)).toMatch(/cannot take that back/i);
    });

    it('will not let an unauthenticated request read any of it', async () => {
      await request(app.getHttpServer()).get(`/v1/conversations/${conversationId}`).expect(401);
      await request(app.getHttpServer()).get('/v1/agent/conversations').expect(401);
    });
  });

  describe('taking a listing down', () => {
    async function anInspection(listing: BuiltListing, tenantName: string) {
      const tenant = await aTenant(app, tenantName);
      const opened = await request(app.getHttpServer())
        .post('/v1/conversations')
        .set('x-tenant-token', tenant.token)
        .send({ listingId: listing.id, body: 'Can I see it?' })
        .expect(201);
      const asked = await request(app.getHttpServer())
        .post('/v1/inspections')
        .set('x-tenant-token', tenant.token)
        .send({ conversationId: opened.body.id })
        .expect(201);
      await request(app.getHttpServer())
        .post(`/v1/agent/inspections/${asked.body.id}`)
        .set('x-agent-token', listing.token)
        .send({ agreed: true, feeKobo: 0 })
        .expect(201);
      return { tenant, inspectionId: asked.body.id as string };
    }

    const verified = async (id: string) => {
      const found = await request(app.getHttpServer()).get('/v1/listings').expect(200);
      /*
        Both halves, because a listing that lost its badge must be in neither.

        Checking only `results` would have gone quiet the moment featuring
        landed: a suspended listing sitting in a paid band would still be in
        front of somebody, and this helper would call it gone.
      */
      const body = found.body as { featured: Array<{ id: string }>; results: Array<{ id: string }> };
      return [...body.featured, ...body.results].some((r) => r.id === id);
    };

    it('takes the badge the moment somebody says it was not there', async () => {
      const listing = await build({});
      const { tenant, inspectionId } = await anInspection(listing, `Went ${seed}`);
      expect(await verified(listing.id)).toBe(true);

      await request(app.getHttpServer())
        .post(`/v1/inspections/${inspectionId}/outcome`)
        .set('x-tenant-token', tenant.token)
        .send({ outcome: 'did_not_exist' })
        .expect(201);

      // The very next request. Nothing re-indexes, so nothing can be behind.
      expect(await verified(listing.id)).toBe(false);
      const seen = await request(app.getHttpServer())
        .get(`/v1/listings/${listing.id}`)
        .expect(200);
      expect(seen.body.verified).toBe(false);
      expect(
        seen.body.checks.find(
          (c: { condition: string }) => c.condition === 'nobody_found_it_missing',
        ).met,
      ).toBe(false);
    });

    it('gives it back when the agent goes and photographs the place', async () => {
      /*
        The load-bearing half. Without this the suspension is a button for
        taking a competitor off the market; with it, the remedy is the same
        evidence the badge already rests on and no reviewer is involved.
      */
      const listing = await build({});
      const { tenant, inspectionId } = await anInspection(listing, `Wrong ${seed}`);
      await request(app.getHttpServer())
        .post(`/v1/inspections/${inspectionId}/outcome`)
        .set('x-tenant-token', tenant.token)
        .send({ outcome: 'did_not_exist' })
        .expect(201);
      expect(await verified(listing.id)).toBe(false);

      const again = await listing.captureAgain('photo', seed * 100 + 7);
      expect(again.status).toBe(201);

      expect(await verified(listing.id)).toBe(true);
    });

    it('does not give it back for a photograph taken before the complaint', async () => {
      /*
        The listing was built with an on-site photo, so it already has one —
        from before anybody complained. It proves the flat existed then, which
        nobody disputed. If that lifted the suspension, the suspension would
        never do anything at all.
      */
      const listing = await build({});
      const { tenant, inspectionId } = await anInspection(listing, `Old ${seed}`);
      await request(app.getHttpServer())
        .post(`/v1/inspections/${inspectionId}/outcome`)
        .set('x-tenant-token', tenant.token)
        .send({ outcome: 'did_not_exist' })
        .expect(201);

      expect(await verified(listing.id)).toBe(false);
    });

    it('cannot be immunised in advance by a capture dated in the future', async () => {
      /*
        The hole this feature opened, closed.

        `capturedAt` lives inside the signed claim, so the phone chooses it —
        and a suspension is lifted by a capture taken after the complaint. One
        claim dated 2099, uploaded once, would have immunised a listing against
        every report anybody would ever make, for ever, with a valid signature.
      */
      const listing = await build({});
      const future = new Date(Date.now() + 365 * 24 * 60 * 60_000);
      const refused = await listing.captureAgain('photo', seed * 100 + 3, future);
      expect(refused.status).toBe(400);

      const { tenant, inspectionId } = await anInspection(listing, `Future ${seed}`);
      await request(app.getHttpServer())
        .post(`/v1/inspections/${inspectionId}/outcome`)
        .set('x-tenant-token', tenant.token)
        .send({ outcome: 'did_not_exist' })
        .expect(201);

      expect(await verified(listing.id)).toBe(false);
    });

    it('does not let a stranger with no inspection suspend anything', async () => {
      const listing = await build({});
      const nobody = await aTenant(app, `Nobody ${seed}`);

      // There is no route that takes a listing id and an outcome. The only
      // way in is an inspection this agent agreed to, and it is checked
      // against the tenant on the row.
      await request(app.getHttpServer())
        .post(`/v1/inspections/${listing.id}/outcome`)
        .set('x-tenant-token', nobody.token)
        .send({ outcome: 'did_not_exist' })
        .expect(404);

      expect(await verified(listing.id)).toBe(true);
    });

    it('does not let somebody else record an outcome on your inspection', async () => {
      const listing = await build({});
      const { inspectionId } = await anInspection(listing, `Mine ${seed}`);
      const other = await aTenant(app, `Other ${seed}`);

      await request(app.getHttpServer())
        .post(`/v1/inspections/${inspectionId}/outcome`)
        .set('x-tenant-token', other.token)
        .send({ outcome: 'did_not_exist' })
        .expect(404);

      expect(await verified(listing.id)).toBe(true);
    });

    it('takes an outcome once, so one visit cannot suspend twice', async () => {
      const listing = await build({});
      const { tenant, inspectionId } = await anInspection(listing, `Twice ${seed}`);
      const say = (outcome: string) =>
        request(app.getHttpServer())
          .post(`/v1/inspections/${inspectionId}/outcome`)
          .set('x-tenant-token', tenant.token)
          .send({ outcome });

      await say('as_described').expect(201);
      await say('did_not_exist').expect(400);
      expect(await verified(listing.id)).toBe(true);
    });

    it('does not suspend for a missed appointment or a fee dispute', async () => {
      /*
        Both are worth recording and neither is a claim that the listing is
        fiction. Suspending a real property for a missed appointment would
        make this something agents route around rather than answer.
      */
      for (const outcome of ['agent_did_not_show', 'asked_for_more_money']) {
        const listing = await build({});
        const { tenant, inspectionId } = await anInspection(listing, `${outcome} ${seed}`);
        await request(app.getHttpServer())
          .post(`/v1/inspections/${inspectionId}/outcome`)
          .set('x-tenant-token', tenant.token)
          // The inspection was agreed at a fee of zero, so any figure is more.
          .send({ outcome, paidKobo: outcome === 'asked_for_more_money' ? 5_000_00 : undefined })
          .expect(201);
        expect(await verified(listing.id)).toBe(true);
      }
    });

    it('will not take an outcome before the agent has agreed to show it', async () => {
      const listing = await build({});
      const tenant = await aTenant(app, `Early ${seed}`);
      const opened = await request(app.getHttpServer())
        .post('/v1/conversations')
        .set('x-tenant-token', tenant.token)
        .send({ listingId: listing.id, body: 'Can I see it?' })
        .expect(201);
      const asked = await request(app.getHttpServer())
        .post('/v1/inspections')
        .set('x-tenant-token', tenant.token)
        .send({ conversationId: opened.body.id })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/v1/inspections/${asked.body.id}/outcome`)
        .set('x-tenant-token', tenant.token)
        .send({ outcome: 'did_not_exist' })
        .expect(400);
      expect(await verified(listing.id)).toBe(true);
    });
  });

  describe('reporting a listing you found', () => {
    /*
      The hole deferred contact exchange opened, which nobody would have
      noticed until somebody tried.

      Every report in this product is keyed on a phone number. A tenant who
      found a listing through search has never seen one — that is the entire
      point of the rest of this file. So a person could read the whole evidence
      panel, believe the place was fiction, and have no way at all to say so.
    */
    it('takes a report about a listing from somebody who has never seen a number', async () => {
      const listing = await build({});

      const filed = await request(app.getHttpServer())
        .post('/v1/registry/reports')
        .send({
          listingId: listing.id,
          category: 'fake_listing',
          description: 'I went to this address and the building number does not exist at all.',
        })
        .expect(201);

      expect(filed.body.received).toBe(true);
      // And it comes back with no more about the agent than it went in with.
      expect(JSON.stringify(filed.body)).not.toContain('+234');
    });

    it('reaches the right agent, without the reporter ever supplying one', async () => {
      /*
        Asserted by consequence, not by presence.

        An earlier version of this checked only that the report appeared in the
        reviewer queue with the right listing id — which stayed true when the
        agent hash was set to null, so a report filed against nobody passed the
        test. What proves the link is that upholding it costs *that* agent, and
        nothing else in this file would notice if it did not.
      */
      const listing = await build({});
      const untouched = await build({});

      const filed = await request(app.getHttpServer())
        .post('/v1/registry/reports')
        .send({
          listingId: listing.id,
          category: 'fake_listing',
          description: 'There is a mechanic workshop at this address and no flat above it.',
        })
        .expect(201);

      const queue = await request(app.getHttpServer())
        .get('/v1/review/queue')
        .set('x-reviewer-token', REVIEWER_TOKEN)
        .expect(200);
      const mine = queue.body.reports.find(
        (r: { listingId: string | null }) => r.listingId === listing.id,
      );
      // A reviewer judging whether a place is fiction can open the place.
      expect(mine).toBeDefined();

      /*
        Evidence and a closed reply window, because the domain refuses an
        upheld report without both — and this test is about who the report
        reaches, not about weakening the rules that protect the accused.

        The deadline is moved through the store rather than by waiting seven
        days. That is the one thing here a route cannot do, and doing it any
        other way would mean this file quietly stopped testing the reply window
        it depends on.
      */
      await request(app.getHttpServer())
        .post(`/v1/review/${mine.id}/evidence`)
        .set('x-reviewer-token', REVIEWER_TOKEN)
        .send({
          note: 'Two visitors photographed a mechanic workshop at this address on separate days.',
          source: 'inspection outcomes recorded in the app',
        })
        .expect(200);

      const reports = app.get(ReportsStore);
      const row = await reports.byId(mine.id);
      await reports.replace({ ...row!, replyDeadlineAt: new Date(Date.now() - 86_400_000) });

      await request(app.getHttpServer())
        .post(`/v1/review/${mine.id}/decision`)
        .set('x-reviewer-token', REVIEWER_TOKEN)
        .send({
          decision: 'upheld',
          reasoning:
            'Two independent visits found a workshop at this address and the agent did not answer.',
        })
        .expect(200);

      const reported = await request(app.getHttpServer())
        .get(`/v1/listings/${listing.id}`)
        .expect(200);
      expect(
        reported.body.checks.find(
          (c: { condition: string }) => c.condition === 'nothing_upheld',
        ).met,
      ).toBe(false);

      // And it landed on that agent alone, not on everybody.
      const other = await request(app.getHttpServer())
        .get(`/v1/listings/${untouched.id}`)
        .expect(200);
      expect(other.body.verified).toBe(true);

      expect(filed.body.received).toBe(true);
    });

    it('refuses a listing report about a person rather than a property', async () => {
      // Somebody using another agent's name is doing it across everything they
      // have posted; filing that against one listing makes the report narrower
      // than the problem.
      const listing = await build({});
      const refused = await request(app.getHttpServer())
        .post('/v1/registry/reports')
        .send({
          listingId: listing.id,
          category: 'impersonation',
          description: 'This person is using the name of a firm I know they do not work for.',
        })
        .expect(400);
      expect(JSON.stringify(refused.body)).toMatch(/person rather than a property/i);
    });

    it('refuses a report about a listing nobody can see', async () => {
      // A draft is a 404 here as everywhere, so this route cannot be used to
      // find out which listing ids are real.
      await request(app.getHttpServer())
        .post('/v1/registry/reports')
        .send({
          listingId: '00000000-0000-4000-8000-000000000000',
          category: 'fake_listing',
          description: 'This listing does not exist and I would like to say so about it.',
        })
        .expect(404);
    });

    it('still takes a report with a number and no listing', async () => {
      // The case this product started with: somebody messaged on WhatsApp has
      // a number and no listing at all.
      await request(app.getHttpServer())
        .post('/v1/registry/reports')
        .send({
          reportedPhone: '+2348090000001',
          category: 'inspection_fee_scam',
          description: 'They took five thousand naira to show me a flat and never turned up.',
        })
        .expect(201);
    });

    it('refuses a report with neither a listing nor a number', async () => {
      await request(app.getHttpServer())
        .post('/v1/registry/reports')
        .send({
          category: 'fake_listing',
          description: 'Something happened but I am not saying who or what it was about.',
        })
        .expect(400);
    });
  });

  describe('the inspection fee', () => {
    it('refuses a fee complaint that its own figures contradict', async () => {
      /*
        The agent said ₦5,000 and was paid ₦5,000. Recording "they asked for
        more" would put a mark against somebody who did exactly what they said
        they would — and Keys is not deciding who is telling the truth here,
        only declining to file a claim its own numbers refute.
      */
      const listing = await build({});
      const tenant = await aTenant(app, `Honoured ${seed}`);
      const opened = await request(app.getHttpServer())
        .post('/v1/conversations')
        .set('x-tenant-token', tenant.token)
        .send({ listingId: listing.id, body: 'Can I see it?' })
        .expect(201);
      const asked = await request(app.getHttpServer())
        .post('/v1/inspections')
        .set('x-tenant-token', tenant.token)
        .send({ conversationId: opened.body.id })
        .expect(201);
      await request(app.getHttpServer())
        .post(`/v1/agent/inspections/${asked.body.id}`)
        .set('x-agent-token', listing.token)
        .send({ agreed: true, feeKobo: 5_000_00 })
        .expect(201);

      const say = (paidKobo: number | undefined) =>
        request(app.getHttpServer())
          .post(`/v1/inspections/${asked.body.id}/outcome`)
          .set('x-tenant-token', tenant.token)
          .send({ outcome: 'asked_for_more_money', ...(paidKobo === undefined ? {} : { paidKobo }) });

      // No figure at all is refused: the complaint is about a number.
      await say(undefined).expect(400);
      // Exactly what was declared is not "more".
      await say(5_000_00).expect(400);
      // Less than declared certainly is not.
      await say(1_000_00).expect(400);
      // More than declared is the actual complaint, and it is recorded.
      await say(20_000_00).expect(201);
    });


    it('has to be a number before the visit, and zero is one', async () => {
      const listing = await build({});
      const tenant = await aTenant(app, `Fee ${seed}`);
      const opened = await request(app.getHttpServer())
        .post('/v1/conversations')
        .set('x-tenant-token', tenant.token)
        .send({ listingId: listing.id, body: 'Can I see it?' })
        .expect(201);
      const asked = await request(app.getHttpServer())
        .post('/v1/inspections')
        .set('x-tenant-token', tenant.token)
        .send({ conversationId: opened.body.id })
        .expect(201);

      // Missing is refused: "I charge nothing" is a claim a tenant can hold an
      // agent to, and inventing it from a blank would put words in their mouth.
      await request(app.getHttpServer())
        .post(`/v1/agent/inspections/${asked.body.id}`)
        .set('x-agent-token', listing.token)
        .send({ agreed: true })
        .expect(400);

      const agreed = await request(app.getHttpServer())
        .post(`/v1/agent/inspections/${asked.body.id}`)
        .set('x-agent-token', listing.token)
        .send({ agreed: true, feeKobo: 5_000_00 })
        .expect(201);
      expect(agreed.body.feeKobo).toBe(5_000_00);
      expect(agreed.body.state).toBe('agreed');

      // And the tenant sees the figure before they set off.
      const mine = await request(app.getHttpServer())
        .get('/v1/inspections')
        .set('x-tenant-token', tenant.token)
        .expect(200);
      expect(mine.body.find((i: { id: string }) => i.id === asked.body.id).feeKobo).toBe(5_000_00);
    });
  });
});
