import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';

import { EN, LANGUAGES, say } from '@keys/domain';
import { AppModule } from '../src/app.module';

/**
 * Phase 0's exit gate, made executable.
 *
 * "One domain package imported by mobile, web and server, proven in CI."
 *
 * This is the server third of it. The point is not that `/healthz` answers —
 * it is that the values it answers with come out of the same module the phone
 * imports, so there is no second implementation that could disagree. See
 * ADR-0001.
 *
 * The runtime half of this was written first and was too weak. Replacing the
 * shared values in the controller with hard-coded literals left it green,
 * which is the exact failure the gate exists to catch. The structural test at
 * the bottom is what actually catches it, and it was added only after the
 * probe showed the first one would not.
 */
describe('the server and the phone share one rules package', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('serves values that came from @keys/domain, not from a copy', async () => {
    const res = await request(app.getHttpServer()).get('/healthz').expect(200);

    // Compared against the imported module rather than against a literal.
    // A literal here would still pass if the server grew its own copy of the
    // vocabulary, which is the exact failure this repository is arranged to
    // make impossible.
    expect(res.body.languages).toEqual(LANGUAGES);
    expect(res.body.verified).toBe(say('en', 'verified'));
    expect(res.body.verified).toBe(EN.verified);
  });

  it('says whether its store is durable rather than leaving it to be assumed', async () => {
    const res = await request(app.getHttpServer()).get('/healthz').expect(200);

    // In-memory by default so a reviewer need not provision Postgres, and it
    // has to say so. A service that cannot answer this is one somebody will
    // eventually trust with data that does not survive a restart.
    expect(typeof res.body.durable).toBe('boolean');
    expect(res.body.durable).toBe(Boolean(process.env.KEYS_DATABASE_URL));
    expect(res.body.store).toBe(process.env.KEYS_DATABASE_URL ? 'postgres' : 'in-memory');
  });
});

describe('and no server file keeps its own copy of the vocabulary', () => {
  /*
    The structural half, and the one with teeth.

    Comparing a response against the imported module proves the import
    resolves. It does not prove the server is *using* it: replacing
    `say('en', 'verified')` with the literal 'Verified' passes that check
    happily, because the literal and the module agree.

    This walks the server source instead and fails on any string literal that
    matches a phrase in the table. A copy of a rule is not wrong because it is
    currently different; it is wrong because nothing stops it becoming
    different, and by then two surfaces disagree and neither looks broken.
  */
  it('fails on a literal that duplicates a phrase', () => {
    const src = join(__dirname, '..', 'src');
    const values = new Set(Object.values(EN).map((v) => v.trim()).filter((v) => v.length > 2));

    const offenders: string[] = [];
    for (const file of readdirSync(src).filter((f) => f.endsWith('.ts'))) {
      const text = readFileSync(join(src, file), 'utf8');
      /*
        Every quoted string, then filtered by length. Not the other way round.

        The first version matched only literals of three characters or more,
        which meant it skipped `'ok'` — and skipping one quote puts the scan
        out of phase, so from there it pairs the closing quote of one string
        with the opening quote of the next and every later match is nonsense.
        It reported nothing and looked like a passing check. Found by feeding
        it a copy it was supposed to catch.
      */
      for (const match of text.matchAll(/'([^'\\]*(?:\\.[^'\\]*)*)'|"([^"\\]*(?:\\.[^"\\]*)*)"/g)) {
        const literal = (match[1] ?? match[2] ?? '').trim();
        if (literal.length > 2 && values.has(literal)) offenders.push(`${file}: ${literal}`);
      }
    }

    expect(offenders).toEqual([]);
  });
});
