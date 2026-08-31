/**
 * Re-exported from the domain, where it now lives.
 *
 * Its own module rather than part of `lookup.ts`, still: the report form runs
 * in the browser and `lookup.ts` builds the API client from `KEYS_API_URL`, so
 * importing from there would pull a server-only module into the browser bundle
 * to get one function.
 */
export { normalise } from '@keys/domain';
