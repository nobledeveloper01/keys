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

import { ReviewerGuard, type RequestWithReviewer } from '../reports/reviewer.guard';
import { CapturesStore } from './captures.store';
import { DuplicateDecisionBody, DuplicatePairView } from './captures.dto';

/**
 * The duplicate queue.
 *
 * Its own path — `/v1/duplicates` — rather than a segment under `/v1/review`,
 * where a `:id` wildcard would swallow it. That mistake cost a week the last
 * time and the phase gate now fails on it; this just avoids the shape.
 *
 * The queue holds *pairs*, not images. What a reviewer is answering is whether
 * two listings may both use a picture, and that question should be asked once
 * rather than again with every upload the two share.
 */
@ApiTags('review')
@Controller('v1/duplicates')
@UseGuards(ReviewerGuard)
@ApiSecurity('reviewer-token')
export class DuplicatesController {
  constructor(private readonly store: CapturesStore) {}

  @Get()
  @ApiOperation({ summary: 'Image matches waiting for a person. Closest first.' })
  @ApiOkResponse({ type: DuplicatePairView, isArray: true })
  async queue() {
    const pairs = await this.store.pendingPairs();
    return pairs.map((pair) => ({
      listingId: pair.listingId,
      matchedListingId: pair.matchedListingId,
      distance: pair.distance,
      firstSeenAt: pair.firstSeenAt.toISOString(),
      /*
        Said in words, because "distance: 2" is not a fact a reviewer can act
        on. Zero is the same file; a handful of bits is the same picture after
        a resize or a recompression; anything approaching the threshold is a
        judgement rather than a finding.
      */
      meaning:
        pair.distance === 0
          ? 'The same file, byte for byte.'
          : pair.distance <= 4
            ? 'The same picture, resized or recompressed.'
            : 'A close match. Look at both before deciding.',
    }));
  }

  @Post(':listingId/:matchedListingId')
  @ApiOperation({ summary: 'Block the copy, or allow both. Needs a reason either way.' })
  @ApiOkResponse({ description: 'What was decided.' })
  async decide(
    @Param('listingId') listingId: string,
    @Param('matchedListingId') matchedListingId: string,
    @Body() body: DuplicateDecisionBody,
    @Req() request: RequestWithReviewer,
  ) {
    const decision = body?.decision === 'blocked' ? 'blocked' : body?.decision === 'allowed' ? 'allowed' : null;
    if (decision === null) {
      throw new BadRequestException('A decision must be blocked or allowed.');
    }

    /*
      Mandatory reasoning, the same floor the report console uses.

      Blocking takes a listing off the market, and allowing says two agents may
      both use one photograph — a decision somebody may be asked about when the
      second one turns out to be a scam. "Looks fine" is not an answer, and a
      field that accepts it is a field that will mostly contain it.
    */
    const reasoning = (body?.reasoning ?? '').trim();
    if (reasoning.length < 20) {
      throw new BadRequestException(
        'Say why, in at least twenty characters. This is the audit record for a decision about somebody\u2019s listing.',
      );
    }

    const decided = await this.store.decidePair({
      listingId,
      matchedListingId,
      decision,
      reviewer: request.reviewer?.name ?? 'unattributed',
      reasoning,
    });
    if (!decided) throw new NotFoundException('No pending match for those two listings.');

    return {
      decided: true,
      decision,
      by: request.reviewer?.name ?? 'unattributed',
      // Said out loud, because a reviewer should know what they just did in
      // public rather than infer it from a status code.
      meaning:
        decision === 'blocked'
          ? 'That listing is no longer Verified, and cannot be until the image is replaced.'
          : 'Both listings keep the picture. This pair will not be asked about again.',
    };
  }
}
