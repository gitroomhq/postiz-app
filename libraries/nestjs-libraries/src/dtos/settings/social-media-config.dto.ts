import { IsDefined, IsString, MaxLength, ValidateNested, IsArray, ArrayMinSize, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

// Define the structure for each key-value pair in the config array
class ConfigItem {
  @IsDefined()
  @IsString()
  @MaxLength(100) // Ensure the key is reasonably sized
  key: string;

  @IsDefined()
  @IsString()
  @MaxLength(255) // Ensure the value is reasonably sized
  value: string;
}

export class SocialMediaConfigDto {
  @IsDefined()
  @IsString()
  @MaxLength(50)  // Ensure the platform name is reasonably sized
  platform: string;

  @IsDefined()
  @IsString()
  @MaxLength(100) // Ensure the API key is reasonably sized
  platformKey: string;
  @IsDefined()
  @IsString()
  customerId: string;

  @IsDefined()
  @IsArray() // Ensure it's an array
  @ArrayMinSize(1) // Ensure there's at least one config item
  @ValidateNested({ each: true }) // Validate each item in the array
  @Type(() => ConfigItem) // Ensure each item is an instance of ConfigItem
  config: ConfigItem[]; // The config array now contains key-value pairs for each platform
}
