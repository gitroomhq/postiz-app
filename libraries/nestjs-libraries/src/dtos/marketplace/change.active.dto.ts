import { IsBoolean } from 'class-validator';

export class ChangeActiveDto {
  @IsBoolean()
  active: boolean;
}
