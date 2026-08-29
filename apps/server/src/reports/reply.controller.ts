import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Post,
  Query,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { ReplyView, SubmitReplyBody } from './reports.dto';
import { ReportsStore } from './reports.store';

/**
 * The reported party's side of the registry.
 *
 * Reachable only by the token texted to the number that was reported. No
 * account, because an accusation someone cannot answer without signing up is
 * an accusation most people will not answer, and a registry of unanswered
 * accusations is a rumour mill.
 */
@ApiTags('registry')
@Controller('v1/registry/reply')
export class ReplyController {
  constructor(private readonly store: ReportsStore) {}

  @Get()
  @ApiOperation({ summary: 'What was said about you. Requires the token texted to your number.' })
  @ApiOkResponse({ type: ReplyView })
  async show(@Query('token') token?: string) {
    const row = await this.store.byReplyToken((token ?? '').trim());
    if (!row) throw new NotFoundException('This link is not valid.');

    return {
      category: row.category,
      description: row.description,
      submittedAt: row.submittedAt,
      replyBy: row.replyDeadlineAt,
      alreadyReplied: row.hasReply,
      // No reporter, in any form. See `StoredReport.reporterId`.
      note:
        'Nothing about this has been published. If you answer before the date above, ' +
        'your answer is read alongside the report when a person reviews it.',
    };
  }

  @Post()
  @ApiOperation({ summary: 'Answer a report about your number.' })
  @ApiBody({ type: SubmitReplyBody })
  @ApiCreatedResponse({ description: 'The answer is on the record.' })
  async reply(@Body() body: { token?: string; reply?: string }) {
    const row = await this.store.byReplyToken((body.token ?? '').trim());
    if (!row) throw new NotFoundException('This link is not valid.');

    const text = (body.reply ?? '').trim();
    if (text.length < 10) {
      throw new BadRequestException('Write your answer, in at least ten characters.');
    }

    /*
      A reply is accepted after the deadline and after a decision, and is
      recorded either way.

      What the deadline governs is when a reviewer may uphold without one, not
      when someone stops being allowed to speak. Refusing a late reply would
      mean the record of a published report permanently lacks the answer of the
      person it names.
    */
    if (row.hasReply) {
      throw new UnprocessableEntityException(
        'You have already answered this report. Reviewers can see your answer.',
      );
    }

    await this.store.replace({ ...row, hasReply: true, reply: text });

    return {
      received: true,
      // Said explicitly, because a reply is not an appeal and must not read
      // like one.
      whatHappensNext: row.publishedAt
        ? 'Your answer is now on the record and a reviewer will look at this again.'
        : 'A reviewer reads your answer alongside the report before deciding anything.',
    };
  }
}
