/**
 * Re-exported from the domain, where it now lives.
 *
 * This file held its own copy, byte-identical to the web's, on the argument
 * that how Nigerians write a phone number is not a rule about reports. That
 * held until the server started hashing phone numbers too and had no copy at
 * all — see `packages/domain/src/phone.ts` for what that cost.
 *
 * Kept as a re-export rather than deleted because every screen imports
 * `../state/phone`, and a rename across the app buys nothing.
 */
export { normalise } from '@keys/domain';
