import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
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

import {
  isLive,
  isPlausiblePoint,
  mayList,
  metresBetween,
  tierOf,
  tierSentence,
  unmetConditions,
  whatToDo,
  type Evidence,
  type ListingEvidence,
} from '@keys/domain';

import { ReportsStore, hashPhone } from '../reports/reports.store';
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
import { CapturesStore, type StoredCapture } from '../captures/captures.store';
import { authorityLink } from '../outbox/links';
import { Outbox } from '../outbox/outbox';

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
    private readonly captures: CapturesStore,
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

  @Get()
  @ApiOperation({
    summary: 'Whether a number belongs to a verified agent. No account required.',
  })
  @ApiOkResponse({ type: AgentProfileResponse })
  async byPhone(@Query('phone') phone?: string) {
    if (!phone || phone.trim().length < 7) {
      throw new BadRequestException('Give a phone number to look up.');
    }

    const now = new Date();
    const agent = await this.store.agentByPhoneHash(hashPhone(phone.trim()));
    if (!agent) throw new NotFoundException('No verified agent uses that number.');

    const answer = await this.profile(agent, now);

    /*
      An unverified sign-up is not findable by phone, and that is a privacy
      decision rather than a tidiness one.

      Returning every account would make this a reverse phone directory: type a
      number, get a name. What justifies answering at all is that the agent has
      been through an identity check in order to trade under this number — they
      have opted into being a checkable business, which is the whole thing they
      are signing up for. Somebody who merely opened an account has not.
    */
    if (answer.tier === 'unverified') {
      throw new NotFoundException('No verified agent uses that number.');
    }
    return answer;
  }

  /*
    Declared before `:id`, and that ordering is the whole reason this comment
    exists. Nest matches routes in declaration order, so a `:id` handler above
    this one would answer `/v1/agents/me` by looking for an agent whose id is
    the string "me" — a 404 that looks like a broken session.
  */
  @Get('me')
  @UseGuards(AgentGuard)
  @ApiSecurity('agent-token')
  @ApiOperation({ summary: 'Your own standing, computed from your evidence.' })
  @ApiOkResponse({ type: AgentProfileResponse })
  async me(@Req() request: RequestWithAgent) {
    return this.profile(request.agent!, new Date());
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
          `If that is true, enter ${opened.code} at ` +
          `${authorityLink(opened.challenge.id)}. If not, ignore this — nothing ` +
          'changes unless you enter it.',
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
    /*
      Coordinates are optional at draft time and required before publication.

      An agent drafting a listing on the bus has not stood at the property yet;
      one publishing it has. Demanding a location at the first step would push
      them to type something — and a made-up coordinate is worse than none,
      because `capture_on_site` would then compare a real capture against a
      fiction and refuse it for the wrong reason.
    */
    const point =
      typeof body?.latitude === 'number' && typeof body?.longitude === 'number'
        ? { latitude: body.latitude, longitude: body.longitude }
        : null;
    if (point !== null && !isPlausiblePoint(point)) {
      throw new BadRequestException('That is not a place.');
    }

    const listing = await this.store.createListing({
      agentId: agent.id,
      propertyId,
      title,
      latitude: point?.latitude ?? null,
      longitude: point?.longitude ?? null,
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

  @Post('me/listings/:id/place')
  @UseGuards(AgentGuard)
  @ApiSecurity('agent-token')
  @ApiOperation({ summary: 'Record where a property is, from standing at it. Once.' })
  @ApiOkResponse({ type: ListingResponse })
  async place(
    @Req() request: RequestWithAgent,
    @Param('id') id: string,
    @Body() body: { latitude?: number; longitude?: number },
  ) {
    const agent = request.agent!;
    const listing = await this.store.listing(id);
    if (!listing || listing.agentId !== agent.id) throw new NotFoundException('No such listing.');

    const point = { latitude: Number(body?.latitude), longitude: Number(body?.longitude) };
    if (!isPlausiblePoint(point)) throw new BadRequestException('That is not a place.');

    const placed = await this.store.placeListing({ id, ...point });
    if (!placed) {
      /*
        Refused rather than overwritten.

        Moving a property's coordinates re-answers `capture_on_site` for every
        capture already taken against it — which is a way to make a photograph
        from the next neighbourhood count by dragging the flat towards it. A
        genuine mistake is a new listing, which costs an agent a minute and
        costs nobody their evidence.
      */
      throw new ForbiddenException(
        'This property already has a location. Draft it again if that is wrong.',
      );
    }
    return {
      id,
      propertyId: listing.propertyId,
      title: listing.title,
      publishedAt: listing.publishedAt?.toISOString() ?? null,
      confirmedAt: listing.lastConfirmedAt?.toISOString() ?? null,
      stillNeeded: [],
    };
  }

  @Post('me/listings/:id/confirm')
  @UseGuards(AgentGuard)
  @ApiSecurity('agent-token')
  @ApiOperation({ summary: 'Say a listing is still available. Verified listings expire without this.' })
  @ApiOkResponse({ type: ListingResponse })
  async confirm(@Req() request: RequestWithAgent, @Param('id') id: string) {
    const agent = request.agent!;
    const listing = await this.store.listing(id);
    /*
      The same answer for another agent's listing as for one that does not
      exist. Distinguishing them turns this route into a way to discover which
      listing ids are real, from any account.
    */
    if (!listing || listing.agentId !== agent.id) throw new NotFoundException('No such listing.');

    await this.store.confirmStillAvailable(id, new Date());
    const after = await this.store.listing(id);
    return {
      id,
      propertyId: listing.propertyId,
      title: listing.title,
      publishedAt: after?.publishedAt?.toISOString() ?? null,
      stillNeeded: [],
    };
  }

  @Get('me/listings')
  @UseGuards(AgentGuard)
  @ApiSecurity('agent-token')
  @ApiOperation({ summary: 'Your listings, with what each still needs to be Verified.' })
  @ApiOkResponse({ type: ListingResponse, isArray: true })
  async mine(@Req() request: RequestWithAgent) {
    const agent = request.agent!;
    const now = new Date();
    const listings = await this.store.listingsOf(agent.id);
    const evidence = await this.store.evidenceFor(agent.id);

    // Asked per listing rather than assumed false, which is what it was. A
    // reviewer blocking an image had no effect on anything an agent could see.
    const blocked = new Set<string>();
    const captured = new Map<string, readonly StoredCapture[]>();
    for (const listing of listings) {
      if (await this.captures.isBlocked(listing.id)) blocked.add(listing.id);
      captured.set(listing.id, await this.captures.capturesFor(listing.id));
    }
    const upheld = await this.reports.publishedForHash(agent.phoneHash, now);
    const tier = tierOf(
      evidence,
      { joinedAt: agent.joinedAt, upheldReports: upheld.length },
      now,
    );

    return listings.map((l) => {
      /*
        What is missing, computed rather than stored.

        Three of the seven conditions are answerable today; the media and
        confirmation ones are not, because in-app capture does not exist yet.
        They are reported as unmet rather than omitted — an agent told their
        listing needs two things when it needs five would go and do the two and
        find the badge still missing, and that is how a mechanism stops being
        legible.
      */
      const inputs: ListingEvidence = {
        agentTier: tier,
        authorityLive: mayList(evidence, l.propertyId, now),
        /*
          The captures this listing actually has.

          `[]` was here, which meant an agent who had done everything right saw
          "take at least one photo in the Keys app" for ever. Verified is
          computed from evidence; passing an empty list is not computing it, it
          is asserting the answer.

          `provesPresence` still needs a distance, and nothing yet knows where
          a property *is* — so a capture arrives with `distanceM: null` and the
          condition stays unmet. That is the honest state: an accepted capture
          proves the Keys camera took it, and proving it was taken at the
          property needs a property with coordinates, which phase 4 brings.
        */
        captures: (captured.get(l.id) ?? []).map((c) => ({
          kind: c.kind,
          // Anything the store holds passed signature verification to get
          // there — that is the only door — so these are true by construction
          // rather than by a flag somebody set.
          capturedInApp: true,
          signatureValid: true,
          /*
            Measured now, from the listing's own coordinates.

            Not stored on the capture: a listing whose location is corrected —
            an agent fixed a typo, or added coordinates after drafting —
            should re-answer this rather than carry a distance computed
            against the wrong place for ever.
          */
          distanceM:
            l.latitude !== null && l.longitude !== null
              ? metresBetween(
                  { latitude: l.latitude, longitude: l.longitude },
                  { latitude: c.latitude, longitude: c.longitude },
                )
              : null,
          durationSeconds: c.durationSeconds,
        })),
        blockedDuplicate: blocked.has(l.id),
        // The listing's own record, not null. This was the fourth hardcoded
        // input to a computation whose whole value is that it is computed.
        lastConfirmedAt: l.lastConfirmedAt,
        upheldReports: upheld.length,
      };

      return {
        id: l.id,
        propertyId: l.propertyId,
        title: l.title,
        publishedAt: l.publishedAt?.toISOString() ?? null,
        confirmedAt: l.lastConfirmedAt?.toISOString() ?? null,
        placed: l.latitude !== null && l.longitude !== null,
        stillNeeded: unmetConditions(inputs, now).map((condition) => ({
          condition,
          whatToDo: whatToDo(condition),
        })),
      };
    });
  }
}
