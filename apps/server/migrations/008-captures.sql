-- Devices, the captures they signed, and the nonces they have spent.
--
-- Until this file existed the captures store was memory-only, which meant every
-- photograph and walkthrough in the product evaporated on restart — and with
-- them `capture_on_site` and `walkthrough_video` on every listing. A deploy
-- silently un-verified the entire catalogue. Nothing said so, because the
-- health endpoint reports the *reports* store's durability and this one had no
-- durable implementation to report.

-- A device's public key is written once and never updated.
--
-- There is deliberately no UPDATE path anywhere for `public_key`: an attacker
-- who can rotate a device's key can sign anything as that device. A lost phone
-- is a new device.
CREATE TABLE IF NOT EXISTS devices (
  id            TEXT        PRIMARY KEY,
  agent_id      UUID        NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  public_key    TEXT        NOT NULL,
  registered_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS devices_agent ON devices (agent_id);

-- A nonce is spent once, and the primary key is what enforces it.
--
-- Not a SELECT-then-INSERT: two of those race, and the window between them is
-- exactly long enough to accept the same signed capture twice. `ON CONFLICT DO
-- NOTHING` and a row count is one statement that cannot.
CREATE TABLE IF NOT EXISTS capture_nonces (
  nonce    TEXT        PRIMARY KEY,
  spent_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS captures (
  id               UUID        PRIMARY KEY,
  listing_id       UUID        NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  device_id        TEXT        NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  sha256           TEXT        NOT NULL,
  captured_at      TIMESTAMPTZ NOT NULL,
  latitude         NUMERIC(9,6) NOT NULL,
  longitude        NUMERIC(9,6) NOT NULL,
  -- Stored as it arrived and *not* read back by the Verified computation,
  -- which measures the distance itself from the listing's own coordinates. See
  -- `assessListing`: a listing whose location is corrected has to re-answer
  -- this rather than carry a distance computed against the wrong place.
  distance_m       NUMERIC(10,2),
  kind             TEXT        NOT NULL,
  duration_seconds INTEGER
);

CREATE INDEX IF NOT EXISTS captures_listing ON captures (listing_id);

-- The perceptual hashes, one row per hash per listing.
--
-- Two per image — the full frame and the centre crop — so a border or a
-- watermark does not defeat the match. Stored as TEXT because a 64-bit
-- perceptual hash does not fit a signed BIGINT without wrapping, and a hash
-- that silently changes sign is a hash that stops matching itself.
CREATE TABLE IF NOT EXISTS image_hashes (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  hash       TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS image_hashes_listing ON image_hashes (listing_id);

-- One row per unordered pair, so A→B and B→A are the same question.
--
-- `pair_key` is the sorted join of the two ids and the primary key, which is
-- what makes "a decided pair stays decided" true under concurrency rather than
-- true when a reader remembers to check.
CREATE TABLE IF NOT EXISTS duplicate_pairs (
  pair_key          TEXT        PRIMARY KEY,
  listing_id        UUID        NOT NULL,
  matched_listing_id UUID       NOT NULL,
  distance          INTEGER     NOT NULL,
  first_seen_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  decision          TEXT        NOT NULL DEFAULT 'pending',
  reviewer          TEXT,
  reasoning         TEXT
);

-- The Verified computation asks only this question, on every read.
CREATE INDEX IF NOT EXISTS duplicate_pairs_blocked ON duplicate_pairs (listing_id)
  WHERE decision = 'blocked';
CREATE INDEX IF NOT EXISTS duplicate_pairs_pending ON duplicate_pairs (distance)
  WHERE decision = 'pending';
