import { Controller, Get, NotFoundException, Param, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { viewCosts } from './costs.view';
import {
  VERIFIED_CONDITIONS,
  conditionStepPhrase,
  isPlausiblePoint,
  matches,
  moveInCostKobo,
  rank,
  say,
  type Language,
  type Point,
} from '@keys/domain';

import { CapturesStore } from '../captures/captures.store';
import { ReportsStore } from '../reports/reports.store';
import { AgentsStore, type Listing } from './agents.store';
import { assessListing } from './assess';
import { SearchResult, ListingView } from './agents.dto';

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
  ) {}

  @Get()
  @ApiOperation({ summary: 'Published listings, Verified first. No account required.' })
  @ApiOkResponse({ type: SearchResult, isArray: true })
  async search(
    @Query('q') q?: string,
    @Query('latitude') latitude?: string,
    @Query('longitude') longitude?: string,
    @Query('verifiedOnly') verifiedOnly?: string,
  ) {
    const now = new Date();
    const published = await this.store.publishedListings();

    const typed = (q ?? '').slice(0, 120);
    const wanted = published.filter((l) => matches([l.title, l.propertyId], typed));

    const assessed = await Promise.all(wanted.map((l) => this.assess(l, now)));

    const near = this.pointFrom(latitude, longitude);
    /*
      Filtered *after* assessing, not before.

      The filter has to read the same computed answer the badge does. A query
      that filtered on a stored `is_verified` would be fast and would show
      listings that lost their badge an hour ago.
    */
    const shown =
      verifiedOnly === 'false' ? assessed : assessed.filter((a) => a.verified);

    return rank(shown, near, now).map(({ listing, because }) => ({
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
    }));
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

  /** Coordinates from a query string, or nothing. */
  private pointFrom(latitude?: string, longitude?: string): Point | null {
    const point = { latitude: Number(latitude), longitude: Number(longitude) };
    return isPlausiblePoint(point) ? point : null;
  }

  /** One listing's answer, from the one place that computes it. */
  private async assess(listing: Listing, now: Date) {
    const assessment = await assessListing(
      listing,
      { agents: this.store, reports: this.reports, captures: this.captures },
      now,
    );
    return { ...listing, ...assessment };
  }
}
