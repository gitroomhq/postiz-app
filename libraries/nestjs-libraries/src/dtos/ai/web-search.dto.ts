import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

const TOPICS = ['general', 'news', 'finance'] as const;
const DEPTHS = ['basic', 'advanced'] as const;
const FORMATS = ['markdown', 'text'] as const;
const MODES = ['search', 'extract'] as const;

export class WebSearchDto {
  @IsString()
  @MaxLength(500)
  query!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  maxResults?: number;

  @IsOptional()
  @IsEnum(TOPICS)
  topic?: 'general' | 'news' | 'finance';

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(30)
  days?: number;

  @IsOptional()
  includeAnswer?: boolean;

  @IsOptional()
  @IsEnum(DEPTHS)
  searchDepth?: 'basic' | 'advanced';
}

export class WebExtractDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @IsUrl({}, { each: true })
  urls!: string[];

  @IsOptional()
  @IsEnum(DEPTHS)
  extractDepth?: 'basic' | 'advanced';

  @IsOptional()
  @IsEnum(FORMATS)
  format?: 'markdown' | 'text';

  @IsOptional()
  @IsString()
  @MaxLength(500)
  query?: string;
}

export class GeneratePostFromWebDto {
  @IsEnum(MODES)
  mode!: 'search' | 'extract';

  // search mode
  @ValidateIf((o) => o.mode === 'search')
  @IsString()
  @MaxLength(500)
  query?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(30)
  days?: number;

  @IsOptional()
  @IsEnum(TOPICS)
  topic?: 'general' | 'news' | 'finance';

  // extract mode
  @ValidateIf((o) => o.mode === 'extract')
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @IsUrl({}, { each: true })
  urls?: string[];

  @IsOptional()
  @IsEnum(DEPTHS)
  extractDepth?: 'basic' | 'advanced';

  // shared
  @IsOptional()
  @IsString()
  platform?: string;

  @IsOptional()
  @IsString()
  tone?: string;
}
