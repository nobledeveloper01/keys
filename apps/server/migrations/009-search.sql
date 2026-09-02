-- Making the existing search fast, without giving it a second opinion.
--
-- See ADR-0008. The rule: a SQL predicate here may only remove rows the domain
-- would also have removed. `matches()` requires every typed word as a
-- *substring*, and trigram ILIKE has exactly those semantics — so this index
-- makes that rule fast rather than replacing it with a different one.
--
-- Deliberately not a tsvector. A `to_tsvector` matches lexemes, so "yab" would
-- stop finding Yaba, and the in-memory store and this one would return
-- different sets — which would end the premise that a suite passing against
-- memory says anything about production. Stemming is also guessing at the
-- morphology of Yoruba and Igbo place names, in English.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- One index over the two fields a search reads, in the order `matches()` reads
-- them. `coalesce` because a listing with no title is a draft, and a draft is
-- not in this query anyway — but an index that produces NULL for one row is an
-- index that quietly skips it.
CREATE INDEX IF NOT EXISTS listings_text_trgm
  ON listings USING gin ((coalesce(title, '') || ' ' || coalesce(property_id, '')) gin_trgm_ops);

-- The bounding box for a near-me search.
--
-- Not PostGIS: `ST_DWithin` would be a second implementation of "is this within
-- 200 m", and `metresBetween` in the domain is the first. The box is a superset
-- of the radius and the domain decides what is actually inside it.
CREATE INDEX IF NOT EXISTS listings_point ON listings (latitude, longitude)
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Published listings are the only ones any search reads.
CREATE INDEX IF NOT EXISTS listings_published ON listings (published_at)
  WHERE published_at IS NOT NULL;
