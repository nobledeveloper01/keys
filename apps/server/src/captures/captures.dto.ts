import { ApiProperty } from '@nestjs/swagger';

import { CAPTURE_REFUSALS, DUPLICATE_DECISIONS } from '@keys/domain';

export class RegisterDeviceBody {
  @ApiProperty({
    description:
      "The device's P-256 public key, SPKI DER, base64. P-256 because that is what the Secure Enclave holds.",
  })
  publicKey!: string;
}

export class CaptureBody {
  @ApiProperty() deviceId!: string;
  @ApiProperty() listingId!: string;

  @ApiProperty({
    description:
      'SHA-256 of the media bytes — the photograph or the video — lower-case hex. When no media is sent this is the grid, as it was before real photographs existed.',
  })
  sha256!: string;

  @ApiProperty({
    type: String,
    nullable: true,
    required: false,
    description:
      'SHA-256 of the greyscale grid. Inside the signature alongside the media hash, because the grid is what duplicate detection reads — a grid outside the signature is a grid an agent can invent, and a stolen photograph would arrive matching nothing.',
  })
  gridSha256?: string | null;

  @ApiProperty({
    type: String,
    required: false,
    description:
      'The photograph or video itself, base64. Optional while there is no camera on a simulator; what is not optional is that it hashes to the sha256 inside the signature.',
  })
  media?: string;

  @ApiProperty({ format: 'date-time' })
  capturedAt!: string;

  @ApiProperty() latitude!: number;
  @ApiProperty() longitude!: number;

  @ApiProperty({ description: 'Once per capture. A reused one is refused.' })
  nonce!: string;

  @ApiProperty({ description: 'What the OS said about the location. Signed, so it cannot be flipped.' })
  mockLocation!: boolean;

  @ApiProperty({ enum: ['photo', 'video'] })
  kind!: string;

  @ApiProperty({ type: Number, nullable: true })
  durationSeconds!: number | null;

  @ApiProperty({ description: 'ECDSA P-256 over SHA-256 of the canonical claim, DER, base64.' })
  signature!: string;

  @ApiProperty({
    description:
      'The capture itself: a Keys greyscale grid, base64. Its SHA-256 must be the one inside the signature.',
  })
  pixels!: string;
}

export class CaptureRefusedResponse {
  @ApiProperty()
  accepted!: boolean;

  @ApiProperty({ enum: CAPTURE_REFUSALS, isArray: true })
  refusals!: string[];

  @ApiProperty({ type: [String], description: 'One sentence per refusal, written for the agent.' })
  meaning!: string[];

  @ApiProperty({
    enum: DUPLICATE_DECISIONS,
    description: 'Never "blocked" here. A match opens a review; a person decides.',
  })
  duplicates!: string;

  @ApiProperty({ type: [String], description: 'Listings this image resembles.' })
  looksLikeListings!: string[];
}

export class DuplicatePairView {
  @ApiProperty({ description: 'The listing that uploaded the picture second.' })
  listingId!: string;

  @ApiProperty({ description: 'The listing that already had it.' })
  matchedListingId!: string;

  @ApiProperty({ description: 'Differing bits, out of 64. Zero is the same file.' })
  distance!: number;

  @ApiProperty({ format: 'date-time' })
  firstSeenAt!: string;

  @ApiProperty({ description: 'What the distance means, in words a reviewer can act on.' })
  meaning!: string;
}

export class DuplicateDecisionBody {
  @ApiProperty({ enum: ['blocked', 'allowed'] })
  decision!: string;

  @ApiProperty({ minLength: 20, description: 'Mandatory. This is the audit record.' })
  reasoning!: string;
}
