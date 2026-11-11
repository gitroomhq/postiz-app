import { IsBoolean } from 'class-validator';

export class DpaSignedDto {
  @IsBoolean()
  dpaSigned: boolean;
}
