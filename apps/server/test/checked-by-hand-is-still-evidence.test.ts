import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Pool } from 'pg';
import * as request from 'supertest';

import { AppModule } from '../src/app.module';
import { AgentsStore } from '../src/agents/agents.store';
import { KYC_TOKEN, REVIEWER_TOKEN } from './helpers/verified';

/**
 * A check done by hand is evidence, and it names who did it.
 *
 * v1.0 ships without a KYC vendor and without an SMS provider — see
 * `docs/V1-SCOPE.md`. A reviewer looks at the identity document and telephones
 * the landlord. That is slower and does not scale, and it is what the roadmap
 * already committed to with "Lagos-only launch paced to review-console
 * capacity".
 *
 * What it is *not* is a relaxation. The evidence is still evidence a claimant
 * cannot write, the tier ladder is unchanged, and the row says a person did it
 * and what they saw. The thing this file guards is that "we'll do it manually"
 * did not quietly become "we'll skip it".
 */
const DATABASE_URL = process.env.KEYS_TEST_DATABASE_URL;
const STORES: Array<[name: string, url: string | undefined]> = [
  ['in memory', undefined],
  ...(DATABASE_URL ? ([['postgres', DATABASE_URL]] as Array<[string, string]>) : []),
];

describe.each(STORES)('a check done by hand (%s)', (_name, databaseUrl) => {
  let app: INestApplication;
  let agents: AgentsStore;

  const REVIEWER = { 'x-reviewer-token': REVIEWER_TOKEN };

  async function anAgent(suffix: string) {
    const signedUp = await request(app.getHttpServer())
      .post('/v1/agents')
      .send({ displayName: `Agent ${suffix}`, phone: `+2349${suffix}0000` })
      .expect(201);
    return { id: signedUp.body.agentId as string, token: signedUp.body.token as string };
  }

  const tierOf = async (token: string) => {
    const me = await request(app.getHttpServer())
      .get('/v1/agents/me')
      .set('x-agent-token', token)
      .expect(200);
    return me.body.tier as string;
  };

  beforeAll(async () => {
    process.env.KEYS_REVIEWER_TOKEN = REVIEWER_TOKEN;
    // Named, because a check by hand refuses to be attributed to nobody.
    process.env.KEYS_REVIEWERS = `Adaeze:${REVIEWER_TOKEN}`;
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
      await pool.end();
    }
  });

  afterAll(async () => app.close());

  it('lifts an agent off unverified, exactly as a vendor check would', async () => {
    const agent = await anAgent('01');
    expect(await tierOf(agent.token)).toBe('unverified');

    await request(app.getHttpServer())
      .post(`/v1/agent-review/${agent.id}/checked-by-hand`)
      .set(REVIEWER)
      .send({
        kind: 'identity',
        saw: 'NIN card seen in person; name and photograph match the account.',
      })
      .expect(201);

    // The ladder is untouched. `tierOf` reads the *kind* of evidence, not who
    // attested it, so a check by hand climbs the same rung.
    expect(await tierOf(agent.token)).toBe('identity');
  });

  it('records who did it and what they saw', async () => {
    const agent = await anAgent('02');
    const done = await request(app.getHttpServer())
      .post(`/v1/agent-review/${agent.id}/checked-by-hand`)
      .set(REVIEWER)
      .send({
        kind: 'identity',
        saw: 'Voter card seen over video call, held beside their face.',
      })
      .expect(201);

    expect(done.body.by).not.toBe('unattributed');

    const evidence = await agents.evidenceFor(agent.id);
    const attestor = evidence[0]!.attestor;
    /*
      A distinct attestor, not `vendor` with the word "keys" in a free-text
      field. An API reference and a person's recollection are different kinds
      of evidence and the row says which it was.
    */
    expect(attestor.kind).toBe('keys');
    expect(attestor).toMatchObject({ saw: expect.stringContaining('Voter card') });
  });

  it('refuses an account of the evidence too thin to audit', async () => {
    /*
      "Checked" is not a record of anything, and at v1.0 this row is the *only*
      record that a check happened — there is no vendor reference behind it.
    */
    const agent = await anAgent('03');
    for (const saw of [undefined, '', 'checked', 'looks fine']) {
      await request(app.getHttpServer())
        .post(`/v1/agent-review/${agent.id}/checked-by-hand`)
        .set(REVIEWER)
        .send({ kind: 'identity', ...(saw === undefined ? {} : { saw }) })
        .expect(400);
    }
    expect(await tierOf(agent.token)).toBe('unverified');
  });

  it('records a landlord confirmation against the property it is about', async () => {
    const agent = await anAgent('04');
    await request(app.getHttpServer())
      .post(`/v1/agent-review/${agent.id}/checked-by-hand`)
      .set(REVIEWER)
      .send({
        kind: 'identity',
        saw: 'NIN card seen in person; name and photograph match the account.',
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/v1/agent-review/${agent.id}/checked-by-hand`)
      .set(REVIEWER)
      .send({
        kind: 'authority',
        propertyId: '14 Herbert Macaulay Way, Yaba',
        saw: 'Telephoned the landlord on the number given; they confirmed this agent may let it.',
      })
      .expect(201);

    expect(await tierOf(agent.token)).toBe('authority');
  });

  it('refuses a landlord confirmation about no property in particular', async () => {
    // `mayList` matches an authority to a listing by property. One with none
    // would be a landlord confirming nothing, and would match no listing ever.
    const agent = await anAgent('05');
    await request(app.getHttpServer())
      .post(`/v1/agent-review/${agent.id}/checked-by-hand`)
      .set(REVIEWER)
      .send({
        kind: 'authority',
        saw: 'Telephoned the landlord and they said yes to something or other.',
      })
      .expect(400);
  });

  it('refuses to attest when the server cannot name the reviewer', async () => {
    /*
      Every other reviewer route falls back to a reviewer called
      `unattributed` when the server is configured with one shared token. For a
      *decision* that is tolerable — the decision is recorded and the
      deployment is misconfigured.

      Here it is not. At v1.0 this row is the only evidence that a check
      happened at all, because there is no vendor reference behind it, and
      evidence attributed to nobody is what ADR-0006 refuses.

      An earlier version of this file set `KEYS_REVIEWERS` in `beforeAll` and
      never unset it, so the refusal was unreachable and the assertion could
      not fail.
    */
    const agent = await anAgent('07');
    const named = process.env.KEYS_REVIEWERS;
    delete process.env.KEYS_REVIEWERS;
    try {
      const refused = await request(app.getHttpServer())
        .post(`/v1/agent-review/${agent.id}/checked-by-hand`)
        .set(REVIEWER)
        .send({
          kind: 'identity',
          saw: 'NIN card seen in person; name and photograph match the account.',
        })
        .expect(400);
      expect(JSON.stringify(refused.body)).toMatch(/attributed to a person/i);
    } finally {
      if (named !== undefined) process.env.KEYS_REVIEWERS = named;
    }

    expect(await tierOf(agent.token)).toBe('unverified');
  });

  it('is behind the reviewer guard, like every other thing that grants standing', async () => {
    const agent = await anAgent('06');
    await request(app.getHttpServer())
      .post(`/v1/agent-review/${agent.id}/checked-by-hand`)
      .send({ kind: 'identity', saw: 'I have decided that I am verified, thank you.' })
      // 403, the reviewer guard's convention across every route it protects.
      .expect(403);

    // And not with the agent's own token, which is the attack this whole
    // ladder exists to refuse.
    await request(app.getHttpServer())
      .post(`/v1/agent-review/${agent.id}/checked-by-hand`)
      .set('x-agent-token', agent.token)
      .send({ kind: 'identity', saw: 'I have decided that I am verified, thank you.' })
      .expect(403);

    expect(await tierOf(agent.token)).toBe('unverified');
  });
});
