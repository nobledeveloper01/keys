-- Saved searches (ADR-0020): the box and the answer it last saw. The
-- parameters and the snapshot are JSON because they are read whole and
-- compared by the domain, never queried by column.
CREATE TABLE IF NOT EXISTS saved_searches (
  id        UUID PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  params    JSONB NOT NULL,
  seen      JSONB NOT NULL,
  saved_at  TIMESTAMPTZ NOT NULL,
  read_at   TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS saved_searches_by_tenant ON saved_searches (tenant_id, saved_at);
