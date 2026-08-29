# Keys — the gates.
#
# `make ci` is the one that matters. Everything in it has been proved to fire
# by being broken on purpose at least once; a guard nobody has watched fail is
# a guard nobody knows works.

.DEFAULT_GOAL := help

## help: list targets
help:
	@grep -E '^##' Makefile | sed 's/## //'

## setup: install everything
setup:
	pnpm install

## db: create the local databases the tests and dev server use
db:
	@createdb keys_test 2>/dev/null || true
	@createdb keys_dev  2>/dev/null || true
	@echo "keys_test and keys_dev ready"

## test: the domain tests, and every app's own — against Postgres when it is reachable
test:
	@# The server suites run against every store implementation. Without a
	@# database they run against a Map, which proves something about a Map and
	@# not about the server that ships — so this finds one if it can, and says
	@# plainly when it cannot rather than passing quietly on half the coverage.
	@if pg_isready -q 2>/dev/null; then \
		createdb keys_test 2>/dev/null || true; \
		KEYS_TEST_DATABASE_URL="postgres://$${USER}@localhost/keys_test" pnpm test; \
	else \
		echo ""; \
		echo "  ! No Postgres reachable. The server suites will run against the"; \
		echo "    in-memory store only, which is not what ships. Start Postgres"; \
		echo "    and re-run to cover both."; \
		echo ""; \
		pnpm test; \
	fi

## typecheck: tsc across the workspace
typecheck:
	pnpm typecheck

## lint: eslint across the workspace
lint:
	pnpm lint

## boundary: prove the domain purity rule still fires
boundary:
	./scripts/boundary-check.sh

## doc-check: the documentation gate
doc-check:
	./scripts/doc-check.sh

## wired-check: find code that is written, tested and called by nothing
wired-check:
	python3 scripts/wired-check.py

## untranslated: find strings on a screen that never reach the phrase table
untranslated:
	python3 scripts/untranslated-check.py

## gates: every blocking check, without the tests
gates: typecheck lint boundary doc-check wired-check untranslated api-fresh

## ci: the gate
ci: gates test

## api: regenerate openapi.json and the typed client from the controllers
api:
	pnpm --filter @keys/server run build
	node apps/server/dist/emit-openapi.js
	pnpm --filter @keys/api exec openapi-typescript openapi.json -o src/schema.ts

## api-fresh: fail when the generated client no longer matches the controllers
api-fresh:
	@./scripts/api-fresh.sh

## clean: build output and caches; node_modules is left alone
clean:
	find . -name '*.tsbuildinfo' -not -path './node_modules/*' -delete
	rm -rf apps/server/dist packages/*/dist
	@echo "cleaned — node_modules left alone"

.PHONY: help setup db test typecheck lint boundary doc-check wired-check untranslated api api-fresh gates ci clean
