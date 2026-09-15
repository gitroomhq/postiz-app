import { IsBoolean, IsDefined, IsString } from 'class-validator';

export class TransferOwnershipDto {
  @IsString()
  @IsDefined()
  userId: string;

  @IsBoolean()
  @IsDefined()
  confirm: boolean;
}
