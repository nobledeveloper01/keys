-- Tier changes as events (ADR-0019).
--
-- The tier itself is still computed on every read and stored nowhere; this
-- is what the computation last *observed*, and the changes it noticed. Both
-- are written by the computation and read by nothing that decides a tier.
CREATE TABLE IF NOT EXISTS tier_observations (
  agent_id UUID PRIMARY KEY,
  tier     TEXT NOT NULL CHECK (tier IN ('unverified', 'identity', 'authority', 'established')),
  seen_at  TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS tier_changes (
  seq       BIGSERIAL PRIMARY KEY,
  agent_id  UUID NOT NULL,
  from_tier TEXT NOT NULL,
  to_tier   TEXT NOT NULL,
  at        TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS tier_changes_by_agent ON tier_changes (agent_id, seq);
