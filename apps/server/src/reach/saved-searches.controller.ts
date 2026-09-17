import { randomUUID } from 'node:crypto';
import { BadRequestException, Body, Controller, Delete, ForbiddenException, Get, NotFoundException, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';

import { MAX_SAVED_SEARCHES, isCityId, isPlausiblePoint, marketMoves, sameSearch, type SearchParams, type Seen } from '@keys/domain';

import { AgentsStore } from '../agents/agents.store';
import { runSearch } from '../agents/search.controller';
import { CapturesStore } from '../captures/captures.store';
import { MarketStore } from '../market/market.store';
import { TenantGuard, type RequestWithTenant } from '../market/tenant.guard';
import { ReportsStore } from '../reports/reports.store';
import { SaveSearchBody, SavedSearchView } from './reach.dto';
import { SavedSearchesStore } from './saved-searches.store';

/**
 * Saved searches (ADR-0020): the box and the answer it last saw, and on the
 * next read what moved — new, a price, gone, and the same property back
 * under a different agent. No push; reading it moves *last time* forward.
 */
@ApiTags('reach')
@Controller('v1/saved-searches')
export class SavedSearchesController {
  constructor(
    private readonly saved: SavedSearchesStore,
    private readonly agents: AgentsStore,
    private readonly reports: ReportsStore,
    private readonly captures: CapturesStore,
    private readonly market: MarketStore,
  ) {}

  private paramsFrom(body: SaveSearchBody): SearchParams {
    const place =
      body.placeLatitude !== undefined && body.placeLongitude !== undefined
        ? { latitude: Number(body.placeLatitude), longitude: Number(body.placeLongitude) }
        : null;
    if (place !== null && !isPlausiblePoint(place)) throw new BadRequestException('That is not a place.');
    return {
      q: (body.q ?? '').slice(0, 120),
      cityId: body.city !== undefined && isCityId(body.city) ? body.city : null,
      place,
      withinKm: body.withinKm !== undefined && Number.isFinite(body.withinKm) && body.withinKm > 0 ? body.withinKm : null,
      verifiedOnly: body.verifiedOnly !== false,
    };
  }

  /** The answer as a snapshot: id, agent, rent, and the listings this one's photographs resemble. */
  private async snapshot(params: SearchParams, now: Date): Promise<readonly Seen[]> {
    const answer = await runSearch({ store: this.agents, reports: this.reports, captures: this.captures, market: this.market }, params, null, now);
    const all = [...answer.featured, ...answer.results];
    return Promise.all(
      all.map(async (r) => {
        const captures = await this.captures.capturesFor(r.id);
        const resembles = [...new Set(captures.flatMap((c) => c.looksLike.map((m) => m.id)))];
        return { id: r.id, agentId: r.agentId, annualRentKobo: r.annualRentKobo, resembles };
      }),
    );
  }

  @Post()
  @UseGuards(TenantGuard)
  @ApiSecurity('tenant-token')
  @ApiOperation({ summary: 'Save this search. What it sees now is what the next read compares with.' })
  @ApiCreatedResponse({ type: SavedSearchView })
  async save(@Req() request: RequestWithTenant, @Body() body: SaveSearchBody) {
    const tenant = request.tenant!;
    const params = this.paramsFrom(body);
    const mine = await this.saved.forTenant(tenant.id);
    const already = mine.find((s) => sameSearch(s.params, params));
    if (already) return this.view(already, []);
    if (mine.length >= MAX_SAVED_SEARCHES) throw new ForbiddenException(`You can keep ${MAX_SAVED_SEARCHES} searches. Forget one first.`);
    const now = new Date();
    const row = { id: randomUUID(), tenantId: tenant.id, params, seen: await this.snapshot(params, now), savedAt: now, readAt: now };
    await this.saved.save(row);
    return this.view(row, []);
  }

  @Get()
  @UseGuards(TenantGuard)
  @ApiSecurity('tenant-token')
  @ApiOperation({ summary: 'Your saved searches, each with what moved since you last read it. Reading is what moves last time forward.' })
  @ApiOkResponse({ type: [SavedSearchView] })
  async mine(@Req() request: RequestWithTenant) {
    const tenant = request.tenant!;
    const now = new Date();
    const out = [];
    for (const s of await this.saved.forTenant(tenant.id)) {
      const current = await this.snapshot(s.params, now);
      const moves = marketMoves(s.seen, current);
      await this.saved.markSeen(s.id, current, now);
      out.push(this.view({ ...s, seen: current, readAt: now }, moves));
    }
    return out;
  }

  @Delete(':id')
  @UseGuards(TenantGuard)
  @ApiSecurity('tenant-token')
  @ApiOperation({ summary: 'Forget a saved search.' })
  async forget(@Req() request: RequestWithTenant, @Param('id') id: string) {
    const removed = await this.saved.remove(id, request.tenant!.id);
    if (!removed) throw new NotFoundException('No such saved search.');
    return { forgotten: true };
  }

  private view(s: { id: string; params: SearchParams; seen: readonly Seen[]; savedAt: Date; readAt: Date }, moves: ReturnType<typeof marketMoves>) {
    return {
      id: s.id,
      q: s.params.q,
      city: s.params.cityId,
      placeLatitude: s.params.place?.latitude ?? null,
      placeLongitude: s.params.place?.longitude ?? null,
      withinKm: s.params.withinKm,
      verifiedOnly: s.params.verifiedOnly,
      savedAt: s.savedAt.toISOString(),
      readAt: s.readAt.toISOString(),
      matching: s.seen.length,
      moves: moves.map((m) => ({ ...m })),
    };
  }
}
