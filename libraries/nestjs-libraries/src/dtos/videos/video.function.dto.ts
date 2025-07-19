import { IsString } from 'class-validator';

export class VideoFunctionDto {
  @IsString()
  identifier: string;

  @IsString()
  functionName: string;

  params: any;
}
