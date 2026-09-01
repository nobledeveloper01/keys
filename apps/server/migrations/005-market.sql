-- Tenants, conversations, inspections and suspensions.

CREATE TABLE IF NOT EXISTS tenants (
  id         UUID        PRIMARY KEY,
  name       TEXT        NOT NULL,
  phone_hash TEXT        NOT NULL,
  joined_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tenant_tokens (
  token_hash TEXT PRIMARY KEY,
  tenant_id  UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE
);

-- One thread per tenant per listing.
--
-- The unique constraint is the feature, not an optimisation: a tenant who taps
-- twice must not get two threads, and an agent must not get the same person
-- twice in their list — which is a nuisance at one account and a way to flood
-- somebody's inbox at a hundred.
CREATE TABLE IF NOT EXISTS conversations (
  id         UUID        PRIMARY KEY,
  listing_id UUID        NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  tenant_id  UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  agent_id   UUID        NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  exchange   TEXT        NOT NULL DEFAULT 'none',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- The only readable phone numbers in this schema, and they are here rather
  -- than on an account for a reason worth stating in the table.
  --
  -- Every other phone in this product is a hash, because the only thing done
  -- with one is match it. A number that has to be *revealed* cannot be hashed,
  -- so it lives in the one place whose entire purpose is revealing it once, to
  -- one person, after both of them agreed. A conversation where nobody offered
  -- holds no number at all, and withdrawing an offer sets the column back to
  -- NULL rather than merely flipping a flag.
  tenant_contact TEXT,
  agent_contact  TEXT,

  UNIQUE (listing_id, tenant_id)
);

CREATE INDEX IF NOT EXISTS conversations_tenant ON conversations (tenant_id);
CREATE INDEX IF NOT EXISTS conversations_agent  ON conversations (agent_id);

CREATE TABLE IF NOT EXISTS messages (
  id              UUID        PRIMARY KEY,
  conversation_id UUID        NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  speaker         TEXT        NOT NULL,
  body            TEXT        NOT NULL,
  sent_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS messages_conversation ON messages (conversation_id, sent_at);

CREATE TABLE IF NOT EXISTS inspections (
  id         UUID        PRIMARY KEY,
  listing_id UUID        NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  tenant_id  UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  state      TEXT        NOT NULL DEFAULT 'requested',

  -- What the agent said they would charge to show it, in kobo. Declared before
  -- the visit so that asking for more at the door is a broken claim rather
  -- than a disagreement about what was said.
  fee_kobo   BIGINT      NOT NULL DEFAULT 0,
  outcome    TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS inspections_tenant  ON inspections (tenant_id);
CREATE INDEX IF NOT EXISTS inspections_listing ON inspections (listing_id);

-- A listing somebody went to and did not find.
--
-- Deliberately has no expiry column. A suspension that timed out would make
-- waiting the cheapest response to a true report, which is exactly backwards.
-- It is lifted by a fresh signed capture at the property — taken *after*
-- `at`, which is why the timestamp matters — or by a reviewer, and by nothing
-- else.
CREATE TABLE IF NOT EXISTS suspensions (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  listing_id  UUID        NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  reported_by UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  lifted_at   TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS suspensions_listing ON suspensions (listing_id) WHERE lifted_at IS NULL;
