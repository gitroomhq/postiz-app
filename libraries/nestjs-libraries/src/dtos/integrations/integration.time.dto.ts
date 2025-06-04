import { IsArray, IsDefined, IsNumber, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class IntegrationValidateTimeDto {
  @IsDefined()
  @IsNumber()
  time: number;
}
export class IntegrationTimeDto {
  @Type(() => IntegrationValidateTimeDto)
  @IsArray()
  @IsDefined()
  @ValidateNested({ each: true })
  time: IntegrationValidateTimeDto[];
}
