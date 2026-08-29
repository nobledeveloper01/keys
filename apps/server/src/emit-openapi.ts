/**
 * Writes `packages/api/openapi.json` from the running controllers.
 *
 * Part of the server's own build rather than a loose script, because it has to
 * boot Nest to read the decorators, and a thing that boots Nest needs Nest's
 * compiler output. Run it with `make api`; the gate runs it again and compares.
 */
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { emit } from './openapi';

const target = resolve(__dirname, '../../../packages/api/openapi.json');

void emit()
  .then((document) => {
    writeFileSync(target, JSON.stringify(document, null, 2) + '\n');
    console.log(`wrote ${target}`);
  })
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
