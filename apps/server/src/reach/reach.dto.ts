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
