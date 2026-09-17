import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { TICKET_CATEGORIES, TICKET_STATES } from '@keys/domain';

export class OpenTenancyBody {
  @ApiProperty({ description: 'A property this agent holds current authority over.' })
  propertyId!: string;

  @ApiProperty({ description: "The tenant's account id, from the conversation." })
  tenantId!: string;

  @ApiProperty({ description: 'Rent for one period, in kobo.' })
  rentKobo!: number;

  @ApiProperty({ enum: ['monthly', 'quarterly', 'yearly'] })
  period!: 'monthly' | 'quarterly' | 'yearly';

  @ApiProperty({ description: 'Whole periods the agreement runs for.' })
  periods!: number;

  @ApiProperty()
  cautionDepositKobo!: number;

  @ApiProperty({ format: 'date', example: '2026-10-01' })
  startsOn!: string;
}

export class TenantKeyBody {
  @ApiProperty({ description: "This phone's public key, SPKI DER, base64." })
  publicKey!: string;
}

export class SignBody {
  @ApiProperty({ description: 'Base64 signature over the agreement bytes, with this party’s device key.' })
  signature!: string;

  @ApiPropertyOptional({ description: 'For an agent: the registered device the signature came from.' })
  deviceId?: string;
}

export class RecordPaymentBody {
  @ApiProperty()
  periodIndex!: number;

  @ApiProperty({ description: 'In kobo. Recorded as received; Keys did not receive it.' })
  amountKobo!: number;

  @ApiProperty({ format: 'date' })
  receivedOn!: string;

  @ApiPropertyOptional()
  note?: string;
}

export class CorrectPaymentBody {
  @ApiProperty()
  amountKobo!: number;

  @ApiProperty({ description: 'Why the earlier entry was wrong. Required: a correction without a reason is an edit.' })
  note!: string;
}

export class DisputeBody {
  @ApiProperty()
  note!: string;
}

export class EndBody {
  @ApiPropertyOptional()
  note?: string;
}

export class OpenTicketBody {
  @ApiProperty({ enum: TICKET_CATEGORIES })
  category!: string;

  @ApiProperty({ maxLength: 2000 })
  description!: string;

  @ApiPropertyOptional({ type: [String], description: 'SHA-256 hex of each photograph.' })
  photoHashes?: string[];
}

export class MoveTicketBody {
  @ApiProperty({ enum: TICKET_STATES })
  to!: string;

  @ApiPropertyOptional()
  note?: string;
}

export class NoteTicketBody {
  @ApiProperty({ maxLength: 2000 })
  note!: string;

  @ApiPropertyOptional({ type: [String] })
  photoHashes?: string[];
}

export class RoomItemBody {
  @ApiProperty()
  caption!: string;

  @ApiProperty({ description: 'SHA-256 hex of the photograph, taken the moment it was captured.' })
  photoHash!: string;

  @ApiProperty({ enum: ['snag', 'fine'] })
  verdict!: 'snag' | 'fine';
}

export class RoomBody {
  @ApiProperty()
  name!: string;

  @ApiProperty({ type: [RoomItemBody] })
  items!: RoomItemBody[];
}

export class ConditionRecordBody {
  @ApiProperty({ enum: ['move_in', 'move_out'] })
  walk!: 'move_in' | 'move_out';

  @ApiPropertyOptional({ description: 'For a move-out: the move-in it is compared against.' })
  comparesTo?: string;

  @ApiProperty({ type: [RoomBody] })
  rooms!: RoomBody[];

  @ApiProperty({ format: 'date-time' })
  takenAt!: string;
}

export class AcknowledgeBody {
  @ApiProperty({ description: 'Base64 signature over the record bytes.' })
  signature!: string;

  @ApiPropertyOptional()
  deviceId?: string;
}

// ---- Responses, so the generated client carries the shapes and the app reads nothing it invented.

export class AgreementView {
  @ApiProperty() templateVersion!: string;
  @ApiProperty() propertyId!: string;
  @ApiProperty() tenantId!: string;
  @ApiProperty() lettingId!: string;
  @ApiProperty() rentKobo!: number;
  @ApiProperty({ enum: ['monthly', 'quarterly', 'yearly'] }) period!: string;
  @ApiProperty() periods!: number;
  @ApiProperty() cautionDepositKobo!: number;
  @ApiProperty({ format: 'date' }) startsOn!: string;
}

export class DueView {
  @ApiProperty() index!: number;
  @ApiProperty({ format: 'date' }) dueOn!: string;
  @ApiProperty() amountKobo!: number;
}

export class RecordedView {
  @ApiProperty() periodIndex!: number;
  @ApiProperty({ format: 'date' }) dueOn!: string;
  @ApiProperty() dueKobo!: number;
  @ApiProperty({ description: 'Recorded against this period after corrections. Labelled recorded, never paid.' }) recordedKobo!: number;
  @ApiProperty() disputed!: boolean;
}

