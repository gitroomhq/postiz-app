import {
    IsArray,
    IsDateString,
    IsDefined,
    IsOptional,
    IsString,
    MinLength,
    ValidateNested,
  } from 'class-validator';
  import { Type } from 'class-transformer';
  
  export class GithubRepositorySettings {
    @IsString()
    @IsDefined()
    repoName: string;
  
    @IsString()
    @IsDefined()
    owner: string;
  }
  
  export class GithubSettingsDto {
    @IsString()
    @MinLength(6)
    @IsDefined()
    title: string;
  
    @IsString()
    @MinLength(2)
    @IsOptional()
    description?: string;
  
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => GithubRepositorySettings)
    repositories: GithubRepositorySettings[];
  
    @IsOptional()
    @IsDateString()
    scheduledTime?: string; 
  }
  