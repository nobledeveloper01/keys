#!/usr/bin/env bash
#
# Fails when the committed wire description no longer matches the controllers.
#
# `openapi.json` and `schema.ts` are generated, and generated files rot exactly
# like documentation: silently, while everything still compiles. A route added
# without regenerating leaves every consumer typed against a server that has
# moved. This regenerates into a scratch copy and diffs.
set -euo pipefail

cd "$(dirname "$0")/.."

green=$'\033[32m'; red=$'\033[31m'; off=$'\033[0m'

DOC=packages/api/openapi.json
SCHEMA=packages/api/src/schema.ts

for f in "$DOC" "$SCHEMA"; do
  if [ ! -f "$f" ]; then
    echo "${red}$f does not exist — run 'make api'${off}" >&2
    exit 1
  fi
done

work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT

cp "$DOC" "$work/openapi.before.json"
cp "$SCHEMA" "$work/schema.before.ts"

pnpm --filter @keys/server run build >/dev/null 2>&1
node apps/server/dist/emit-openapi.js >/dev/null
pnpm --filter @keys/api exec openapi-typescript openapi.json -o src/schema.ts >/dev/null 2>&1

stale=0
if ! diff -q "$work/openapi.before.json" "$DOC" >/dev/null; then
  echo "${red}✗${off} $DOC is stale — the controllers describe a different API"
  diff -u "$work/openapi.before.json" "$DOC" | head -40 || true
  stale=1
fi
if ! diff -q "$work/schema.before.ts" "$SCHEMA" >/dev/null; then
  echo "${red}✗${off} $SCHEMA is stale — regenerate it from the document"
  stale=1
fi

# The gate's own liveness check. If the emitter silently produced nothing, the
# two diffs above pass and this reports clean over an empty description.
routes=$(python3 -c "import json;print(len(json.load(open('$DOC'))['paths']))")
if [ "$routes" -lt 1 ]; then
  echo "${red}✗${off} the emitted document describes no routes at all"
  stale=1
fi

if [ "$stale" -ne 0 ]; then
  echo
  echo "run 'make api' and commit what it changes"
  exit 1
fi

echo "${green}the generated client matches the controllers${off} ($routes routes)"
