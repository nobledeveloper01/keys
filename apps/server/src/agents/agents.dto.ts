import { ApiProperty } from '@nestjs/swagger';

import { TIERS, VERIFIED_CONDITIONS } from '@keys/domain';

/**
 * What the wire carries. For the OpenAPI document, not for validation — the
 * controllers validate and the domain refuses, and a DTO that also validated
 * would be a second place a rule lives.
 *
 * Read the request bodies here and notice there is no tier on any of them.
 * That is not an omission to be corrected later: there is nowhere in this
 * product for a claimed tier to go.
 */

export class SignUpBody {
  @ApiProperty({ example: 'Chinedu Okafor' })
  displayName!: string;

  @ApiProperty({ example: '+2348012345678' })
  phone!: string;
}

export class SignUpResponse {
  @ApiProperty()
  agentId!: string;

  @ApiProperty({ description: 'Shown once. Keys does not store it, only its digest.' })
  token!: string;
}

export class AgentProfileResponse {
  @ApiProperty()
  agentId!: string;

  @ApiProperty()
  displayName!: string;

  @ApiProperty({ enum: TIERS, description: 'Computed from evidence on every read. Not stored.' })
  tier!: string;

  @ApiProperty({ description: 'What was actually checked, in words a tenant could go and verify.' })
  meaning!: string;

  @ApiProperty({ description: 'Properties a landlord has confirmed they may let.' })
  confirmedProperties!: number;

  @ApiProperty({ format: 'date-time' })
  joinedAt!: string;

  @ApiProperty({ description: 'Upheld scam reports against this agent. Zero is not a clean bill of health.' })
  upheldReports!: number;
}

export class IdentityCheckBody {
  @ApiProperty({ description: 'The KYC vendor that ran the liveness and document check.' })
  vendor!: string;

  @ApiProperty({ description: "The vendor's own reference for the check, so it can be re-pulled." })
  reference!: string;

  @ApiProperty({ description: 'The agent the vendor checked.' })
  agentId!: string;
}

export class AuthorityRequestBody {
  @ApiProperty({ description: 'The property this authority would cover.' })
  propertyId!: string;

  @ApiProperty({ example: '+2348012345678', description: "The landlord's number. Not the agent's." })
  landlordPhone!: string;
}

export class ChallengeOpenedResponse {
  @ApiProperty({ description: 'Given to the landlord, not to the agent.' })
  challengeId!: string;

  @ApiProperty({ format: 'date-time' })
  expiresAt!: string;

  @ApiProperty({ description: 'Whether the text could actually be sent yet.' })
  delivered!: boolean;

  @ApiProperty()
  whatHappensNext!: string;
}

export class AnswerChallengeBody {
  @ApiProperty()
  challengeId!: string;

  @ApiProperty({ example: '049217', description: 'The six digits from the text.' })
  code!: string;
}

export class ChallengeAnsweredResponse {
  @ApiProperty()
  confirmed!: boolean;

  @ApiProperty({ description: 'True when the code withdrew an authority rather than granting one.' })
  withdrawn!: boolean;

  @ApiProperty({ description: 'Listings that went dark as a result. Empty on a grant.' })
  unpublishedListings!: string[];

  @ApiProperty()
  meaning!: string;
}

export class AttestationView {
  @ApiProperty({ enum: ['identity', 'authority', 'standing'] })
  kind!: string;

  @ApiProperty({ description: "Who attested. Never a landlord's phone number." })
  attestor!: string;

  @ApiProperty({ type: String, nullable: true })
  propertyId!: string | null;

  @ApiProperty({ format: 'date-time' })
  at!: string;

  @ApiProperty({ description: 'False once withdrawn. Withdrawn evidence is kept, not deleted.' })
  live!: boolean;
}

export class AgentUnderReview {
  @ApiProperty() agentId!: string;
  @ApiProperty() displayName!: string;
  @ApiProperty({ enum: TIERS }) tier!: string;
  @ApiProperty() meaning!: string;
  @ApiProperty({ format: 'date-time' }) joinedAt!: string;
  @ApiProperty() upheldReports!: number;
  @ApiProperty() publishedListings!: number;

  @ApiProperty({ type: [AttestationView] })
  evidence!: AttestationView[];
}

export class CreateListingBody {
  @ApiProperty()
  propertyId!: string;

  @ApiProperty({ example: '2 bedroom flat, Yaba' })
  title!: string;

  @ApiProperty({
    type: Number,
    nullable: true,
    description: 'Where the property is. Optional at draft, needed before a capture can prove presence.',
  })
  latitude!: number | null;

  @ApiProperty({ type: Number, nullable: true })
  longitude!: number | null;
}

export class StillNeeded {
  @ApiProperty({ enum: VERIFIED_CONDITIONS })
  condition!: string;

  @ApiProperty({ description: 'A sentence with a next action in it, not a failure notice.' })
  whatToDo!: string;
}

export class ListingResponse {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  propertyId!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty({ type: String, nullable: true, format: 'date-time' })
  publishedAt!: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    format: 'date-time',
    description: 'When somebody last said this is still available. Null means never.',
  })
  confirmedAt!: string | null;

  @ApiProperty({
    description: 'Whether the property has coordinates. Captures cannot prove presence without them.',
  })
  placed!: boolean;

  @ApiProperty({
    type: [StillNeeded],
    description: 'Which of the seven Verified conditions are unmet, and what to do. Empty means Verified.',
  })
  stillNeeded!: StillNeeded[];
}
