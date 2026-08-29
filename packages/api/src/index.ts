/**
 * The wire, in one place.
 *
 * Three faces call this server: the renter and agent apps, the web surface,
 * and the review console. On the previous project the client sat inside the
 * mobile app for months, platform-free the whole time but reachable by only
 * one consumer, and moving it out later touched twenty-eight files. It starts
 * here as a package because we already know a second face is coming.
 *
 * ## Not written by hand
 *
 * NestJS generates an OpenAPI document from the controllers' own decorators,
 * and this client is generated from that document. A hand-written client is a
 * third description of the wire, after the controller and the schema, and it
 * is the one that silently goes stale.
 *
 * The generator lands in phase 1, with the first endpoints it has something to
 * describe. Until then this package exists so that its consumers can depend on
 * it from the first commit rather than importing across an app boundary and
 * being untangled later.
 */

export const PLACEHOLDER = 'keys-api' as const;