export class TenancyEntryView {
  @ApiProperty({ enum: ['agreement_signed', 'payment_recorded', 'payment_corrected', 'payment_disputed', 'ended'] }) kind!: string;
  @ApiProperty() by!: string;
  @ApiProperty({ format: 'date-time' }) at!: string;
  @ApiPropertyOptional() id?: string;
  @ApiPropertyOptional() periodIndex?: number;
  @ApiPropertyOptional() amountKobo?: number;
  @ApiPropertyOptional({ format: 'date-time' }) receivedOn?: string;
  @ApiPropertyOptional() corrects?: string;
  @ApiPropertyOptional() disputes?: string;
  @ApiPropertyOptional({ type: String, nullable: true }) note?: string | null;
  @ApiPropertyOptional() signature?: string;
}

export class TenancyView {
  @ApiProperty() id!: string;
  @ApiProperty({ type: AgreementView }) agreement!: AgreementView;
  @ApiProperty() templateLegallyReviewed!: boolean;
  @ApiProperty() signed!: boolean;
  @ApiProperty({ type: [DueView] }) schedule!: DueView[];
  @ApiProperty({ type: [RecordedView] }) recorded!: RecordedView[];
  @ApiProperty({ type: [TenancyEntryView] }) entries!: TenancyEntryView[];
  @ApiProperty() note!: string;
}

export class AgreementBytesView {
  @ApiProperty() message!: string;
  @ApiProperty() templateVersion!: string;
  @ApiProperty() templateLegallyReviewed!: boolean;
  @ApiProperty() legalAdvice!: string;
}

export class ReceiptView {
  @ApiProperty() tenancyId!: string;
  @ApiProperty() paymentId!: string;
  @ApiProperty() periodIndex!: number;
  @ApiProperty() periods!: number;
  @ApiProperty() amountKobo!: number;
  @ApiProperty({ format: 'date-time' }) receivedOn!: string;
  @ApiProperty() recordedBy!: string;
  @ApiProperty({ format: 'date-time' }) recordedAt!: string;
  @ApiProperty({ type: Number, nullable: true }) correctedToKobo!: number | null;
  @ApiProperty() text!: string;
}

export class TicketEventView {
  @ApiProperty({ enum: ['opened', 'moved', 'noted'] }) kind!: string;
  @ApiProperty() by!: string;
  @ApiProperty({ enum: ['tenant', 'letting'] }) party!: string;
  @ApiProperty({ format: 'date-time' }) at!: string;
  @ApiPropertyOptional() category?: string;
  @ApiPropertyOptional() description?: string;
  @ApiPropertyOptional() to?: string;
  @ApiPropertyOptional({ type: String, nullable: true }) note?: string | null;
  @ApiPropertyOptional({ type: [String] }) photoHashes?: string[];
}

export class TicketView {
  @ApiProperty() id!: string;
  @ApiProperty() tenancyId!: string;
  @ApiProperty({ enum: TICKET_STATES }) state!: string;
  @ApiProperty({ enum: TICKET_STATES, isArray: true, description: 'Where this party may move it now.' }) moves!: string[];
  @ApiProperty({ type: [TicketEventView] }) events!: TicketEventView[];
}

export class AcknowledgementView {
  @ApiProperty() by!: string;
  @ApiProperty({ format: 'date-time' }) at!: string;
}

export class ConditionView {
  @ApiProperty() id!: string;
  @ApiProperty() tenancyId!: string;
  @ApiProperty({ enum: ['move_in', 'move_out'] }) walk!: string;
  @ApiProperty({ type: String, nullable: true }) comparesTo!: string | null;
  @ApiProperty({ type: [RoomBody] }) rooms!: RoomBody[];
  @ApiProperty({ format: 'date-time' }) takenAt!: string;
  @ApiProperty({ type: [AcknowledgementView] }) acknowledgements!: AcknowledgementView[];
  @ApiProperty() acknowledgedByBoth!: boolean;
  @ApiProperty({ description: 'The bytes each party signs.' }) message!: string;
}

export class RoomChangeView {
  @ApiProperty() room!: string;
  @ApiProperty({ type: [String] }) newSnags!: string[];
  @ApiProperty({ type: [String] }) fixed!: string[];
  @ApiProperty({ type: [String] }) missing!: string[];
  @ApiProperty({ type: [String] }) added!: string[];
}

export class PortfolioRowView {
  @ApiProperty() tenancyId!: string;
  @ApiProperty() propertyId!: string;
  @ApiProperty() signed!: boolean;
  @ApiProperty({ type: String, format: 'date', nullable: true }) nextDueOn!: string | null;
  @ApiProperty() nextDueKobo!: number;
  @ApiProperty() nextRecordedKobo!: number;
  @ApiProperty() periodsShort!: number;
  @ApiProperty() disputed!: boolean;
  @ApiProperty() openTickets!: number;
  @ApiProperty({ type: Number, nullable: true }) longestWaitingDays!: number | null;
}
