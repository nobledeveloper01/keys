import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';

import { isLive, mayList, tierOf, tierSentence, type Evidence } from '@keys/domain';

import { ReportsStore } from '../reports/reports.store';
import { AgentGuard, type RequestWithAgent } from './agent.guard';
import {
  AgentProfileResponse,
  AuthorityRequestBody,
  ChallengeOpenedResponse,
  CreateListingBody,
  ListingResponse,
  SignUpBody,
  SignUpResponse,
} from './agents.dto';
import {
  AgentsStore,
  LandlordIsTheAgent,
  LandlordVouchesForTooMany,
  type StoredAgent,
} from './agents.store';
import { Outbox } from './outbox';

function properties(evidence: readonly Evidence[], now: Date): number {
  return new Set(
    evidence
      .filter((e) => e.kind === 'authority' && e.propertyId && isLive(e, now))
      .map((e) => e.propertyId),
  ).size;
}

@ApiTags('agents')
@Controller('v1/agents')
export class AgentsController {
  constructor(
    private readonly store: AgentsStore,
    private readonly reports: ReportsStore,
    private readonly outbox: Outbox,
  ) {}

  /**
   * The agent's tier and its history, assembled from evidence at the moment of
   * the read.
   *
   * Every route that needs to know a tier calls this. There is no cached copy
   * and no column, so there is nothing to go stale after a revocation and
   * nothing for a request body to overwrite.
   */
  private async profile(agent: StoredAgent, now: Date) {
    const evidence = await this.store.evidenceFor(agent.id);
    const upheld = await this.reports.publishedForHash(agent.phoneHash, now);
    const tier = tierOf(evidence, {
      joinedAt: agent.joinedAt,
      upheldReports: upheld.length,
    }, now);

    return {
      agentId: agent.id,
      displayName: agent.displayName,
      tier,
      meaning: tierSentence(tier),
      confirmedProperties: properties(evidence, now),
      joinedAt: agent.joinedAt.toISOString(),
      upheldReports: upheld.length,
    };
  }

  @Post()
  @ApiOperation({ summary: 'Open an agent account. Verifies nothing on its own.' })
  @ApiCreatedResponse({ type: SignUpResponse })
  async signUp(@Body() body: SignUpBody) {
    const displayName = (body?.displayName ?? '').trim();
    const phone = (body?.phone ?? '').trim();
    if (displayName.length < 2) throw new BadRequestException('Give a name.');
    if (phone.length < 7) throw new BadRequestException('Give a phone number.');

    const { agent, token } = await this.store.createAgent({
      displayName,
      phone,
      now: new Date(),
    });
    // The token is the only thing in this response that is not already public.
    // It is shown once; Keys keeps a digest and cannot return it again.
    return { agentId: agent.id, token };
  }

  @Get(':id')
  @ApiOperation({
    summary: 'What is publicly known about an agent. No account required.',
  })
  @ApiOkResponse({ type: AgentProfileResponse })
  async publicProfile(@Param('id') id: string) {
    const agent = await this.store.agentById(id);
    if (!agent) throw new NotFoundException('No such agent.');
    return this.profile(agent, new Date());
  }

