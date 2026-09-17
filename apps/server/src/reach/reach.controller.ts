import { BadRequestException, Body, Controller, ForbiddenException, Get, NotFoundException, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';

import {
  CITIES,
  GUIDE_FLOOR,
  applicationMovesFor,
  areaById,
  areaOf,
  guideFor,
  isMarketBand,
  isPowerBand,
  isTransportMode,
  isWaterSource,
  isOpen,
  mayApply,
  mayMoveApplication,
  profileIsWhole,
  stateOfApplication,
  type Answer,
  type Application,
  type ApplicationState,
  type Profile,
} from '@keys/domain';

import { AgentGuard, type RequestWithAgent } from '../agents/agent.guard';
import { AgentsStore } from '../agents/agents.store';
import { TenantGuard, type RequestWithTenant } from '../market/tenant.guard';
import { TenancyStore } from '../tenancy/tenancy.store';
import { AnswerBody, ApplicationView, ApplyBody, CityView, GuideView, MoveApplicationBody } from './reach.dto';
import { ReachStore } from './reach.store';

const DAY_MS = 24 * 60 * 60_000;

/**
 * Depth and reach (ADR-0013 to ADR-0016): the cities and their areas, the
 * guide an area's tenants answered, and applications. Every rule is the
 * domain's; every response about a person is the person's own words.
 */
@ApiTags('reach')
@Controller('v1')
export class ReachController {
  constructor(
    private readonly store: ReachStore,
    private readonly agents: AgentsStore,
    private readonly tenancies: TenancyStore,
  ) {}

  @Get('cities')
  @ApiOperation({ summary: 'The cities Keys serves and their named areas. No account.' })
  @ApiOkResponse({ type: [CityView] })
  cities() {
    return CITIES.map((c) => ({ id: c.id, name: c.name, areas: c.areas.map((a) => ({ id: a.id, name: a.name, latitude: a.centre.latitude, longitude: a.centre.longitude })) }));
  }

  @Get('areas/:areaId/guide')
  @ApiOperation({ summary: 'What tenants in this area answered — counts, above a floor of five, never a verdict. No account.' })
  @ApiOkResponse({ type: GuideView })
  async guide(@Param('areaId') areaId: string) {
    const area = areaById(areaId);
    if (!area) throw new NotFoundException('No such area.');
    const g = guideFor(areaId, await this.store.answersFor(areaId));
    return g
      ? { areaId, areaName: area.name, answers: g.answers, floor: GUIDE_FLOOR, power: g.power, water: g.water, transport: g.transport, market: g.market }
      : { areaId, areaName: area.name, answers: 0, floor: GUIDE_FLOOR, power: null, water: null, transport: null, market: null };
  }

  @Post('areas/answers')
  @UseGuards(TenantGuard)
  @ApiSecurity('tenant-token')
  @ApiOperation({ summary: 'Answer the four questions for the area of a tenancy you hold. Your latest answer is the one that counts.' })
  @ApiCreatedResponse()
  async answer(@Req() request: RequestWithTenant, @Body() body: AnswerBody) {
    const tenant = request.tenant!;
    const tenancy = await this.tenancies.tenancy(body?.tenancyId ?? '');
    if (!tenancy || tenancy.agreement.tenantId !== tenant.id) throw new ForbiddenException('Only a tenant with a tenancy there can answer for an area.');
    const listing = (await this.agents.publishedListings()).find((l) => l.propertyId === tenancy.agreement.propertyId) ?? null;
    const point = listing && listing.latitude !== null && listing.longitude !== null ? { latitude: listing.latitude, longitude: listing.longitude } : null;
    const area = point ? areaOf(point) : null;
    if (!area) throw new BadRequestException('That tenancy is not in a named area Keys knows.');
    const transport = Array.isArray(body?.transport) ? body.transport.filter(isTransportMode) : [];
    const power = body?.power ?? '';
    const water = body?.water ?? '';
    const market = body?.market ?? '';
    if (!isPowerBand(power) || !isWaterSource(water) || !isMarketBand(market) || transport.length === 0) throw new BadRequestException('Pick an answer from each list.');
    const now = new Date();
    const answer: Answer = { tenantId: tenant.id, areaId: area.id, month: now.toISOString().slice(0, 7), power, water, transport, market };
    await this.store.answer(answer);
    return { areaId: area.id };
  }

  private async view(a: Application, by: 'agent' | 'tenant') {
    const listing = await this.agents.listing(a.listingId);
    return { id: a.id, listingId: a.listingId, listingTitle: listing?.title ?? '', state: stateOfApplication(a), moves: applicationMovesFor(a, by), profile: a.profile, standing: a.standing, events: a.events };
  }

  @Post('listings/:id/applications')
  @UseGuards(TenantGuard)
  @ApiSecurity('tenant-token')
  @ApiOperation({ summary: 'Apply for a listing in your own words. One open application per listing.' })
  @ApiCreatedResponse({ type: ApplicationView })
  async apply(@Req() request: RequestWithTenant, @Param('id') listingId: string, @Body() body: ApplyBody) {
    const tenant = request.tenant!;
    const listing = await this.agents.listing(listingId);
    if (!listing || listing.publishedAt === null) throw new NotFoundException('No such listing.');
    const profile: Profile = { occupation: String(body?.occupation ?? '').trim(), householdSize: Number(body?.householdSize), moveInBy: String(body?.moveInBy ?? ''), note: String(body?.note ?? '').trim() };
    if (!profileIsWhole(profile)) throw new BadRequestException('An occupation, a household of one to twenty, a date, and a note under a thousand characters.');
    if (!mayApply(await this.store.applicationsForListing(listingId), tenant.id, listingId)) throw new ForbiddenException('You already have an open application for this listing.');
    const now = new Date();
    const standing = {
      accountAgeDays: Math.floor((now.getTime() - tenant.joinedAt.getTime()) / DAY_MS),
      tenanciesRecorded: (await this.tenancies.tenanciesForTenant(tenant.id)).length,
    };
    const a: Application = { id: this.store.newId(), listingId, tenantId: tenant.id, agentId: listing.agentId, profile, standing, events: [{ kind: 'submitted', by: tenant.id, at: now }] };
    return this.view(await this.store.createApplication(a), 'tenant');
  }

  @Get('applications')
  @UseGuards(TenantGuard)
  @ApiSecurity('tenant-token')
  @ApiOperation({ summary: 'My applications, every status change visible.' })
  @ApiOkResponse({ type: [ApplicationView] })
  async mine(@Req() request: RequestWithTenant) {
    return Promise.all((await this.store.applicationsForTenant(request.tenant!.id)).map(async (a) => this.view(a, 'tenant')));
  }

  @Get('agent/applications')
  @UseGuards(AgentGuard)
  @ApiSecurity('agent-token')
  @ApiOperation({ summary: 'Applications for my listings — the tenant’s own words, and nothing Keys computed.' })
  @ApiOkResponse({ type: [ApplicationView] })
  async forAgent(@Req() request: RequestWithAgent) {
    return Promise.all((await this.store.applicationsForAgent(request.agent!.id)).map(async (a) => this.view(a, 'agent')));
  }

  @Post('applications/:id/move')
  @UseGuards(AgentGuard)
  @ApiSecurity('agent-token')
  @ApiOperation({ summary: 'The agent moves it forward or declines. A closed list, and the tenant sees every change.' })
  @ApiCreatedResponse({ type: ApplicationView })
  async move(@Req() request: RequestWithAgent, @Param('id') id: string, @Body() body: MoveApplicationBody) {
    const a = await this.store.application(id);
    // A 404 for somebody else's application, not a 403: an id is not a fact to confirm.
    if (!a || a.agentId !== request.agent!.id) throw new NotFoundException('No such application.');
    const to = body?.to as ApplicationState;
    if (!mayMoveApplication(a, to, 'agent')) throw new ForbiddenException(`Cannot move from ${stateOfApplication(a)} to ${to}.`);
    return this.view(await this.store.appendApplicationEvent(a.id, { kind: 'moved', by: request.agent!.id, at: new Date(), to: to as Exclude<ApplicationState, 'submitted'> }), 'agent');
  }

  @Post('applications/:id/withdraw')
  @UseGuards(TenantGuard)
  @ApiSecurity('tenant-token')
  @ApiOperation({ summary: 'Withdraw your application at any open state.' })
  @ApiCreatedResponse({ type: ApplicationView })
  async withdraw(@Req() request: RequestWithTenant, @Param('id') id: string) {
    const a = await this.store.application(id);
    if (!a || a.tenantId !== request.tenant!.id) throw new NotFoundException('No such application.');
    if (!isOpen(a) || !mayMoveApplication(a, 'withdrawn', 'tenant')) throw new ForbiddenException('Already closed.');
    return this.view(await this.store.appendApplicationEvent(a.id, { kind: 'moved', by: a.tenantId, at: new Date(), to: 'withdrawn' }), 'tenant');
  }
}
