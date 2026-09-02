import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';

import { isLive, tierOf, tierSentence } from '@keys/domain';

import { ReportsStore } from '../reports/reports.store';
import { ReviewerGuard, type RequestWithReviewer } from '../reports/reviewer.guard';
import { AgentUnderReview } from './agents.dto';
import { AgentsStore } from './agents.store';

/**
 * Keys withdrawing an identity it should not have accepted.
 *
 * Separate from the landlord's door because it answers a different question.
 * A landlord withdrawing authority is saying *not this agent, on my flat*; a
 * reviewer withdrawing an identity is saying *this document was forged*, and
 * that has to take down every listing the person has anywhere — which is what
 * `cascade` does with an identity revocation, and why the reply is a count of
 * what went dark rather than an acknowledgement.
 */
/*
  Not `/v1/review/agents`, which is what this was and which never worked.

  `ReviewController` declares `@Get(':id')` under `/v1/review`, and a single
  path segment is exactly what that matches — so `/v1/review/agents` was
  answered by the report console looking for a report whose id is the string
  "agents", and returned "No such report".

  It could be fixed by registering this module before that one, and that fix
  would be a route that works because of the order of an imports array. The
  next person to alphabetise `AppModule` would break it, silently, in a way no
  test asks about. A path no wildcard can shadow costs one hyphen.
*/
@ApiTags('review')
@Controller('v1/agent-review')
@UseGuards(ReviewerGuard)
@ApiSecurity('reviewer-token')
export class AgentReviewController {
  constructor(
    private readonly store: AgentsStore,
    private readonly reports: ReportsStore,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Every agent, with what has been attested about them.' })
  @ApiOkResponse({ type: AgentUnderReview, isArray: true })
  async list() {
    const now = new Date();
    const agents = await this.store.everyAgent();

    return Promise.all(
      agents.map(async (agent) => {
        const evidence = await this.store.evidenceFor(agent.id);
        const upheld = await this.reports.publishedForHash(agent.phoneHash, now);
        const tier = tierOf(
          evidence,
          { joinedAt: agent.joinedAt, upheldReports: upheld.length },
          now,
        );
        const listings = await this.store.listingsOf(agent.id);

        return {
          agentId: agent.id,
          displayName: agent.displayName,
          tier,
          meaning: tierSentence(tier),
          joinedAt: agent.joinedAt.toISOString(),
          upheldReports: upheld.length,
          publishedListings: listings.filter((l) => l.publishedAt !== null).length,
          /*
            The attestations, without the attestors' phone numbers.

            A reviewer needs to know that a landlord confirmed this agent on
            this property, and when. They do not need the landlord's number,
            and a console that showed it would be a place where every landlord
            on the platform could be read off by anybody holding a reviewer
            token. What is shown is what a decision actually rests on.
          */
          evidence: evidence.map((e) => ({
            kind: e.kind,
            attestor:
              e.attestor.kind === 'vendor'
                ? `${e.attestor.vendor} (${e.attestor.reference})`
                : e.attestor.kind,
            propertyId: e.propertyId,
            at: e.at.toISOString(),
            live: isLive(e, now),
          })),
        };
      }),
    );
  }

  @Post(':id/withdraw-identity')
  @ApiOperation({
    summary: 'Withdraw an identity check. Unpublishes every listing that agent has.',
  })
  @ApiOkResponse({ description: 'What went dark.' })
  async withdrawIdentity(@Param('id') id: string, @Req() request: RequestWithReviewer) {
    const agent = await this.store.agentById(id);
    if (!agent) throw new NotFoundException('No such agent.');

    const unpublished = await this.store.revokeIdentity({ agentId: id, now: new Date() });
    return {
      withdrawn: true,
      // Named, because a decision that takes a person's livelihood off the
      // market has to be answerable a year later by somebody other than "the
      // system".
      by: request.reviewer?.name ?? 'unattributed',
      unpublishedListings: [...unpublished],
    };
  }

  @Post(':id/checked-by-hand')
  @ApiOperation({
    summary:
      'Record an identity check or a landlord confirmation a reviewer did by hand. The v1.0 path — see docs/V1-SCOPE.md.',
  })
  @ApiOkResponse({ description: 'What was recorded, and who recorded it.' })
  async checkedByHand(
    @Param('id') id: string,
    @Body() body: { kind?: string; propertyId?: string; saw?: string },
    @Req() request: RequestWithReviewer,
  ) {
    const agent = await this.store.agentById(id);
    if (!agent) throw new NotFoundException('No such agent.');

    const kind = body?.kind === 'authority' ? 'authority' : body?.kind === 'identity' ? null : undefined;
    if (kind === undefined) {
      throw new BadRequestException("Say whether this is an 'identity' or an 'authority'.");
    }

    const propertyId = (body?.propertyId ?? '').trim();
    /*
      An authority is about a flat; an identity is about a person.

      The same shape every other evidence row has, and enforced here rather
      than left to the caller — an authority with no property would be a
      landlord confirming nothing in particular, which `mayList` would then
      never match against any listing.
    */
    if (body?.kind === 'authority' && propertyId.length === 0) {
      throw new BadRequestException('Say which property the landlord confirmed.');
    }

    const saw = (body?.saw ?? '').trim();
    /*
      What they actually observed, and it is mandatory.

      "Checked" is not an account of anything. A year from now somebody has to
      be able to read this and know whether the person on the phone was asked
      the right question — ADR-0006 — and at v1.0 this row is the *only* record
      that a check happened at all, because there is no vendor reference behind
      it.
    */
    if (saw.length < 20) {
      throw new BadRequestException(
        'Say what you saw or what they said, in at least twenty characters. This is the whole record.',
      );
    }

    /*
      An unattributed reviewer may not attest by hand.

      Every other reviewer route falls back to `'unattributed'` when the server
      is configured with a single shared token, and for a *decision* that is
      tolerable — the decision is recorded and the deployment is misconfigured.
      Here it is not: at v1.0 this row is the only evidence that a check
      happened, and evidence attributed to nobody is what ADR-0006 refuses.

      Configure `KEYS_REVIEWERS` as `name:token` and this works.
    */
    const reviewer = request.reviewer?.name ?? 'unattributed';
    if (reviewer === 'unattributed') {
      throw new BadRequestException(
        'A check by hand has to be attributed to a person. This server is configured with a shared reviewer token.',
      );
    }

    await this.store.recordByHand({
      agentId: id,
      kind: body?.kind === 'authority' ? 'authority' : 'identity',
      propertyId: body?.kind === 'authority' ? propertyId : null,
      // Named, always. An attestation by Keys with nobody on it is the thing
      // ADR-0006 refuses, and the guard above makes that structural.
      reviewer,
      saw,
      now: new Date(),
    });

    return { recorded: true, by: reviewer };
  }
}
