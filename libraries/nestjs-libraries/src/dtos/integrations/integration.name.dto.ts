import { IsDefined, IsString } from 'class-validator';

export class IntegrationNameDto {
  @IsString()
  @IsDefined()
  name: string;
}
