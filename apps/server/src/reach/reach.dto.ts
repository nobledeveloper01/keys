import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { APPLICATION_STATES, MARKET_BANDS, POWER_BANDS, TRANSPORT_MODES, WATER_SOURCES } from '@keys/domain';

export class AreaView {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() latitude!: number;
  @ApiProperty() longitude!: number;
}

export class CityView {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ type: [AreaView] }) areas!: AreaView[];
}

export class AnswerBody {
  @ApiProperty({ description: 'A tenancy this tenant holds; the answer is for its area.' }) tenancyId!: string;
  @ApiProperty({ enum: POWER_BANDS }) power!: string;
  @ApiProperty({ enum: WATER_SOURCES }) water!: string;
  @ApiProperty({ enum: TRANSPORT_MODES, isArray: true }) transport!: string[];
  @ApiProperty({ enum: MARKET_BANDS }) market!: string;
}

export class GuideView {
  @ApiProperty() areaId!: string;
  @ApiProperty() areaName!: string;
  @ApiProperty({ description: 'Separate tenants whose latest answer counts. Zero means below the floor, and nothing else is sent.' }) answers!: number;
  @ApiProperty() floor!: number;
  @ApiPropertyOptional({ type: Object, nullable: true }) power?: Record<string, number> | null;
  @ApiPropertyOptional({ type: Object, nullable: true }) water?: Record<string, number> | null;
  @ApiPropertyOptional({ type: Object, nullable: true }) transport?: Record<string, number> | null;
  @ApiPropertyOptional({ type: Object, nullable: true }) market?: Record<string, number> | null;
}

export class ApplyBody {
  @ApiProperty() occupation!: string;
  @ApiProperty() householdSize!: number;
  @ApiProperty({ format: 'date' }) moveInBy!: string;
  @ApiPropertyOptional({ maxLength: 1000 }) note?: string;
}

export class MoveApplicationBody {
  @ApiProperty({ enum: APPLICATION_STATES }) to!: string;
}

export class ProfileView {
  @ApiProperty() occupation!: string;
  @ApiProperty() householdSize!: number;
  @ApiProperty({ format: 'date' }) moveInBy!: string;
  @ApiProperty() note!: string;
}

export class TenantStandingView {
  @ApiProperty() accountAgeDays!: number;
  @ApiProperty() tenanciesRecorded!: number;
}

export class ApplicationEventView {
  @ApiProperty({ enum: ['submitted', 'moved'] }) kind!: string;
  @ApiProperty() by!: string;
  @ApiProperty({ format: 'date-time' }) at!: string;
  @ApiPropertyOptional({ enum: APPLICATION_STATES }) to?: string;
}

export class ApplicationView {
  @ApiProperty() id!: string;
  @ApiProperty() listingId!: string;
  @ApiProperty() listingTitle!: string;
  @ApiProperty({ enum: APPLICATION_STATES }) state!: string;
  @ApiProperty({ enum: APPLICATION_STATES, isArray: true }) moves!: string[];
  @ApiProperty({ type: ProfileView }) profile!: ProfileView;
  @ApiProperty({ type: TenantStandingView }) standing!: TenantStandingView;
  @ApiProperty({ type: [ApplicationEventView] }) events!: ApplicationEventView[];
}

export class SaveSearchBody {
  @ApiPropertyOptional() q?: string;
  @ApiPropertyOptional() city?: string;
  @ApiPropertyOptional() placeLatitude?: number;
  @ApiPropertyOptional() placeLongitude?: number;
  @ApiPropertyOptional() withinKm?: number;
  @ApiPropertyOptional({ description: 'Defaults to true, as the search does.' }) verifiedOnly?: boolean;
}

export class MarketMoveView {
  @ApiProperty({ enum: ['new', 'price', 'gone', 'reappeared'] }) kind!: string;
  @ApiProperty() id!: string;
  @ApiPropertyOptional({ type: Number, nullable: true }) fromKobo?: number;
  @ApiPropertyOptional({ type: Number, nullable: true }) toKobo?: number;
  @ApiPropertyOptional({ type: String, nullable: true, description: 'For a reappearance: the listing seen before whose photographs this one matches.' }) previousId?: string;
}

export class SavedSearchView {
  @ApiProperty() id!: string;
  @ApiProperty() q!: string;
  @ApiProperty({ type: String, nullable: true }) city!: string | null;
  @ApiProperty({ type: Number, nullable: true }) placeLatitude!: number | null;
  @ApiProperty({ type: Number, nullable: true }) placeLongitude!: number | null;
  @ApiProperty({ type: Number, nullable: true }) withinKm!: number | null;
  @ApiProperty() verifiedOnly!: boolean;
  @ApiProperty() savedAt!: string;
  @ApiProperty() readAt!: string;
  @ApiProperty({ description: 'How many the search sees now.' }) matching!: number;
  @ApiProperty({ type: [MarketMoveView], description: 'What moved since the last read. Empty on save.' }) moves!: MarketMoveView[];
}
