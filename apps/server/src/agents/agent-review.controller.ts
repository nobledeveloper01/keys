import {
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
}
