-- Which listing a report is about.
--
-- Nullable, because a report from the registry has a number and no listing —
-- somebody messaged on WhatsApp is the case this product started with, and it
-- is still the common one.
--
-- What this column makes possible is the case that could not be filed at all
-- before it: reports are keyed on a phone number, and deferred contact exchange
-- means a tenant browsing search has never seen one. Somebody looking at a
-- listing they believe is fake could read the whole evidence panel and have no
-- way to say so. The server resolves the agent's hash from the listing, so the
-- reporter still never learns the number.
ALTER TABLE reports ADD COLUMN IF NOT EXISTS listing_id UUID;

-- No foreign key, deliberately.
--
-- A report has to outlive the thing it is about. `ON DELETE CASCADE` would
-- delete the evidence of a fake listing along with the listing, which is a
-- deletion an accused agent could arrange for themselves; `RESTRICT` would stop
-- a listing being removed at all. The id is kept as a plain value and a reader
-- that cannot resolve it says so.
CREATE INDEX IF NOT EXISTS reports_listing ON reports (listing_id) WHERE listing_id IS NOT NULL;
