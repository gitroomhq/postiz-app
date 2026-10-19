import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  Min,
} from 'class-validator';

export class ClippingDto {
  @IsUrl({ require_protocol: true, protocols: ['http', 'https'] })
  url: string;

  // channels to create the draft posts for; without any, the clips only land in the media library
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  integrations?: string[];

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  clips?: number;

  // how the 16:9 picture lands on the vertical canvas: "blur" keeps all of it over a
  // blurred copy of itself, "crop" fills the canvas and cuts the sides
  @IsOptional()
  @IsIn(['crop', 'blur'])
  fit?: 'crop' | 'blur';
}
