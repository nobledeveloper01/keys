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

import { REPORT_CATEGORIES, isReportCategory, standing } from '@keys/domain';

import {
  LookupResponse,
  ReportAcceptedResponse,
  SubmitReportBody,
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
  lookup(@Query('phone') phone?: string) {
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
    const reports = this.store.publishedFor(phone.trim());
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

  @Post('reports')
  @ApiOperation({ summary: 'Report a number. Nothing is published until a person reviews it.' })
  @ApiBody({ type: SubmitReportBody })
  // Created, not OK. Nest answers a POST with 201 and the document has to say
  // the same thing, or the generated client is typed against a response the
  // server never sends.
  @ApiCreatedResponse({ type: ReportAcceptedResponse })
  report(
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

    const row = this.store.add({
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
