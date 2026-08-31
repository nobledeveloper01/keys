import {
  BadRequestException,
  Body,
  Controller,
  NotFoundException,
  Post,
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
  AnswerChallengeBody,
  ChallengeAnsweredResponse,
  ChallengeOpenedResponse,
  IdentityCheckBody,
} from './agents.dto';
import { AgentsStore } from './agents.store';
import { Outbox } from './outbox';
import { VendorGuard } from './vendor.guard';

/**
 * The landlord's door. No account, by design — the same choice the reply flow
 * made in phase 1 and for the same reason.
 *
 * A landlord who has just discovered something about their agent must be able
 * to take authority back from a feature phone at ten at night. Requiring them
 * to hold a Keys account first would mean most of them never do it, and an
 * authority nobody can withdraw is not an authority, it is a transfer.
 */
@ApiTags('authority')
@Controller('v1/authority')
export class AuthorityController {
  constructor(
    private readonly store: AgentsStore,
    private readonly outbox: Outbox,
  ) {}

  @Post('withdrawal')
  @ApiOperation({
    summary: 'Ask for a code to withdraw an authority. Texted to the landlord who granted it.',
  })
  @ApiCreatedResponse({ type: ChallengeOpenedResponse })
  async askToWithdraw(@Body() body: { agentId?: string; propertyId?: string }) {
    const agentId = (body?.agentId ?? '').trim();
    const propertyId = (body?.propertyId ?? '').trim();
    if (!agentId || !propertyId) {
      throw new BadRequestException('Name the agent and the property.');
    }

    /*
      Unauthenticated, and it takes no phone number. Both halves matter.

      Unauthenticated because the landlord has no account and requiring them to
      prove who they are before they may ask to prove who they are is circular.
      No phone number because the first draft took one, which meant a stranger
      with the link could have the code sent to *their* number and revoke
      somebody else's authority — the route would have been a revocation
      endpoint with a confirmation step that confirmed nothing. The code goes to
      the number that granted the authority, which is the only number with any
      standing here.

      What a stranger can still achieve is an unsolicited text to a landlord.
      That makes rate limiting the real control, and it is a cost worth paying
      for a withdrawal that works from a feature phone at ten at night.
    */
    const now = new Date();
    const opened = await this.store.openWithdrawal({ agentId, propertyId, now });

    // The same answer whether the authority does not exist, the property does
    // not, or the agent does not. Otherwise this route reports which pairs are
    // real to anybody who asks.
    if (!opened) {
      throw new NotFoundException('No live authority matches that.');
    }

    this.outbox.queue(
      {
        toPhoneHash: opened.challenge.landlordPhoneHash,
        body:
          'Someone asked to withdraw an agent\u2019s authority to let your property ' +
          `on Keys. If that was you, enter ${opened.code} at ` +
          `https://keys.ng/authority?c=${opened.challenge.id}. If not, ignore this — ` +
          'nothing changes unless you enter it.',
      },
      now,
    );

    return {
      challengeId: opened.challenge.id,
      expiresAt: opened.challenge.expiresAt.toISOString(),
      delivered: false,
      whatHappensNext:
        'We have queued a text to the number that confirmed this agent. Nothing ' +
        'changes until the code from it is entered.',
    };
  }

  @Post('confirm')
  @ApiOperation({
    summary: 'Answer a code from a text. Grants or withdraws, as the text said.',
  })
  @ApiOkResponse({ type: ChallengeAnsweredResponse })
  async confirm(@Body() body: AnswerChallengeBody) {
    const challengeId = (body?.challengeId ?? '').trim();
    const code = (body?.code ?? '').trim();
    if (!challengeId || !code) throw new BadRequestException('Give the code from the text.');

    const unpublished = await this.store.answerChallenge({
      challengeId,
      code,
      now: new Date(),
    });

    // One answer for a wrong code, an expired code, a spent code and a
    // challenge that never existed. Distinguishing them tells whoever is
    // guessing which part of the guess was right.
    if (unpublished === null) {
      throw new BadRequestException('That code is wrong or no longer valid.');
    }

    return {
      confirmed: true,
      unpublishedListings: [...unpublished],
      meaning:
        unpublished.length > 0
          ? `Done. ${unpublished.length} listing(s) are no longer public.`
          : 'Done. Thank you for confirming.',
    };
  }

  @Post('identity')
  @UseGuards(VendorGuard)
  @ApiSecurity('kyc-token')
  @ApiOperation({ summary: 'Record a completed identity check. Vendor only.' })
  @ApiCreatedResponse({ description: 'The check was recorded.' })
  async identity(@Body() body: IdentityCheckBody) {
    const agentId = (body?.agentId ?? '').trim();
    const vendor = (body?.vendor ?? '').trim();
    const reference = (body?.reference ?? '').trim();
    if (!agentId || !vendor || !reference) {
      throw new BadRequestException('Name the agent, the vendor and the reference.');
    }

    const agent = await this.store.agentById(agentId);
    if (!agent) throw new NotFoundException('No such agent.');

    await this.store.recordIdentity({ agentId, vendor, reference, now: new Date() });
    return { recorded: true };
  }
}
