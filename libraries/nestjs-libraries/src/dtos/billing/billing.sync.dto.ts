import { IsDefined, IsString } from 'class-validator';

export class BillingSyncDto {
  @IsDefined()
  @IsString()
  provider: string;
}
