-- Evidence a person at Keys produced, with their name on it.
--
-- v1.0 ships without a KYC vendor and without an SMS provider, so a reviewer
-- looks at the identity document and telephones the landlord. See
-- `docs/V1-SCOPE.md`. That is a different attestor from an API returning a
-- reference, and it is recorded as one rather than borrowing `attestor_vendor`
-- and writing the word "keys" into a free-text field nobody validates.
--
-- Both columns, or neither. An attestation by Keys with nobody named is what
-- ADR-0006 exists to refuse: a year from now somebody has to be able to ask the
-- person who made the call what the landlord actually said.
ALTER TABLE agent_evidence
  ADD COLUMN IF NOT EXISTS attestor_reviewer TEXT,
  ADD COLUMN IF NOT EXISTS attestor_saw      TEXT;

ALTER TABLE agent_evidence DROP CONSTRAINT IF EXISTS agent_evidence_by_hand_is_attributed;
ALTER TABLE agent_evidence
  ADD CONSTRAINT agent_evidence_by_hand_is_attributed CHECK (
    attestor_kind <> 'keys'
    OR (attestor_reviewer IS NOT NULL AND attestor_saw IS NOT NULL)
  );

-- The existing constraint pairs each evidence kind with the attestor that may
-- produce it, and it did not know about this one — so the first by-hand
-- identity check was refused by the database, which is the constraint doing
-- exactly its job.
--
-- Rewritten rather than dropped: pairing the kind with the attestor is what
-- stops a landlord "confirming" an identity or a vendor "confirming" a
-- property, and losing that to add a row type would be paying for a feature
-- with a guarantee.
ALTER TABLE agent_evidence DROP CONSTRAINT IF EXISTS evidence_attestor_matches_kind;
ALTER TABLE agent_evidence
  ADD CONSTRAINT evidence_attestor_matches_kind CHECK (
    (kind = 'identity'  AND attestor_kind = 'vendor'
       AND attestor_vendor IS NOT NULL AND attestor_reference IS NOT NULL)
    OR
    (kind = 'authority' AND attestor_kind = 'landlord'
       AND attestor_phone_hash IS NOT NULL AND property_id IS NOT NULL)
    OR
    (kind = 'standing'  AND attestor_kind = 'registry')
    OR
    -- Checked by a person at Keys. Same pairing discipline: an identity is
    -- about a person and carries no property; an authority is about a flat and
    -- must name one.
    (kind = 'identity'  AND attestor_kind = 'keys' AND property_id IS NULL)
    OR
    (kind = 'authority' AND attestor_kind = 'keys' AND property_id IS NOT NULL)
  );
