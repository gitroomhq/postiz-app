import { IsDefined, IsIn, IsInt, IsNumber, IsString, Max, Min } from 'class-validator';

export class AdminApplyCouponDto {
  @IsString()
  @IsIn(['percentage', 'amount'])
  type: string;

  @IsDefined()
  @IsNumber()
  @Min(1)
  value: number;

  @IsDefined()
  @IsInt()
  @Min(1)
  @Max(12)
  months: number;
}
