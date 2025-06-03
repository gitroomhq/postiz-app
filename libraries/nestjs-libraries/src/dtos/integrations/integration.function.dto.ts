import { IsDefined, IsString } from 'class-validator';

export class IntegrationFunctionDto {
  @IsString()
  @IsDefined()
  name: string;

  @IsString()
  @IsDefined()
  id: string;

  data: any;
}
