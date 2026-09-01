import { randomUUID } from 'node:crypto';
import { AgentsStore } from '../agents/agents.store';
import {
  BadRequestException,
  NotFoundException,
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
  mayBeReportedAgainstAListing,
  standing,
  transparency as computeTransparency,
} from '@keys/domain';

import {
  LookupResponse,
  ReportAcceptedResponse,
  SubmitReportBody,
  TransparencyResponse,
} from './reports.dto';
import { replyLink } from '../outbox/links';
import { Outbox } from '../outbox/outbox';
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
  constructor(
    private readonly store: ReportsStore,
    private readonly outbox: Outbox,
    /*
      Read-only, and only to answer "whose listing is this".

      The reports module does not otherwise know that agents exist, and this is
      the one question it has to ask: a report filed against a property has to
      reach the person who posted it, and the reporter must not be the one who
      supplies that link.
    */
    private readonly agents: AgentsStore,
  ) {}

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
      listingId?: string;
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

    /*
      A listing, or a number, and the listing does not require the number.

      This is the hole deferred contact exchange opened and nobody noticed:
      every report is keyed on a phone number, and a tenant who found a listing
      through search has never seen one. Somebody could read the whole evidence
      panel, believe the place was fiction, and have no way to say so.

      So the listing resolves to the agent's hash *here*, on the server, from
      data the reporter never sees. They report a property; Keys knows whose it
      is. The reporter still never learns the number, which is the same promise
      the conversation makes.
    */
    const listingId = (body.listingId ?? '').trim() || null;
    const listing = listingId === null ? null : await this.agents.listing(listingId);
    if (listingId !== null && (!listing || listing.publishedAt === null)) {
      throw new NotFoundException('No such listing.');
    }
    if (listing !== null && !mayBeReportedAgainstAListing(category)) {
      /*
        `impersonation` is about a person, not a property.

        Somebody using another agent's name is doing it across everything they
        have posted, and filing that against one listing would make the report
        narrower than the problem. It is still reportable from the registry.
      */
      throw new BadRequestException(
        'That is about a person rather than a property. Report the number instead.',
      );
    }

    const agent = listing === null ? null : await this.agents.agentById(listing.agentId);

    if (listing === null && (!body.reportedPhone || body.reportedPhone.trim().length < 7)) {
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
      /*
        A hash the reporter could not have produced.

        `add` takes a plaintext number and hashes it, which is right for the
        registry path. Here there is no plaintext to give it — the agent's row
        holds only a hash — so the hash goes in directly and `reportedPhone` is
        empty. Two doors into one column, and neither of them hands anybody a
        number they did not already have.
      */
      reportedPhone: listing === null ? body.reportedPhone!.trim() : '',
      reportedPhoneHash: agent?.phoneHash ?? null,
      listingId,
      category,
      description: body.description.trim(),
      evidenceKeys: body.evidenceKeys ?? [],
      now: new Date(),
    });

    /*
      The right of reply, actually sent.

      Phase 1 shipped a reply token, a route that accepts it, and a page that
      uses it — and nothing anywhere that delivers it to the person being
      accused. The right of reply this product promises in its own copy, on
      every surface, has been a column in a database.

      Queued rather than sent, because there is still no provider (R1). What
      changes is that the message now exists and is addressed: when the
      provider lands, this flow works rather than needing to be built.

      The number is hashed here for the same reason as everywhere else — the
      outbox holds a destination, not a directory of who has been reported.
    */
    this.outbox.queue(
      {
        toPhoneHash: row.reportedPhoneHash,
        body:
          'Someone has reported this number to Keys. Nothing has been published ' +
          `and nothing will be until a person reviews it. Your side: ${replyLink(row.replyToken)}`,
      },
      new Date(),
    );

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
