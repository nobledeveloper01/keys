import { ApiProperty } from '@nestjs/swagger';

import { REPORT_CATEGORIES, REPORT_STATUSES } from '@keys/domain';

/**
 * What the wire carries, described so the generated client is typed.
 *
 * These exist for the OpenAPI document, not for validation — the controllers
 * validate, and the domain refuses. A DTO that also validated would be a
 * second place where a rule lives, and the second place is the one that drifts.
 */

export class LookupResponse {
  @ApiProperty({
    description:
      'Always true. Present so that "we checked and found nothing" cannot be ' +
      'confused with "the request failed".',
  })
  checked!: boolean;

  @ApiProperty({ description: 'Reports a person reviewed and upheld. Never a count of submissions.' })
  upheldReports!: number;

  @ApiProperty({ enum: REPORT_CATEGORIES, isArray: true })
  categories!: string[];

  @ApiProperty({ type: String, nullable: true, format: 'date-time' })
  mostRecent!: string | null;

  @ApiProperty({ description: 'False if any published report went unanswered within its reply window.' })
  everyReportHadRightOfReply!: boolean;

  @ApiProperty({ description: 'Plain words for the reader. Zero upheld is not a clean bill of health.' })
  meaning!: string;
}

export class ReportAcceptedResponse {
  @ApiProperty()
  received!: boolean;

  @ApiProperty({ enum: REPORT_STATUSES })
  status!: string;

  @ApiProperty({ format: 'date-time' })
  replyDeadlineAt!: string;

  @ApiProperty()
  whatHappensNext!: string;
}

export class SubmitReportBody {
  @ApiProperty({ example: '+2348012345678' })
  reportedPhone!: string;

  @ApiProperty({ enum: REPORT_CATEGORIES })
  category!: string;

  @ApiProperty({ minLength: 20, description: 'A report nobody can assess cannot be upheld.' })
  description!: string;

  @ApiProperty({ type: [String], required: false })
  evidenceKeys?: string[];
}

export class ReplyView {
  @ApiProperty({ enum: REPORT_CATEGORIES })
  category!: string;

  @ApiProperty()
  description!: string;

  @ApiProperty({ format: 'date-time' })
  submittedAt!: string;

  @ApiProperty({ format: 'date-time' })
  replyBy!: string;

  @ApiProperty()
  alreadyReplied!: boolean;

  @ApiProperty()
  note!: string;
}

export class SubmitReplyBody {
  @ApiProperty({ description: 'The token texted to the number that was reported.' })
  token!: string;

  @ApiProperty({ minLength: 10 })
  reply!: string;
}

export class ReviewView {
  @ApiProperty() id!: string;
  @ApiProperty({ enum: REPORT_STATUSES }) status!: string;
  @ApiProperty({ enum: REPORT_CATEGORIES }) category!: string;
  @ApiProperty({ format: 'date-time' }) submittedAt!: string;
  @ApiProperty({ format: 'date-time' }) replyDeadlineAt!: string;
  @ApiProperty({ type: String, nullable: true, format: 'date-time' }) publishedAt!: string | null;
  @ApiProperty() description!: string;
  @ApiProperty() evidenceCount!: number;
  @ApiProperty() hasReply!: boolean;
  @ApiProperty({ type: String, nullable: true }) reply!: string | null;
}

export class EvidenceBody {
  @ApiProperty({
    minLength: 20,
    description: 'What the evidence was. A reviewer auditing this later reads exactly this.',
  })
  note!: string;

  @ApiProperty({
    minLength: 3,
    example: 'emailed screenshots',
    description: 'How it reached you. Phase 1 has no upload; phase 3 replaces this with files.',
  })
  source!: string;
}

export class DecisionBody {
  @ApiProperty({ enum: ['upheld', 'not_upheld', 'insufficient_evidence'] })
  decision!: string;
}

export class DecisionResponse {
  @ApiProperty() id!: string;
  @ApiProperty({ enum: REPORT_STATUSES }) status!: string;
  @ApiProperty({ type: String, nullable: true, format: 'date-time' }) publishedAt!: string | null;
  @ApiProperty({ description: 'Said out loud so a reviewer knows what they just did in public.' })
  nowVisiblePublicly!: boolean;
}
