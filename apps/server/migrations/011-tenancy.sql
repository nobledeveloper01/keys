-- The tenancy record (ADR-0009, ADR-0012).
--
-- No amount column that a balance could be summed from: what was recorded
-- lives inside append-only JSON entries the domain folds, and the agreement's
-- rent is a term, not a ledger. There is no UPDATE path on any of these but
-- a condition record's rooms, and that only while nobody has acknowledged —
-- which the controller checks and the acknowledgement table makes visible.
CREATE TABLE IF NOT EXISTS tenancies (
  id                    UUID PRIMARY KEY,
  property_id           TEXT NOT NULL,
  tenant_id             TEXT NOT NULL,
  letting_id            TEXT NOT NULL,
  template_version      TEXT NOT NULL,
  rent_kobo             BIGINT NOT NULL CHECK (rent_kobo > 0),
  period                TEXT NOT NULL CHECK (period IN ('monthly', 'quarterly', 'yearly')),
  periods               INTEGER NOT NULL CHECK (periods > 0),
  caution_deposit_kobo  BIGINT NOT NULL CHECK (caution_deposit_kobo >= 0),
  starts_on             DATE NOT NULL,
  CONSTRAINT tenancy_parties_differ CHECK (tenant_id <> letting_id)
);
CREATE INDEX IF NOT EXISTS tenancies_tenant ON tenancies (tenant_id);
CREATE INDEX IF NOT EXISTS tenancies_letting ON tenancies (letting_id);

CREATE TABLE IF NOT EXISTS tenancy_entries (
  seq         BIGSERIAL PRIMARY KEY,
  tenancy_id  UUID NOT NULL REFERENCES tenancies (id),
  entry       JSONB NOT NULL
);
CREATE INDEX IF NOT EXISTS tenancy_entries_by_tenancy ON tenancy_entries (tenancy_id, seq);

-- A tenant's device key, so a tenant can sign an agreement and acknowledge a
-- condition record the way an agent's device already signs a capture.
CREATE TABLE IF NOT EXISTS tenant_keys (
  tenant_id      TEXT PRIMARY KEY,
  public_key     TEXT NOT NULL,
  registered_at  TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS tickets (
  id           UUID PRIMARY KEY,
  tenancy_id   UUID NOT NULL REFERENCES tenancies (id),
  created_seq  BIGSERIAL
);
CREATE INDEX IF NOT EXISTS tickets_by_tenancy ON tickets (tenancy_id);

CREATE TABLE IF NOT EXISTS ticket_events (
  seq        BIGSERIAL PRIMARY KEY,
  ticket_id  UUID NOT NULL REFERENCES tickets (id),
  event      JSONB NOT NULL
);
CREATE INDEX IF NOT EXISTS ticket_events_by_ticket ON ticket_events (ticket_id, seq);

CREATE TABLE IF NOT EXISTS condition_records (
  id           UUID PRIMARY KEY,
  tenancy_id   UUID NOT NULL REFERENCES tenancies (id),
  walk         TEXT NOT NULL CHECK (walk IN ('move_in', 'move_out')),
  compares_to  UUID REFERENCES condition_records (id),
  rooms        JSONB NOT NULL,
  taken_at     TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS condition_records_by_tenancy ON condition_records (tenancy_id);

CREATE TABLE IF NOT EXISTS condition_acknowledgements (
  seq        BIGSERIAL PRIMARY KEY,
  record_id  UUID NOT NULL REFERENCES condition_records (id),
  by         TEXT NOT NULL,
  at         TIMESTAMPTZ NOT NULL,
  signature  TEXT NOT NULL
);
