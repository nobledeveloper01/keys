-- When a paid placement runs out.
--
-- NULL means nobody bought one, which is the case for every listing today and
-- will stay the case for most of them.
--
-- A date rather than a boolean, and rather than a `featured` flag with a job
-- somewhere to clear it. A flag needs something to run; a date is true or false
-- the moment it is read, which is the same reason nothing else in this schema
-- stores whether a listing is Verified.
ALTER TABLE listings ADD COLUMN IF NOT EXISTS featured_until TIMESTAMPTZ;

-- Deliberately no amount column, and no link to a payment.
--
-- There is no payment provider in this product yet, and a `paid_kobo` sitting
-- at zero on every row would read like a feature that works. What exists is the
-- placement; what does not exist is any way to buy one, and that is a release
-- gate rather than a column.
CREATE INDEX IF NOT EXISTS listings_featured ON listings (featured_until)
  WHERE featured_until IS NOT NULL;
