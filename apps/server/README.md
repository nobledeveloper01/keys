# The Keys API

NestJS on Node 22, TypeScript strict, Postgres with PostGIS.

## What is unusual about it

**It imports the rules rather than reimplementing them.** `@keys/domain` is a
workspace dependency here exactly as it is in the apps, so `is_verified` is one
function that four consumers call. See
[ADR-0001](../../docs/adr/0001-the-server-imports-the-domain-rather-than-mirroring-it.md).

`GET /healthz` returns the shared vocabulary alongside the usual liveness
fields, which is not decoration: it is served by the same code that renders it
on a device, so a broken import fails the build rather than drifting quietly.

## Running it

```
pnpm --filter @keys/server start:dev
```

Swagger at `/swagger`. Port 5211 by default.

**The store is in-memory unless told otherwise**, and `/healthz` says which it
is. A reviewer should not have to provision Postgres to read the API surface,
and a service that cannot say whether its data survives a restart is one
somebody will eventually trust with data that does not.

```
KEYS_DATABASE_URL=postgres://...   # durable
KEYS_CORS_ORIGINS=http://localhost:3000
```

**CORS is an allow-list by name and a `*` throws at start-up.** Keys has a web
surface from day one. On the previous project there was no CORS policy at all
until a browser client appeared, because a phone sends no preflight; here the
policy exists from the first commit and its default is empty, which means no
browser may call this.
