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

/**
 * What a place costs, in kobo.
 *
 * Kobo rather than naira because these are integers and integers do not drift.
 * A client that wants "₦800,000" divides by a hundred at the point it prints;
 * nothing in the wire format or the database ever does.
 */
export class CostsBody {
  @ApiProperty({ example: 800_000_00, description: 'Rent for the year, in kobo.' })
  annualRentKobo!: number;

  @ApiProperty({ example: 80_000_00, description: 'The agent fee. Zero is an answer.' })
  agencyFeeKobo!: number;

  @ApiProperty({ example: 80_000_00, description: 'Preparing the tenancy agreement.' })
  legalFeeKobo!: number;

  @ApiProperty({ example: 100_000_00, description: 'Refundable at the end, payable on the day.' })
  cautionDepositKobo!: number;

  @ApiProperty({ example: 40_000_00, description: 'Service charge, where a building has one.' })
  serviceChargeKobo!: number;
}

/**
 * The same five, plus what they come to.
 *
 * The totals are computed and sent rather than left to each client, so that a
 * phone, a browser and a support agent looking at the API all see the same
 * number. The one figure this product exists to publish is not one to
 * reimplement three times.
 */
export class CostsResponse extends CostsBody {
  @ApiProperty({ description: 'Everything payable before keys change hands, deposit included.' })
  moveInKobo!: number;

  @ApiProperty({ description: 'What is on top of the advertised rent. The surprise, named.' })
  extrasKobo!: number;

  @ApiProperty({
    type: Number,
    nullable: true,
    description: 'The agency fee as a percentage of rent. Ten is customary; this says when it is not.',
  })
  agencyFeePercent!: number | null;

  @ApiProperty({ type: Number, nullable: true })
  legalFeePercent!: number | null;
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

  @ApiProperty({
    type: CostsBody,
    nullable: true,
    description:
      'What it costs. Optional at draft, needed before publication. Null is not the same as all zeroes: one is silence, the other is a claim.',
  })
  costs!: CostsBody | null;
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
    description: 'Which of the eight Verified conditions are unmet, and what to do. Empty means Verified.',
  })
  stillNeeded!: StillNeeded[];

  @ApiProperty({ type: CostsResponse, nullable: true, description: 'Null if the agent has not said.' })
  costs!: CostsResponse | null;
}

export class SearchResult {
  @ApiProperty() id!: string;
  @ApiProperty() title!: string;
  @ApiProperty() address!: string;

  @ApiProperty({ description: 'Computed on every search from evidence. Never a stored column.' })
  verified!: boolean;

  @ApiProperty() agentName!: string;

  @ApiProperty({
    type: Number,
    nullable: true,
    description:
      'Everything payable before keys change hands, in kobo. The comparable number — two listings advertising the same rent are not the same price, and a list showing only rent hides that.',
  })
  moveInKobo!: number | null;

  @ApiProperty({
    type: Number,
    nullable: true,
    description: 'Rent alone, in kobo. Sent beside the total so a reader can see the gap for themselves.',
  })
  annualRentKobo!: number | null;

  @ApiProperty({
    type: [String],
    description:
      'Why this is ranked where it is. Said out loud, because a ranking nobody can interrogate is one somebody will assume was bought.',
  })
  because!: string[];
}

export class ListingCheck {
  @ApiProperty({ enum: VERIFIED_CONDITIONS })
  condition!: string;

  @ApiProperty({ description: "The condition as a checklist row, in the reader's language." })
  label!: string;

  @ApiProperty()
  met!: boolean;
}

export class ListingView {
  @ApiProperty() id!: string;
  @ApiProperty() title!: string;
  @ApiProperty() address!: string;
  @ApiProperty() verified!: boolean;
  @ApiProperty() agentName!: string;

  @ApiProperty({ description: 'What was checked about the agent, in words a tenant could verify.' })
  agentMeaning!: string;

  @ApiProperty({
    type: [ListingCheck],
    description:
      'Every condition, met or not. Not a badge and not a score: the list of things that were checked, which a tenant can read and disagree with.',
  })
  checks!: ListingCheck[];

  @ApiProperty({
    type: CostsResponse,
    nullable: true,
    description:
      'Null when the agent has not said, which is itself an unmet condition rather than a blank in the page.',
  })
  costs!: CostsResponse | null;
}
