import { Controller, NotFoundException, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';

import { ReviewerGuard, type RequestWithReviewer } from '../reports/reviewer.guard';
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
@ApiTags('review')
@Controller('v1/review/agents')
@UseGuards(ReviewerGuard)
@ApiSecurity('reviewer-token')
export class AgentReviewController {
  constructor(private readonly store: AgentsStore) {}

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