  @Post('me/authority')
  @UseGuards(AgentGuard)
  @ApiSecurity('agent-token')
  @ApiOperation({
    summary: 'Ask a landlord to confirm you may let a property.',
  })
  @ApiCreatedResponse({ type: ChallengeOpenedResponse })
  async requestAuthority(
    @Req() request: RequestWithAgent,
    @Body() body: AuthorityRequestBody,
  ) {
    const agent = request.agent!;
    const propertyId = (body?.propertyId ?? '').trim();
    const landlordPhone = (body?.landlordPhone ?? '').trim();
    if (!propertyId) throw new BadRequestException('Name the property.');
    if (landlordPhone.length < 7) throw new BadRequestException("Give the landlord's number.");

    const now = new Date();
    let opened;
    try {
      opened = await this.store.openChallenge({
        purpose: 'grant',
        agentId: agent.id,
        propertyId,
        landlordPhone,
        now,
      });
    } catch (error) {
      if (error instanceof LandlordIsTheAgent) {
        throw new ForbiddenException(
          'That is your own number. A landlord has to confirm you, not you.',
        );
      }
      if (error instanceof LandlordVouchesForTooMany) {
        throw new ForbiddenException(
          'That number has already confirmed as many agents as we allow. ' +
            'A person will look at this.',
        );
      }
      throw error;
    }

    /*
      The code goes to the outbox and nowhere else.

      Not into this response — the agent is the one asking, and handing them
      the code would make the landlord confirmation a self-confirmation
      through the very mechanism built to prevent one. Until phase 3 puts an
      SMS provider behind the outbox this flow cannot complete in production,
      and the response says so rather than pretending.
    */
    this.outbox.queue(
      {
        toPhoneHash: opened.challenge.landlordPhoneHash,
        body:
          `${agent.displayName} says they may let a property of yours on Keys. ` +
          `If that is true, enter ${opened.code}. If not, ignore this.`,
      },
      now,
    );

    return {
      challengeId: opened.challenge.id,
      expiresAt: opened.challenge.expiresAt.toISOString(),
      delivered: false,
      whatHappensNext:
        'We have queued a text to the landlord. Keys cannot send texts yet, ' +
        'so this will complete when that is connected — see the release gates.',
    };
  }

  @Post('me/listings')
  @UseGuards(AgentGuard)
  @ApiSecurity('agent-token')
  @ApiOperation({ summary: 'Draft a listing. Drafts are private.' })
  @ApiCreatedResponse({ type: ListingResponse })
  async draft(@Req() request: RequestWithAgent, @Body() body: CreateListingBody) {
    const agent = request.agent!;
    const propertyId = (body?.propertyId ?? '').trim();
    const title = (body?.title ?? '').trim();
    if (!propertyId) throw new BadRequestException('Name the property.');
    if (title.length < 3) throw new BadRequestException('Give the listing a title.');

    // Drafting is deliberately unguarded by tier. An agent should be able to
    // prepare a listing while the landlord's confirmation is still in flight;
    // what a tier gates is publication, which is the part strangers see.
    const listing = await this.store.createListing({
      agentId: agent.id,
      propertyId,
      title,
      now: new Date(),
    });
    return {
      id: listing.id,
      propertyId: listing.propertyId,
      title: listing.title,
      publishedAt: null,
    };
  }

  @Post('me/listings/:id/publish')
  @UseGuards(AgentGuard)
  @ApiSecurity('agent-token')
  @ApiOperation({ summary: 'Publish a listing. Needs a landlord confirmation on that property.' })
  @ApiOkResponse({ type: ListingResponse })
  async publish(@Req() request: RequestWithAgent, @Param('id') id: string) {
    const agent = request.agent!;
    const listing = await this.store.listing(id);
    if (!listing || listing.agentId !== agent.id) throw new NotFoundException('No such listing.');

    const now = new Date();
    const evidence = await this.store.evidenceFor(agent.id);
    if (!mayList(evidence, listing.propertyId, now)) {
      throw new ForbiddenException(
        'No landlord has confirmed you may let this property, or your ID check ' +
          'is no longer standing.',
      );
    }

    await this.store.publishListing(id, now);
    const published = await this.store.listing(id);
    return {
      id,
      propertyId: listing.propertyId,
      title: listing.title,
      publishedAt: published?.publishedAt?.toISOString() ?? null,
    };
  }

  @Get('me/listings')
  @UseGuards(AgentGuard)
  @ApiSecurity('agent-token')
  @ApiOperation({ summary: 'Your listings, drafts included.' })
  @ApiOkResponse({ type: ListingResponse, isArray: true })
  async mine(@Req() request: RequestWithAgent) {
    const listings = await this.store.listingsOf(request.agent!.id);
    return listings.map((l) => ({
      id: l.id,
      propertyId: l.propertyId,
      title: l.title,
      publishedAt: l.publishedAt?.toISOString() ?? null,
    }));
  }
}
