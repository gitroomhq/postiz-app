import {
  IsArray,
  IsString,
  ArrayNotEmpty,
  ValidateNested,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

class ConfigItemDto {
  @ApiProperty({
    description: 'The key of the configuration item',
    example: 'CLIENT_ID',
  })
  @IsString()
  key: string;

  @ApiProperty({
    description: 'The value of the configuration item',
    example: '1A2B3C4D5E',
  })
  @IsString()
  value: string;
}

export class SocialMediaPlatformConfigDto {
  @ApiProperty({
    description: 'The name of the social media platform',
    example: 'Facebook',
  })
  @IsString()
  platform: string;

  @ApiProperty({
    description: 'Unique key for the social media platform configuration',
    example: 'FACEBOOK',
  })
  @IsString()
  platformKey: string;

  @ApiProperty({
    description: 'customerId for perticulsr Customer',
    example: '1',
  })
  @IsString()
  customerId: string;
  
  @ApiProperty({
    description: 'Configuration items for the social media platform',
    type: [ConfigItemDto],
  })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => ConfigItemDto)
  config: ConfigItemDto[];
}
