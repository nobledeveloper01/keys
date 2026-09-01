import {
  BadRequestException,
  Body,
  Controller,
  Delete,
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

import {
  MAX_MESSAGE_LENGTH,
  OUTCOMES,
  feeWasHonoured,
  looksLikeAPhoneNumber,
  mayRecordOutcome,
  mayWithdrawOffer,
  maySeeContact,
  suspendsVerified,
  type Outcome,
  type Speaker,
} from '@keys/domain';

import { AgentGuard, type RequestWithAgent } from '../agents/agent.guard';
import { AgentsStore } from '../agents/agents.store';
import {
  AnswerInspectionBody,
  ConversationResponse,
  InspectionResponse,
  OfferContactBody,
  OpenConversationBody,
  OutcomeBody,
  RequestInspectionBody,
  SayBody,
  TenantSignUpBody,
  TenantSignUpResponse,
} from './market.dto';
import { MarketStore, type StoredConversation } from './market.store';
import { TenantGuard, type RequestWithTenant } from './tenant.guard';

/**
 * Talking to an agent, arranging to see a place, and saying what happened.
 *
 * Two invariants run through every route here and neither is enforced by
 * remembering to:
 *
 *  1. **A number is never in a response the other party did not earn.**
 *     `visible()` is the only thing that builds a conversation for a client,
 *     and it asks `maySeeContact` every time. There is no field that becomes
 *     populated and stays that way.
 *  2. **A stranger cannot take a listing down.** An outcome of "it was not
 *     there" suspends the badge — but only from somebody whose inspection this
 *     agent agreed to, only once, and the agent lifts it by walking back to
 *     the property and taking a photograph.
 */
@ApiTags('market')
@Controller('v1')
export class MarketController {
  constructor(
    private readonly store: MarketStore,
    private readonly agents: AgentsStore,
  ) {}

  @Post('tenants')
  @ApiOperation({ summary: 'Open a tenant account. Needed to message an agent.' })
  @ApiCreatedResponse({ type: TenantSignUpResponse })
  async signUp(@Body() body: TenantSignUpBody) {
    const displayName = (body?.displayName ?? '').trim();
    const phone = (body?.phone ?? '').trim();
    if (displayName.length < 2) throw new BadRequestException('Give a name.');
    if (phone.length < 7) throw new BadRequestException('Give a phone number.');

    const { tenant, token } = await this.store.createTenant({
      displayName,
      phone,
      now: new Date(),
    });
    return { tenantId: tenant.id, token };
  }

  @Post('conversations')
  @UseGuards(TenantGuard)
  @ApiSecurity('tenant-token')
  @ApiOperation({ summary: 'Ask an agent about a listing, without giving them your number.' })
  @ApiCreatedResponse({ type: ConversationResponse })
  async open(@Req() request: RequestWithTenant, @Body() body: OpenConversationBody) {
    const tenant = request.tenant!;
    const listing = await this.agents.listing((body?.listingId ?? '').trim());
    /*
      A draft is a 404 here for the same reason it is one in search: an
      unpublished listing is nobody's business, and answering differently would
      make this route a way to discover which ids exist.
    */
    if (!listing || listing.publishedAt === null) throw new NotFoundException('No such listing.');

    const conversation = await this.store.openConversation({
      listingId: listing.id,
      tenantId: tenant.id,
      agentId: listing.agentId,
      now: new Date(),
    });
    await this.append(conversation.id, 'tenant', body?.body ?? '');
    return this.visible(conversation.id, 'tenant');
  }

  @Get('conversations')
  @UseGuards(TenantGuard)
  @ApiSecurity('tenant-token')
  @ApiOperation({ summary: 'Your conversations.' })
  @ApiOkResponse({ type: ConversationResponse, isArray: true })
  async mine(@Req() request: RequestWithTenant) {
    const tenant = request.tenant!;
    const conversations = await this.store.conversationsForTenant(tenant.id);
    return Promise.all(conversations.map((c) => this.visible(c.id, 'tenant')));
  }

  @Get('conversations/:id')
  @UseGuards(TenantGuard)
  @ApiSecurity('tenant-token')
  @ApiOkResponse({ type: ConversationResponse })
  async one(@Req() request: RequestWithTenant, @Param('id') id: string) {
    await this.mineOr404(id, request.tenant!.id, 'tenant');
    return this.visible(id, 'tenant');
  }

  @Post('conversations/:id/messages')
  @UseGuards(TenantGuard)
  @ApiSecurity('tenant-token')
  @ApiCreatedResponse({ type: ConversationResponse })
  async saySomething(
    @Req() request: RequestWithTenant,
    @Param('id') id: string,
    @Body() body: SayBody,
  ) {
    await this.mineOr404(id, request.tenant!.id, 'tenant');
    await this.append(id, 'tenant', body?.body ?? '');
    return this.visible(id, 'tenant');
  }

  @Post('conversations/:id/contact')
  @UseGuards(TenantGuard)
  @ApiSecurity('tenant-token')
  @ApiOperation({ summary: 'Offer your number. They see it only if they offer theirs.' })
  @ApiCreatedResponse({ type: ConversationResponse })
  async offerAsTenant(
    @Req() request: RequestWithTenant,
    @Param('id') id: string,
    @Body() body: OfferContactBody,
  ) {
    await this.mineOr404(id, request.tenant!.id, 'tenant');
    return this.offer(id, 'tenant', body);
  }

  @Delete('conversations/:id/contact')
  @UseGuards(TenantGuard)
  @ApiSecurity('tenant-token')
  @ApiOperation({ summary: 'Take back a number they have not answered.' })
  @ApiOkResponse({ type: ConversationResponse })
  async unofferAsTenant(@Req() request: RequestWithTenant, @Param('id') id: string) {
    await this.mineOr404(id, request.tenant!.id, 'tenant');
    return this.withdraw(id, 'tenant');
  }

  @Delete('agent/conversations/:id/contact')
  @UseGuards(AgentGuard)
  @ApiSecurity('agent-token')
  @ApiOperation({ summary: 'Take back a number they have not answered.' })
  @ApiOkResponse({ type: ConversationResponse })
  async unofferAsAgent(@Req() request: RequestWithAgent, @Param('id') id: string) {
    await this.mineOr404(id, request.agent!.id, 'agent');
    return this.withdraw(id, 'agent');
  }

  @Post('agent/conversations/:id/contact')
  @UseGuards(AgentGuard)
  @ApiSecurity('agent-token')
  @ApiOperation({ summary: 'Offer your number. They see it only if they offer theirs.' })
  @ApiCreatedResponse({ type: ConversationResponse })
  async offerAsAgent(
    @Req() request: RequestWithAgent,
    @Param('id') id: string,
    @Body() body: OfferContactBody,
  ) {
    await this.mineOr404(id, request.agent!.id, 'agent');
    return this.offer(id, 'agent', body);
  }

  @Get('agent/conversations')
  @UseGuards(AgentGuard)
  @ApiSecurity('agent-token')
  @ApiOperation({ summary: 'People asking about your listings.' })
  @ApiOkResponse({ type: ConversationResponse, isArray: true })
  async theirs(@Req() request: RequestWithAgent) {
    const conversations = await this.store.conversationsForAgent(request.agent!.id);
    return Promise.all(conversations.map((c) => this.visible(c.id, 'agent')));
  }

  @Post('agent/conversations/:id/messages')
  @UseGuards(AgentGuard)
  @ApiSecurity('agent-token')
  @ApiCreatedResponse({ type: ConversationResponse })
  async replyAsAgent(
    @Req() request: RequestWithAgent,
    @Param('id') id: string,
    @Body() body: SayBody,
  ) {
    await this.mineOr404(id, request.agent!.id, 'agent');
    await this.append(id, 'agent', body?.body ?? '');
    return this.visible(id, 'agent');
  }

  @Post('inspections')
  @UseGuards(TenantGuard)
  @ApiSecurity('tenant-token')
  @ApiOperation({ summary: 'Ask to see the place.' })
  @ApiCreatedResponse({ type: InspectionResponse })
  async ask(@Req() request: RequestWithTenant, @Body() body: RequestInspectionBody) {
    const tenant = request.tenant!;
    const conversation = await this.mineOr404(
      (body?.conversationId ?? '').trim(),
      tenant.id,
      'tenant',
    );
    const inspection = await this.store.requestInspection({
      conversationId: conversation.id,
      listingId: conversation.listingId,
      tenantId: tenant.id,
      now: new Date(),
    });
    return this.showInspection(inspection.id);
  }

  @Get('inspections')
  @UseGuards(TenantGuard)
  @ApiSecurity('tenant-token')
  @ApiOkResponse({ type: InspectionResponse, isArray: true })
  async myInspections(@Req() request: RequestWithTenant) {
    const all = await this.store.inspectionsForTenant(request.tenant!.id);
    return Promise.all(all.map((i) => this.showInspection(i.id)));
  }

  @Get('agent/inspections')
  @UseGuards(AgentGuard)
  @ApiSecurity('agent-token')
  @ApiOkResponse({ type: InspectionResponse, isArray: true })
  async inspectionsOnMine(@Req() request: RequestWithAgent) {
    const listings = await this.agents.listingsOf(request.agent!.id);
    const all = await this.store.inspectionsForListings(listings.map((l) => l.id));
    return Promise.all(all.map((i) => this.showInspection(i.id)));
  }

  @Post('agent/inspections/:id')
  @UseGuards(AgentGuard)
  @ApiSecurity('agent-token')
  @ApiOperation({ summary: 'Agree to show it, and say what you will charge.' })
  @ApiCreatedResponse({ type: InspectionResponse })
  async answer(
    @Req() request: RequestWithAgent,
    @Param('id') id: string,
    @Body() body: AnswerInspectionBody,
  ) {
    const agent = request.agent!;
    const inspection = await this.store.inspection(id);
    const listing = inspection ? await this.agents.listing(inspection.listingId) : null;
    if (!inspection || !listing || listing.agentId !== agent.id) {
      throw new NotFoundException('No such inspection.');
    }

    const feeKobo = body?.feeKobo;
    /*
      A fee has to be a number, including zero, and cannot be defaulted.

      The same rule as the listing's costs and for the same reason: "I charge
      nothing to show it" is a claim a tenant can hold an agent to, and
      inventing that claim from a missing field would put words in their mouth
      that somebody may turn up and rely on.
    */
    if (typeof feeKobo !== 'number' || !Number.isSafeInteger(feeKobo) || feeKobo < 0) {
      throw new BadRequestException('Say what you will charge to show it, in kobo. 0 is an answer.');
    }

    const answered = await this.store.answerInspection({
      id,
      agentId: agent.id,
      state: body?.agreed ? 'agreed' : 'declined',
      feeKobo,
    });
    if (!answered) throw new NotFoundException('No such inspection.');
    return this.showInspection(id);
  }

  @Post('inspections/:id/outcome')
  @UseGuards(TenantGuard)
  @ApiSecurity('tenant-token')
  @ApiOperation({ summary: 'Say what happened. "It was not there" suspends the badge.' })
  @ApiCreatedResponse({ type: InspectionResponse })
  async outcome(
    @Req() request: RequestWithTenant,
    @Param('id') id: string,
    @Body() body: OutcomeBody,
  ) {
    const tenant = request.tenant!;
    const inspection = await this.store.inspection(id);
    if (!inspection || inspection.tenantId !== tenant.id) {
      throw new NotFoundException('No such inspection.');
    }
    if (!mayRecordOutcome(inspection)) {
      throw new BadRequestException(
        'You can say what happened once, after the agent has agreed to show it.',
      );
    }

    const outcome = body?.outcome as Outcome | undefined;
    if (!outcome || !OUTCOME_SET.has(outcome)) {
      throw new BadRequestException('Say what happened.');
    }

    /*
      A fee complaint has to be arithmetically possible.

      The agent declared a figure before the visit precisely so that there is
      nothing to argue about afterwards. So "they asked for more" is checked
      against that figure: if what was paid is within what was declared, the
      complaint contradicts itself, and filing it anyway would put a mark
      against an agent who did exactly what they said they would.

      This is not Keys deciding who is telling the truth about the money. It is
      Keys declining to record a claim whose own numbers refute it.
    */
    if (outcome === 'asked_for_more_money') {
      const paidKobo = body?.paidKobo;
      if (typeof paidKobo !== 'number' || !Number.isSafeInteger(paidKobo) || paidKobo < 0) {
        throw new BadRequestException('Say how much you were asked for, in kobo.');
      }
      if (feeWasHonoured(inspection.feeKobo, paidKobo)) {
        throw new BadRequestException(
          'That is what they said they would charge. If they asked for more than this, put that figure in.',
        );
      }
    }

    const now = new Date();
    await this.store.recordOutcome({ id, tenantId: tenant.id, outcome, now });

    if (suspendsVerified(outcome)) {
      /*
        Suspended straight away, and lifted by evidence rather than by a queue.

        A tenant who went to an address and found nothing should not watch the
        listing stay Verified while a reviewer gets to it. The reason that is
        safe — rather than a button for taking a competitor off the market — is
        that the agent lifts it themselves by going back and photographing the
        property, which `assessListing` checks against the suspension's own
        timestamp.
      */
      await this.store.suspend({ listingId: inspection.listingId, reportedBy: tenant.id, now });
    }

    return this.showInspection(id);
  }

  /** Store a message, refusing the ones that give away what this protects. */
  private async append(conversationId: string, speaker: Speaker, said: string) {
    const body = said.trim();
    if (body.length === 0) throw new BadRequestException('Say something.');
    if (body.length > MAX_MESSAGE_LENGTH) {
      throw new BadRequestException('That is too long for a message.');
    }
    if (looksLikeAPhoneNumber(body)) {
      /*
        Refused, not stripped.

        Silently removing the digits would leave somebody believing they had
        sent their number and waiting for a call that never comes. And this is
        a detector rather than a wall — somebody writing it in words gets
        through, deliberately — so the message it gives has to explain the
        mechanism rather than pretend to be a rule.
      */
      throw new BadRequestException(
        'Keys holds numbers back until you both agree to swap them. ' +
          'Use "share my number" instead — they will only see it if they share theirs.',
      );
    }
    await this.store.say({ conversationId, speaker, body, now: new Date() });
  }

  private async offer(id: string, by: 'tenant' | 'agent', body: OfferContactBody) {
    const contact = (body?.contact ?? '').trim();
    if (contact.length < 7) throw new BadRequestException('Give a phone number.');
    const updated = await this.store.offer({ conversationId: id, by, contact });
    if (!updated) throw new NotFoundException('No such conversation.');

    if (updated.exchange === 'exchanged') {
      // Written into the thread by Keys itself, because that is where somebody
      // will look for it, and because neither party can forge it.
      await this.store.say({
        conversationId: id,
        speaker: 'keys',
        body: 'You both agreed to share numbers. They are on this conversation now.',
        now: new Date(),
      });
    }
    return this.visible(id, by);
  }

  private async withdraw(id: string, by: 'tenant' | 'agent') {
    const conversation = await this.store.conversation(id);
    if (!conversation) throw new NotFoundException('No such conversation.');
    if (!mayWithdrawOffer(conversation.exchange, by)) {
      /*
        Refused once both have offered, rather than pretending to un-send.

        The other party has already read it. A button claiming otherwise would
        be a promise this cannot keep, and a promise about somebody's phone
        number is the worst kind to break quietly.
      */
      throw new BadRequestException(
        conversation.exchange === 'exchanged'
          ? 'They have already seen it. Keys cannot take that back.'
          : 'You have not offered your number here.',
      );
    }
    await this.store.withdrawOffer({ conversationId: id, by });
    return this.visible(id, by);
  }

  /** The conversation as this side may see it, contact decided every time. */
  private async visible(id: string, as: 'tenant' | 'agent') {
    const conversation = await this.store.conversation(id);
    if (!conversation) throw new NotFoundException('No such conversation.');

    const listing = await this.agents.listing(conversation.listingId);
    const agent = await this.agents.agentById(conversation.agentId);
    const tenant = await this.store.tenantById(conversation.tenantId);

    /*
      Asked, not remembered.

      There is no `contactVisible` column and no field that becomes populated.
      Every response asks the domain whether these two people agreed, so a
      conversation cannot be left holding a number from a state it is no longer
      in.
    */
    const open = maySeeContact(conversation.exchange);
    const theirs = as === 'tenant' ? conversation.agentContact : conversation.tenantContact;

    return {
      id: conversation.id,
      listingId: conversation.listingId,
      listingTitle: listing?.title ?? '',
      otherPartyName: as === 'tenant' ? (agent?.displayName ?? '') : (tenant?.displayName ?? ''),
      exchange: conversation.exchange,
      theirContact: open ? theirs : null,
      messages: (await this.store.messages(id)).map((m) => ({
        id: m.id,
        speaker: m.speaker,
        body: m.body,
        sentAt: m.sentAt.toISOString(),
      })),
    };
  }

  private async showInspection(id: string) {
    const inspection = await this.store.inspection(id);
    if (!inspection) throw new NotFoundException('No such inspection.');
    const listing = await this.agents.listing(inspection.listingId);
    return {
      id: inspection.id,
      listingId: inspection.listingId,
      listingTitle: listing?.title ?? '',
      state: inspection.state,
      feeKobo: inspection.feeKobo,
      outcome: inspection.outcome,
    };
  }

  /** Yours, or it does not exist. Never "yours or forbidden". */
  private async mineOr404(
    id: string,
    who: string,
    as: 'tenant' | 'agent',
  ): Promise<StoredConversation> {
    const conversation = await this.store.conversation(id);
    const owner = conversation
      ? as === 'tenant'
        ? conversation.tenantId
        : conversation.agentId
      : null;
    if (!conversation || owner !== who) throw new NotFoundException('No such conversation.');
    return conversation;
  }
}

const OUTCOME_SET: ReadonlySet<string> = new Set(OUTCOMES);
