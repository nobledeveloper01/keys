-- Area guides and applications (ADR-0014, ADR-0015).
--
-- An answer carries a month and never a day, so a guide cannot be walked
-- back to a person; the tenant id is here for the one-answer-per-tenant rule
-- and never leaves the server. An application's profile is the tenant's own
-- words as JSON; there is no numeric column about a person anywhere here.
CREATE TABLE IF NOT EXISTS area_answers (
  seq        BIGSERIAL PRIMARY KEY,
  tenant_id  TEXT NOT NULL,
  area_id    TEXT NOT NULL,
  month      TEXT NOT NULL CHECK (month ~ '^[0-9]{4}-[0-9]{2}$'),
  power      TEXT NOT NULL CHECK (power IN ('under_4h', '4_to_8h', '8_to_16h', 'over_16h')),
  water      TEXT NOT NULL CHECK (water IN ('borehole', 'public_supply', 'water_vendor', 'well')),
  transport  TEXT[] NOT NULL,
  market     TEXT NOT NULL CHECK (market IN ('walking', 'short_ride', 'far'))
);
CREATE INDEX IF NOT EXISTS area_answers_by_area ON area_answers (area_id, seq);

CREATE TABLE IF NOT EXISTS applications (
  id           UUID PRIMARY KEY,
  listing_id   TEXT NOT NULL,
  tenant_id    TEXT NOT NULL,
  agent_id     TEXT NOT NULL,
  profile      JSONB NOT NULL,
  standing     JSONB NOT NULL,
  created_seq  BIGSERIAL
);
CREATE INDEX IF NOT EXISTS applications_by_tenant ON applications (tenant_id);
CREATE INDEX IF NOT EXISTS applications_by_agent ON applications (agent_id);
CREATE INDEX IF NOT EXISTS applications_by_listing ON applications (listing_id);

CREATE TABLE IF NOT EXISTS application_events (
  seq             BIGSERIAL PRIMARY KEY,
  application_id  UUID NOT NULL REFERENCES applications (id),
  event           JSONB NOT NULL
);
CREATE INDEX IF NOT EXISTS application_events_by_application ON application_events (application_id, seq);
