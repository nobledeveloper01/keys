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

## test: the domain tests, and every app's own
test:
	pnpm test

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

.PHONY: help setup test typecheck lint boundary doc-check wired-check untranslated api api-fresh gates ci clean
