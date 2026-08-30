-- Who decided what, and why.
--
-- Append-only by intent: there is no code path that updates or deletes a row
-- here. A decision that publishes a public accusation about a named person has
-- to be answerable a year later, and "the reports table says upheld" does not
-- answer who, when, or on what reasoning.
--
-- This is the audit trail section 4 of the backend spec asks for, and it is
-- also what makes the review console's throughput measurable — which is phase
-- 1's third exit gate.

CREATE TABLE IF NOT EXISTS decisions (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  report_id   UUID        NOT NULL REFERENCES reports(id) ON DELETE CASCADE,

  -- The reviewer's name, resolved from their token by the guard. Never the
  -- token itself.
  reviewer    TEXT        NOT NULL,

  action      TEXT        NOT NULL,

  -- Mandatory. A decision with no stated reasoning is a decision nobody can
  -- review, including the person who made it.
  reasoning   TEXT        NOT NULL,

  decided_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT decisions_action_known CHECK (
    action IN ('upheld', 'not_upheld', 'insufficient_evidence', 'evidence_recorded')
  ),
  CONSTRAINT decisions_reasoning_substantive CHECK (length(reasoning) >= 20)
);

CREATE INDEX IF NOT EXISTS decisions_by_report ON decisions (report_id, decided_at);
CREATE INDEX IF NOT EXISTS decisions_by_reviewer ON decisions (reviewer, decided_at);
