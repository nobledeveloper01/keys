import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  UnprocessableEntityException,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { review, type Decision } from '@keys/domain';

import { ReportsStore, type StoredReport } from './reports.store';
import { ReviewerGuard } from './reviewer.guard';

const DECISIONS: readonly Decision[] = ['upheld', 'not_upheld', 'insufficient_evidence'];

/**
 * The review console. Every route here is behind the reviewer guard.
 *
 * The guard is declared on the controller rather than per-method on purpose:
 * a route added later inherits it, and a person adding one has to actively
 * remove protection rather than forget to add it.
 */
@ApiTags('review')
@UseGuards(ReviewerGuard)
@Controller('v1/review')
export class ReviewController {
  constructor(private readonly store: ReportsStore) {}

  /** What a reviewer sees: enough to judge, without the reporter's identity. */
  private view(row: StoredReport) {
    return {
      id: row.id,
      status: row.status,
      category: row.category,
      submittedAt: row.submittedAt,
      replyDeadlineAt: row.replyDeadlineAt,
      publishedAt: row.publishedAt,
      description: row.description,
      evidenceCount: row.evidenceKeys.length,
      hasReply: row.hasReply,
      reply: row.reply,
      // reporterId and reportedPhoneHash are absent, deliberately. A reviewer
      // judges what happened, not who said it, and cannot leak what they were
      // never shown.
    };
  }

  @Get('queue')
  @ApiOperation({ summary: 'Reports awaiting a decision.' })
  queue() {
    return { reports: this.store.queue().map((r) => this.view(r)) };
  }

  @Get(':id')
  @ApiOperation({ summary: 'One report, in full, for review.' })
  one(@Param('id') id: string) {
    const row = this.store.byId(id);
    if (!row) throw new NotFoundException('No such report.');
    return this.view(row);
  }

  @Post(':id/decision')
  @ApiOperation({ summary: 'Decide a report. The domain refuses what policy forbids.' })
  decide(@Param('id') id: string, @Body() body: { decision?: string }) {
    const decision = DECISIONS.find((d) => d === body.decision);
    if (!decision) {
      throw new BadRequestException(
        `A decision must be one of: ${DECISIONS.join(', ')}.`,
      );
    }

    const row = this.store.byId(id);
    if (!row) throw new NotFoundException('No such report.');

    /*
      The reviewer does not decide whether this is allowed. `review` does.

      Everything the reviewer supplies is evidence about the world — which
      decision, whether evidence exists. Whether that decision is permitted
      given the reply window and the report's history is the domain's answer,
      and there is no branch here that can overrule it.
    */
    const result = review(row, decision, row.evidenceKeys.length > 0, new Date());
    if (!result.ok) {
      throw new UnprocessableEntityException({
        refused: result.reason,
        detail: result.detail,
      });
    }

    this.store.replace({
      ...row,
      status: result.status,
      publishedAt: result.publishedAt,
      expiresAt: result.expiresAt,
    });

    return {
      id: row.id,
      status: result.status,
      publishedAt: result.publishedAt,
      // Said out loud so a reviewer knows what they just did in public.
      nowVisiblePublicly: result.publishedAt !== null,
    };
  }
}
