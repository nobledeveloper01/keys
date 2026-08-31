import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  ESTABLISHED_DAYS,
  ESTABLISHED_PROPERTIES,
  MAX_AGENTS_PER_LANDLORD,
  TIERS,
  cascade,
  landlordIsNotTheAgent,
  mayList,
  tierOf,
  tierSentence,
  type AgentHistory,
  type Evidence,
} from '../src/agents.ts';
const NOW = new Date('2026-08-31T00:00:00Z');
const LONG_AGO = new Date(NOW.getTime() - (ESTABLISHED_DAYS + 30) * 86_400_000);
const CLEAN: AgentHistory = { joinedAt: LONG_AGO, upheldReports: 0 };
function identity(overrides: Partial<Evidence> = {}): Evidence {
  return {
    kind: 'identity',
    agentId: 'agent-1',
    attestor: { kind: 'vendor', vendor: 'smile-id', reference: 'ref-1' },
    at: LONG_AGO,
    revokedAt: null,
    propertyId: null,
    ...overrides,
  };
}
function authority(propertyId: string, overrides: Partial<Evidence> = {}): Evidence {
  return {
    kind: 'authority',
    agentId: 'agent-1',
    attestor: { kind: 'landlord', phoneHash: `landlord-${propertyId}` },
    at: LONG_AGO,
    revokedAt: null,
    propertyId,
    ...overrides,
  };
}
describe('the ladder', () => {
  test('runs from knowing nothing to knowing the most', () => {
    assert.deepEqual([...TIERS], ['unverified', 'identity', 'authority', 'established']);
  });
  test('every tier says what was checked, in a sentence a tenant could go and verify', () => {
    for (const tier of TIERS) {
      const sentence = tierSentence(tier);
      assert.ok(sentence.length > 20, `${tier} needs a real sentence`);
      assert.ok(
        !/^verified/i.test(sentence),
        `${tier} says "verified" instead of naming what was checked`,
      );
    }
  });
});
describe('the tier is computed from evidence and nothing else', () => {
  test('no evidence is unverified, however long they have been here', () => {
    assert.equal(tierOf([], CLEAN, NOW), 'unverified');
  });
  test('identity alone does not let anybody list anything', () => {
    assert.equal(tierOf([identity()], CLEAN, NOW), 'identity');
  });
  test('authority without identity is still unverified', () => {
    // A landlord vouching for a person whose ID was never checked has vouched
    // for a name, not a person. The ladder is climbed in order on purpose.
    assert.equal(tierOf([authority('flat-1')], CLEAN, NOW), 'unverified');
  });
  test('one property is authority, three over six months is established', () => {
    const one = [identity(), authority('flat-1')];
    assert.equal(tierOf(one, CLEAN, NOW), 'authority');
    const three = [identity(), authority('flat-1'), authority('flat-2'), authority('flat-3')];
    assert.equal(tierOf(three, CLEAN, NOW), 'established');
    assert.equal(three.filter((e) => e.kind === 'authority').length, ESTABLISHED_PROPERTIES);
  });
  test('the same property three times is one property', () => {
    // Otherwise `established` costs one landlord and three submissions.
    const repeated = [identity(), authority('flat-1'), authority('flat-1'), authority('flat-1')];
    assert.equal(tierOf(repeated, CLEAN, NOW), 'authority');
  });
  test('a new account cannot be established however many properties it has', () => {
    const yesterday = new Date(NOW.getTime() - 86_400_000);
    const fresh: AgentHistory = { joinedAt: yesterday, upheldReports: 0 };
    const many = [identity(), authority('a'), authority('b'), authority('c'), authority('d')];
    assert.equal(tierOf(many, fresh, NOW), 'authority');
  });
  test('an upheld report costs the top tier and nothing below it', () => {
    const many = [identity(), authority('a'), authority('b'), authority('c')];
    const reported: AgentHistory = { joinedAt: LONG_AGO, upheldReports: 1 };
    assert.equal(tierOf(many, reported, NOW), 'authority');
    // Not unverified: a report is an accusation, and a tier that an accusation
    // can flatten is a tier anybody willing to file can lower.
    assert.notEqual(tierOf(many, reported, NOW), 'unverified');
  });
  test('revoked evidence proves nothing from the moment it is revoked', () => {
    const yesterday = new Date(NOW.getTime() - 86_400_000);
    const withdrawn = [identity(), authority('flat-1', { revokedAt: yesterday })];
    assert.equal(tierOf(withdrawn, CLEAN, NOW), 'identity');
    // Revoked in the future is not revoked yet.
    const tomorrow = new Date(NOW.getTime() + 86_400_000);
    const pending = [identity(), authority('flat-1', { revokedAt: tomorrow })];
    assert.equal(tierOf(pending, CLEAN, NOW), 'authority');
  });
  test('losing identity takes everything above it down too', () => {
    const yesterday = new Date(NOW.getTime() - 86_400_000);
    const revoked = [
      identity({ revokedAt: yesterday }),
      authority('a'),
      authority('b'),
      authority('c'),
    ];
    assert.equal(tierOf(revoked, CLEAN, NOW), 'unverified');
  });
});
describe('the self-attestation the OTP flow invites', () => {
  test('an agent cannot be their own landlord', () => {
    const own = { kind: 'landlord', phoneHash: 'agent-sim-2' } as const;
    assert.ok(!landlordIsNotTheAgent(own, ['agent-sim-1', 'agent-sim-2']));
    assert.ok(landlordIsNotTheAgent(own, ['agent-sim-1']));
  });
  test('a vendor attestation is never blocked by the agent phone check', () => {
    const vendor = { kind: 'vendor', vendor: 'smile-id', reference: 'r' } as const;
    assert.ok(landlordIsNotTheAgent(vendor, ['anything']));
  });
  test('one landlord number may not lift an unbounded number of accounts', () => {
    assert.ok(MAX_AGENTS_PER_LANDLORD > 1, 'a real landlord may use more than one agent');
    assert.ok(MAX_AGENTS_PER_LANDLORD < 20, 'a farm must trip the ceiling');
  });
});
describe('authority is about a person and a flat together', () => {
  test('an established agent may not list a property nobody gave them', () => {
    const evidence = [identity(), authority('a'), authority('b'), authority('c')];
    assert.equal(tierOf(evidence, CLEAN, NOW), 'established');
    assert.ok(mayList(evidence, 'a', NOW));
    assert.ok(!mayList(evidence, 'someone-elses-flat', NOW));
  });
  test('revocation ends the right to list that property immediately', () => {
    const yesterday = new Date(NOW.getTime() - 86_400_000);
    const evidence = [identity(), authority('a', { revokedAt: yesterday })];
    assert.ok(!mayList(evidence, 'a', NOW));
  });
});
describe('what a revocation takes down', () => {
  const listings = [
    { id: 'l1', agentId: 'agent-1', propertyId: 'a', publishedAt: NOW },
    { id: 'l2', agentId: 'agent-1', propertyId: 'a', publishedAt: null },
    { id: 'l3', agentId: 'agent-1', propertyId: 'b', publishedAt: NOW },
    { id: 'l4', agentId: 'agent-2', propertyId: 'a', publishedAt: NOW },
  ];
  test('every published listing on that property, and only that property', () => {
    assert.deepEqual(cascade(authority('a'), listings), ['l1']);
  });
  test('and only that agent — two agents may hold authority on one property', () => {
    assert.ok(!cascade(authority('a'), listings).includes('l4'));
  });
  test('a revoked identity takes down everything that agent has published', () => {
    assert.deepEqual(cascade(identity(), listings), ['l1', 'l3']);
  });
  test('a draft stays a draft; nothing unpublishes what was never published', () => {
    assert.ok(!cascade(identity(), listings).includes('l2'));
  });
});
describe('descending the ladder', () => {
  test('a revoked identity ends the right to list, authority or no authority', () => {
    const yesterday = new Date(NOW.getTime() - 86_400_000);
    const evidence = [identity({ revokedAt: yesterday }), authority('a')];
    // The landlord confirmation is untouched and still live. It confirmed a
    // person whose ID has since been withdrawn, so it confirms nothing.
    assert.ok(evidence[1]!.revokedAt === null);
    assert.equal(tierOf(evidence, CLEAN, NOW), 'unverified');
    assert.ok(!mayList(evidence, 'a', NOW));
  });
});
