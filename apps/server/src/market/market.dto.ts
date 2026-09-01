import { ApiProperty } from '@nestjs/swagger';

import { EXCHANGE_STATES, INSPECTION_STATES, OUTCOMES, SPEAKERS } from '@keys/domain';

export class TenantSignUpBody {
  @ApiProperty({ example: 'Ada' })
  displayName!: string;

  @ApiProperty({ example: '+2348012345678' })
  phone!: string;
}

export class TenantSignUpResponse {
  @ApiProperty()
  tenantId!: string;

  @ApiProperty({
    description:
      'Shown once. Keys keeps a digest and cannot return it again — see the release gates for where a client must put it.',
  })
  token!: string;
}

export class MessageResponse {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: SPEAKERS })
  speaker!: string;

  @ApiProperty()
  body!: string;

  @ApiProperty({ format: 'date-time' })
  sentAt!: string;
}

export class SayBody {
  @ApiProperty({ maxLength: 2000 })
  body!: string;
}

export class OpenConversationBody {
  @ApiProperty()
  listingId!: string;

  @ApiProperty({ description: 'The first thing to say. A conversation with nothing in it is not one.' })
  body!: string;
}

export class OfferContactBody {
  @ApiProperty({
    example: '+2348012345678',
    description:
      'The number you are choosing to share, here, with this person. Not read from your account — this product stores those as hashes, and a number that has to be revealed belongs only where revealing it is the point.',
  })
  contact!: string;
}

export class ConversationResponse {
  @ApiProperty() id!: string;
  @ApiProperty() listingId!: string;
  @ApiProperty() listingTitle!: string;

  @ApiProperty({ description: 'Who you are talking to. A name, never a number.' })
  otherPartyName!: string;

  @ApiProperty({ enum: EXCHANGE_STATES })
  exchange!: string;

  @ApiProperty({
    type: String,
    nullable: true,
    description:
      "The other party's number, and only once both of you have offered. Null at every other point, on every route, for everyone.",
  })
  theirContact!: string | null;

  @ApiProperty({ type: [MessageResponse] })
  messages!: MessageResponse[];
}

export class RequestInspectionBody {
  @ApiProperty()
  conversationId!: string;
}

export class AnswerInspectionBody {
  @ApiProperty({ description: 'Agree to show it, or decline.' })
  agreed!: boolean;

  @ApiProperty({
    example: 0,
    description:
      'What you will charge to show it, in kobo. Zero is an answer and a claim: a tenant who is then asked for money at the door can report it.',
  })
  feeKobo!: number;
}

export class OutcomeBody {
  @ApiProperty({ enum: OUTCOMES })
  outcome!: string;

  @ApiProperty({
    type: Number,
    nullable: true,
    required: false,
    description:
      'What you were actually asked for at the door, in kobo. Required when the outcome is asked_for_more_money, and checked against what the agent declared — a complaint its own figures contradict is refused rather than filed.',
  })
  paidKobo?: number | null;
}

export class InspectionResponse {
  @ApiProperty() id!: string;
  @ApiProperty() listingId!: string;
  @ApiProperty() listingTitle!: string;

  @ApiProperty({ enum: INSPECTION_STATES })
  state!: string;

  @ApiProperty({ description: 'What the agent said they would charge, in kobo.' })
  feeKobo!: number;

  @ApiProperty({ type: String, nullable: true, enum: OUTCOMES })
  outcome!: string | null;
}
