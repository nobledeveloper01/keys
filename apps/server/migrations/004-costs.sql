-- What a place actually costs to move into.
--
-- The advert says ₦800,000. The tenant pays ₦1,100,000 — agency fee, agreement
-- fee, caution deposit, service charge. None of that is secret; it is simply
-- never added up anywhere before the day somebody is asked for it.
--
-- BIGINT kobo, not NUMERIC naira. Nothing here divides, every figure is a whole
-- number of kobo, and an integer column cannot quietly acquire a fractional
-- rounding difference the way a scaled decimal can under a careless cast.
--
-- All five columns are nullable together and set together. NULL means the agent
-- has not said; zero means "there is nothing to pay", which is a claim they can
-- be reported for breaking. That distinction is the whole reason this table
-- change exists, so it must not be collapsed into a DEFAULT 0.
ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS annual_rent_kobo      BIGINT,
  ADD COLUMN IF NOT EXISTS agency_fee_kobo       BIGINT,
  ADD COLUMN IF NOT EXISTS legal_fee_kobo        BIGINT,
  ADD COLUMN IF NOT EXISTS caution_deposit_kobo  BIGINT,
  ADD COLUMN IF NOT EXISTS service_charge_kobo   BIGINT;

-- Stated in full or not at all. A half-filled cost breakdown is worse than an
-- empty one: it reads as complete and is not, which is the exact failure this
-- is meant to prevent.
ALTER TABLE listings
  DROP CONSTRAINT IF EXISTS listings_costs_all_or_nothing;
ALTER TABLE listings
  ADD CONSTRAINT listings_costs_all_or_nothing CHECK (
    num_nulls(annual_rent_kobo, agency_fee_kobo, legal_fee_kobo,
              caution_deposit_kobo, service_charge_kobo) IN (0, 5)
  );

-- No negative money, and rent above zero where costs are stated at all.
ALTER TABLE listings
  DROP CONSTRAINT IF EXISTS listings_costs_sane;
ALTER TABLE listings
  ADD CONSTRAINT listings_costs_sane CHECK (
    annual_rent_kobo IS NULL OR (
      annual_rent_kobo > 0 AND agency_fee_kobo >= 0 AND legal_fee_kobo >= 0
      AND caution_deposit_kobo >= 0 AND service_charge_kobo >= 0
    )
  );
