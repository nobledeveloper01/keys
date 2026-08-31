-- Agents, the evidence their tier is computed from, and what they list.
--
-- Read the columns and notice what is not here: there is no `tier`. It is
-- computed by `tierOf` from the rows in `agent_evidence` on every read, which
-- is what makes phase 2's gate a property of the schema rather than a promise
-- about the controllers. A column would be a thing an UPDATE could set, and
-- once one exists somebody eventually writes to it from a request body.

CREATE TABLE IF NOT EXISTS agents (
  id           UUID        PRIMARY KEY,
  display_name TEXT        NOT NULL,

  -- Hashed, like every phone number in this product. Keys answers about
  -- numbers it is asked; it does not hold a list of them to be stolen.
  phone_hash   TEXT        NOT NULL,

  -- The digest of the session token, never the token. Shown once at sign-up.
  token_hash   TEXT        NOT NULL UNIQUE,

  joined_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS agents_phone_hash ON agents (phone_hash);

CREATE TABLE IF NOT EXISTS agent_evidence (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  agent_id    UUID        NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  kind        TEXT        NOT NULL,

  -- Who attested. There is deliberately no 'self'.
  attestor_kind      TEXT NOT NULL,
  attestor_vendor    TEXT,
  attestor_reference TEXT,
  attestor_phone_hash TEXT,

  property_id TEXT,
  attested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at  TIMESTAMPTZ,

  CONSTRAINT evidence_kind_known CHECK (kind IN ('identity', 'authority', 'standing')),

  -- The invariant from the domain, restated where a psql session cannot get
  -- around it: identity comes from a vendor, authority from a landlord.
  CONSTRAINT evidence_attestor_matches_kind CHECK (
    (kind = 'identity'  AND attestor_kind = 'vendor'
       AND attestor_vendor IS NOT NULL AND attestor_reference IS NOT NULL)
    OR
    (kind = 'authority' AND attestor_kind = 'landlord'
       AND attestor_phone_hash IS NOT NULL AND property_id IS NOT NULL)
    OR
    (kind = 'standing'  AND attestor_kind = 'registry')
  )
);

CREATE INDEX IF NOT EXISTS agent_evidence_agent ON agent_evidence (agent_id);
CREATE INDEX IF NOT EXISTS agent_evidence_landlord ON agent_evidence (attestor_phone_hash);

CREATE TABLE IF NOT EXISTS landlord_challenges (
  id                  UUID        PRIMARY KEY,
  purpose             TEXT        NOT NULL,
  agent_id            UUID        NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  property_id         TEXT        NOT NULL,
  landlord_phone_hash TEXT        NOT NULL,

  -- The digest. The code itself exists in this process for exactly as long as
  -- it takes to hand it to the outbox, and is never stored or returned.
  code_hash           TEXT        NOT NULL,

  attempts            INT         NOT NULL DEFAULT 0,
  used                BOOLEAN     NOT NULL DEFAULT FALSE,
  expires_at          TIMESTAMPTZ NOT NULL,

  CONSTRAINT challenge_purpose_known CHECK (purpose IN ('grant', 'revoke'))
);

CREATE TABLE IF NOT EXISTS listings (
  id           UUID        PRIMARY KEY,
  agent_id     UUID        NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  property_id  TEXT        NOT NULL,
  title        TEXT        NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS listings_agent ON listings (agent_id);
CREATE INDEX IF NOT EXISTS listings_property ON listings (property_id);

-- When somebody last said a listing is still available.
--
-- Nullable, and deliberately not defaulted to `created_at`. A listing that has
-- never been confirmed has never been confirmed; treating publication as a
-- confirmation would hand every listing a free fortnight of Verified and make
-- the first confirmation the one nobody ever does.
ALTER TABLE listings ADD COLUMN IF NOT EXISTS last_confirmed_at TIMESTAMPTZ;

-- Where a property is.
--
-- `NUMERIC(9,6)` rather than `DOUBLE PRECISION`: six decimal places is about
-- eleven centimetres, far finer than a phone's GPS, and an exact decimal type
-- means a coordinate written is the coordinate read. PostGIS lands with search
-- in phase 4; this is what `capture_on_site` needs to be answerable at all.
ALTER TABLE listings ADD COLUMN IF NOT EXISTS latitude NUMERIC(9,6);
ALTER TABLE listings ADD COLUMN IF NOT EXISTS longitude NUMERIC(9,6);
