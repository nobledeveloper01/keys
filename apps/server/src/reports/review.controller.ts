import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Req,
  NotFoundException,
  Param,
  Post,
  Query,
  UnprocessableEntityException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';

import { review, type Decision } from '@keys/domain';

import {
  DecisionBody,
  DecisionResponse,
  EvidenceBody,
  ReviewView,
  ThroughputResponse,
} from './reports.dto';
import { ReportsStore, type StoredReport } from './reports.store';
import { ReviewerGuard, type RequestWithReviewer } from './reviewer.guard';

const DECISIONS: readonly Decision[] = ['upheld', 'not_upheld', 'insufficient_evidence'];

/**
 * The review console. Every route here is behind the reviewer guard.
 *
 * The guard is declared on the controller rather than per-method on purpose:
 * a route added later inherits it, and a person adding one has to actively
 * remove protection rather than forget to add it.
 */
@ApiTags('review')
@ApiSecurity('reviewer')
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
  @ApiOkResponse({ type: ReviewView, isArray: true })
  async queue() {
    const rows = await this.store.queue();
    return { reports: rows.map((r) => this.view(r)) };
  }

  @Get('metrics')
  @ApiOperation({
    summary: 'What the queue is doing. Phase 1 does not close until this is watched.',
  })
  @ApiOkResponse({ type: ThroughputResponse })
  async metrics(@Query('sinceDays') sinceDays?: string) {
    const days = Number(sinceDays ?? 7);
    const since = new Date(Date.now() - (Number.isFinite(days) ? days : 7) * 86_400_000);
    return this.store.throughput(since);
  }

  @Get(':id')
  @ApiOperation({ summary: 'One report, in full, for review.' })
  @ApiOkResponse({ type: ReviewView })
  async one(@Param('id') id: string) {
    const row = await this.store.byId(id);
    if (!row) throw new NotFoundException('No such report.');
    return { ...this.view(row), history: await this.store.decisionsFor(id) };
  }

  @Post(':id/evidence')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Record evidence a reviewer obtained, with how it arrived.',
  })
  @ApiBody({ type: EvidenceBody })
  @ApiOkResponse({ type: ReviewView })
  async evidence(
    @Param('id') id: string,
    @Body() body: { note?: string; source?: string },
    @Req() request: RequestWithReviewer,
  ) {
    /*
      Phase 1 has no file upload — object storage lands in phase 3 — and
      `review()` refuses to uphold a report with no evidence. Without this the
      two decisions are each correct and the path between them does not exist:
      every report reachable from the web form would be permanently unupholdable.

      So evidence is recorded rather than uploaded, and what is recorded is the
      reviewer's own account of what they saw and how it reached them. That is
      weaker than a file and the record says so, in the row, where anybody
      auditing a decision will find it.
    */
    const note = (body.note ?? '').trim();
    const source = (body.source ?? '').trim();
    if (note.length < 20 || source.length < 3) {
      throw new BadRequestException(
        'Say what the evidence was, in at least twenty characters, and how it reached you.',
      );
    }

    const row = await this.store.byId(id);
    if (!row) throw new NotFoundException('No such report.');

    const key = `reviewer-attested:${source}:${note}`;
    await this.store.replace({ ...row, evidenceKeys: [...row.evidenceKeys, key] });
    await this.store.record({
      reportId: id,
      reviewer: request.reviewer?.name ?? 'unattributed',
      action: 'evidence_recorded',
      reasoning: `${note} (${source})`,
      at: new Date(),
    });
    return this.view((await this.store.byId(id))!);
  }

  @Post(':id/decision')
  // A decision creates nothing; it records one. 200 rather than Nest's default
  // 201, so the status says what happened.
  @HttpCode(200)
  @ApiOperation({ summary: 'Decide a report. The domain refuses what policy forbids.' })
  @ApiBody({ type: DecisionBody })
  @ApiOkResponse({ type: DecisionResponse })
  async decide(
    @Param('id') id: string,
    @Body() body: { decision?: string; reasoning?: string },
    @Req() request: RequestWithReviewer,
  ) {
    const decision = DECISIONS.find((d) => d === body.decision);
    if (!decision) {
      throw new BadRequestException(
        `A decision must be one of: ${DECISIONS.join(', ')}.`,
      );
    }

    /*
      Reasoning is mandatory, and the length floor is not bureaucracy.

      This decision may publish a public accusation about a named person, and it
      has to be answerable a year from now to somebody who was not in the room.
      "Looks legit" is not an answer, and a field that accepts it is a field
      that will mostly contain it.
    */
    const reasoning = (body.reasoning ?? '').trim();
    if (reasoning.length < 20) {
      throw new BadRequestException(
        'Say why, in at least twenty characters. This is the audit record for a public claim about a person.',
      );
    }

    const row = await this.store.byId(id);
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

    await this.store.replace({
      ...row,
      status: result.status,
      publishedAt: result.publishedAt,
      expiresAt: result.expiresAt,
    });

    // Recorded after the decision has actually been applied, so the audit trail
    // cannot claim something the reports table does not show.
    await this.store.record({
      reportId: id,
      reviewer: request.reviewer?.name ?? 'unattributed',
      action: decision,
      reasoning,
      at: new Date(),
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
