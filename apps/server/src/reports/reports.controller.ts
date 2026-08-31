import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import {
  REPORT_CATEGORIES,
  isReportCategory,
  standing,
  transparency as computeTransparency,
} from '@keys/domain';

import {
  LookupResponse,
  ReportAcceptedResponse,
  SubmitReportBody,
  TransparencyResponse,
} from './reports.dto';
import { ReportsStore } from './reports.store';

/**
 * The scam registry's public face. No account, by design.
 *
 * This is the wedge: it is useful to somebody who found a property on
 * Facebook, with zero listings on Keys and zero agents onboarded. Requiring a
 * sign-up would destroy that, so there is no auth on the lookup and there must
 * never be.
 *
 * The consequence is that everything this returns is readable by anybody, so
 * what it returns is counts and categories and nothing else. No reporter, no
 * description, no evidence, and no report a person has not upheld.
 */
@ApiTags('registry')
@Controller('v1/registry')
export class ReportsController {
  constructor(private readonly store: ReportsStore) {}

  @Get('lookup')
  @ApiOperation({
    summary: 'What is publicly known about a number. No account required.',
  })
  @ApiOkResponse({ type: LookupResponse })
  async lookup(@Query('phone') phone?: string) {
    if (!phone || phone.trim().length < 7) {
      throw new BadRequestException('Give a phone number to look up.');
    }

    /*
      Two filters, deliberately.

      `publishedFor` excludes anything without a publication date in the query
      itself, and `standing` applies the domain rule again over what comes
      back. Belt and braces on the one query in this product where being wrong
      is a defamation claim rather than a bug report.
    */
    const reports = await this.store.publishedFor(phone.trim());
    const answer = standing(reports, new Date());

    return {
      // Said explicitly. "No reports" and "we have never heard of this number"
      // are the same answer here, and a reader must not take the first for a
      // clean bill of health.
      checked: true,
      upheldReports: answer.upheld,
      categories: answer.categories,
      mostRecent: answer.mostRecent,
      everyReportHadRightOfReply: answer.everyReportHadRightOfReply,
      meaning:
        answer.upheld === 0
          ? 'Nothing upheld against this number. That is not a guarantee: most scams are never reported.'
          : 'Each of these was reviewed by a person, and the reported party was given seven days to answer.',
    };
  }

  @Get('transparency')
  @ApiOperation({
    summary: 'What the registry says about its own accuracy. Public, no account.',
  })
  @ApiOkResponse({ type: TransparencyResponse })
  async transparency(@Query('sinceDays') sinceDays?: string) {
    /*
      Public and unauthenticated, on purpose.

      A registry that publishes accusations about named people and publishes
      nothing about how often it is wrong is asking for a trust it has not
      earned. The dismissal rate is the number nobody in this market publishes,
      and it is the one that makes both failure modes visible: a registry that
      upholds everything is a rumour mill, and one that upholds nothing is not
      working.

      Everything here is aggregate by construction — `Transparency` has no field
      that could carry a reviewer, a reporter, a number or a report id, so a
      later change to this endpoint cannot leak one.
    */
    const days = Number(sinceDays ?? 90);
    const window = Number.isFinite(days) ? Math.min(Math.max(days, 1), 365) : 90;
    const since = new Date(Date.now() - window * 86_400_000);

    return computeTransparency(await this.store.since(since), new Date(), since);
  }

  @Post('reports')
  @ApiOperation({ summary: 'Report a number. Nothing is published until a person reviews it.' })
  @ApiBody({ type: SubmitReportBody })
  // Created, not OK. Nest answers a POST with 201 and the document has to say
  // the same thing, or the generated client is typed against a response the
  // server never sends.
  @ApiCreatedResponse({ type: ReportAcceptedResponse })
  async report(
    @Body()
    body: {
      reportedPhone?: string;
      category?: string;
      description?: string;
      evidenceKeys?: string[];
      reporterId?: string;
    },
  ) {
    if (!isReportCategory(body.category)) {
      throw new BadRequestException(
        `A report needs one of these categories: ${REPORT_CATEGORIES.join(', ')}.`,
      );
    }
    const category = body.category;
    if (!body.reportedPhone || body.reportedPhone.trim().length < 7) {
      throw new BadRequestException('Give the phone number you are reporting.');
    }
    if (!body.description || body.description.trim().length < 20) {
      throw new BadRequestException(
        'Describe what happened, in at least twenty characters. A report nobody can assess cannot be upheld.',
      );
    }

    const row = await this.store.add({
      id: randomUUID(),
      // Recorded and never returned. See `StoredReport.reporterId`.
      reporterId: body.reporterId ?? 'anonymous',
      reportedPhone: body.reportedPhone.trim(),
      category,
      description: body.description.trim(),
      evidenceKeys: body.evidenceKeys ?? [],
      now: new Date(),
    });

    /*
      What comes back carries no report content at all.

      Not even to the person who just wrote it. Echoing it back would make
      this endpoint a way to store and retrieve arbitrary text about a named
      stranger, which is the registry with the review step removed.
    */
    return {
      received: true,
      status: row.status,
      replyDeadlineAt: row.replyDeadlineAt,
      whatHappensNext:
        'A person reviews this. The number you reported has seven days to answer ' +
        'before it can be published, and nothing appears publicly unless it is upheld.',
    };
  }
}
