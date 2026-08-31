import { ApiProperty } from '@nestjs/swagger';

import { CAPTURE_REFUSALS, DUPLICATE_DECISIONS } from '@keys/domain';

export class RegisterDeviceBody {
  @ApiProperty({ description: "The device's Ed25519 public key, SPKI DER, base64." })
  publicKey!: string;
}

export class CaptureBody {
  @ApiProperty() deviceId!: string;
  @ApiProperty() listingId!: string;

  @ApiProperty({ description: 'SHA-256 of the media bytes, lower-case hex.' })
  sha256!: string;

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

  @ApiProperty({ description: 'Ed25519 over the canonical claim, base64.' })
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
