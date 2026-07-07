import { IsOptional, IsString } from 'class-validator';

export class MobilePushTokenDto {
  @IsString()
  token: string;

  @IsString()
  platform: string;

  @IsOptional()
  @IsString()
  deviceId?: string;

  @IsOptional()
  @IsString()
  appVersion?: string;

  @IsOptional()
  @IsString()
  buildNumber?: string;

  @IsOptional()
  @IsString()
  locale?: string;

  @IsOptional()
  @IsString()
  timezone?: string;
}

export class DeleteMobilePushTokenDto {
  @IsString()
  token: string;
}
