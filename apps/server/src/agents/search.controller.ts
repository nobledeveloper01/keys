import { Controller, Get, NotFoundException, Param, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { viewCosts } from './costs.view';
import {
  VERIFIED_CONDITIONS,
  conditionStepPhrase,
  isPlausiblePoint,
  DISTANCE_HORIZON_M,
  boundingBox,
  featuredAmong,
  matches,
  moveInCostKobo,
  withoutFeatured,
  rank,
  say,
  type Language,
  type Point,
} from '@keys/domain';

import { CapturesStore } from '../captures/captures.store';
import { ReportsStore } from '../reports/reports.store';
import { MarketStore } from '../market/market.store';
import { MediaStore } from '../captures/media.store';
import { AgentsStore, type Listing } from './agents.store';
import { assessListing } from './assess';
import { SearchResponse, ListingView } from './agents.dto';

/**
 * What a tenant can find. No account, like the registry.
 *
 * ## The one rule this whole controller exists to keep
 *
 * **Verified is computed here, on every search, from the same evidence the
 * agent's own screen reads.** It is not a column, not a materialised view, and
 * not an index that a job refreshes. A listing whose landlord withdrew
 * authority this morning is gone from this afternoon's results because the
 * authority is gone — nothing had to notice, and no re-index can be behind.
 *
 * The cost is real: this reads evidence per listing rather than filtering on a
 * boolean. At Lagos scale that is fine, and the moment it is not, the fix is a
 * cache that is *invalidated by the same events* — not a stored answer that
 * drifts.
 */
@ApiTags('search')
@Controller('v1/listings')
export class SearchController {
  constructor(
    private readonly store: AgentsStore,
    private readonly reports: ReportsStore,
    private readonly captures: CapturesStore,
    private readonly media: MediaStore,
    private readonly market: MarketStore,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Published listings, Verified first. No account required.' })
  @ApiOkResponse({ type: SearchResponse })
  async search(
    @Query('q') q?: string,
    @Query('latitude') latitude?: string,
    @Query('longitude') longitude?: string,
    @Query('verifiedOnly') verifiedOnly?: string,
  ) {
    const now = new Date();
    const typed = (q ?? '').slice(0, 120);
    const near = this.pointFrom(latitude, longitude);

    /*
      Narrowed in SQL, decided here. ADR-0008.

      The store is given the words and a box and returns a *superset*: every
      listing the domain would keep, plus some it will not. `matches()` is
      still the only definition of a match and `metresBetween` is still the
      only definition of distance — the query makes them fast, it does not
      replace them.

      The box is the ranking horizon rather than a filter the caller chose. A
      listing beyond it scores zero for closeness anyway, so fetching it costs
      a row and changes no answer; a smaller box would start deciding.
    */
    const words = typed.trim().toLowerCase().split(/\s+/).filter((word) => word.length > 0);
    const wanted = (
      await this.store.searchable({
        words,
        box: near ? boundingBox(near, DISTANCE_HORIZON_M) : null,
      })
    ).filter((l) => matches([l.title, l.propertyId], typed));

    const assessed = await Promise.all(wanted.map((l) => this.assess(l, now)));

    /*
      Filtered *after* assessing, not before.

      The filter has to read the same computed answer the badge does. A query
      that filtered on a stored `is_verified` would be fast and would show
      listings that lost their badge an hour ago.
    */
    const shown =
      verifiedOnly === 'false' ? assessed : assessed.filter((a) => a.verified);

    const ranked = rank(shown, near, now).map(({ listing, because }) => ({
      id: listing.id,
      title: listing.title,
      address: listing.propertyId,
      verified: listing.verified,
      agentName: listing.agentName,
      /*
        The move-in figure travels with the row, not just the rent.

        Two listings advertising ₦800,000 are not the same price, and a list
        that shows only rent hides exactly the difference somebody is trying to
        compare. Both are sent so a reader can see the gap rather than take our
        total on faith.
      */
      moveInKobo: listing.costs === null ? null : moveInCostKobo(listing.costs),
      annualRentKobo: listing.costs?.annualRentKobo ?? null,
      // Said, so a tenant can see why this is above that one. A ranking nobody
      // can interrogate is a ranking somebody will assume was bought.
      because: [...because],
      featuredUntil: listing.featuredUntil,
    }));

    /*
      The paid band is taken *out of* the ranked list, never mixed into it.

      `rank()` was not told that featuring exists — there is no parameter for it
      and no field on a scored listing — so a slot cannot quietly become a boost
      by somebody threading an argument through in a later phase. What money
      buys here is a labelled position above the answer; what it cannot buy is a
      better answer to the question somebody asked.

      Drawn from the ranked results rather than queried separately, which is
      what stops a slot showing a flat in Ikeja to somebody searching Surulere:
      nothing reaches this that the search did not already return.
    */
    const band = featuredAmong(ranked, now);
    return {
      featured: band.map((result) => ({ ...result, because: ['paid to appear here'] })),
      results: withoutFeatured(ranked, band),
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'One listing, with what was actually checked about it.' })
  @ApiOkResponse({ type: ListingView })
  async one(@Param('id') id: string, @Query('language') language?: string) {
    const now = new Date();
    const listing = await this.store.listing(id);
    /*
      A draft is a 404, not a 403.

      Distinguishing them tells a stranger which listing ids exist and which
      are merely unpublished — and an agent's unpublished work is nobody's
      business.
    */
    if (!listing || listing.publishedAt === null) throw new NotFoundException('No such listing.');

    const assessed = await this.assess(listing, now);
    const spoken = (['en', 'ha', 'yo', 'ig'] as const).includes(language as Language)
      ? (language as Language)
      : 'en';

    return {
      id: listing.id,
      title: listing.title,
      address: listing.propertyId,
      verified: assessed.verified,
      agentName: assessed.agentName,
      agentMeaning: assessed.agentMeaning,
      /*
        The evidence panel: every condition, met or not, in the tenant's
        language.

        Not a badge and not a score. "Verified" is a word somebody has to take
        on trust; this is the list of things that were checked, which a tenant
        can read and disagree with.
      */
      checks: VERIFIED_CONDITIONS.map((condition) => ({
        condition,
        label: say(spoken, conditionStepPhrase(condition)),
        met: !assessed.unmet.has(condition),
      })),
      costs: viewCosts(listing.costs),
    };
  }

  @Get(':id/media/:sha256')
  @ApiOperation({ summary: 'A photograph from a published listing. No account required.' })
  async photograph(
    @Param('id') id: string,
    @Param('sha256') sha256: string,
    @Res() response: Response,
  ) {
    const listing = await this.store.listing(id);
    /*
      A draft is a 404, the same as everywhere else.

      This route would otherwise be the way around every other one: an
      unpublished listing's photographs are nobody's business, and answering
      differently for "no such listing" and "not published" tells a stranger
      which ids are real.
    */
    if (!listing || listing.publishedAt === null) throw new NotFoundException('No such listing.');

    /*
      The hash has to belong to *this* listing.

      Media is content-addressed, so a key from one listing is a valid key
      everywhere — without this check, anybody holding a hash could pull the
      photograph through whichever published listing they liked, including one
      whose own photographs a reviewer had blocked.
    */
    const captures = await this.captures.capturesFor(listing.id);
    const wanted = captures.find((capture) => capture.mediaKey === sha256.toLowerCase());
    if (!wanted) throw new NotFoundException('No such photograph.');

    const bytes = await this.media.get(wanted.mediaKey!);
    if (!bytes) throw new NotFoundException('No such photograph.');

    /*
      The type comes from the capture's kind, not from the bytes and not from
      the client.

      Keys' own camera produces JPEG stills and MP4 walkthroughs; sniffing the
      bytes would mean deciding what an uploaded file *is*, which is how a
      served image comes to be `text/html`. `nosniff` says the browser must not
      second-guess it either.
    */
    response.setHeader('content-type', wanted.kind === 'video' ? 'video/mp4' : 'image/jpeg');
    response.setHeader('x-content-type-options', 'nosniff');
    /*
      Immutable, because the key is the hash. Bytes under this URL cannot ever
      be different bytes, so a year is not a risk — it is the one case where a
      long cache is simply true.
    */
    response.setHeader('cache-control', 'public, max-age=31536000, immutable');
    response.send(bytes);
  }

  /** Coordinates from a query string, or nothing. */
  private pointFrom(latitude?: string, longitude?: string): Point | null {
    const point = { latitude: Number(latitude), longitude: Number(longitude) };
    return isPlausiblePoint(point) ? point : null;
  }

  /** One listing's answer, from the one place that computes it. */
  private async assess(listing: Listing, now: Date) {
    const assessment = await assessListing(
      listing,
      { agents: this.store, reports: this.reports, captures: this.captures, market: this.market },
      now,
    );
    return { ...listing, ...assessment };
  }
}
