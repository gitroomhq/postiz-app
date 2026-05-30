import { IsIn } from 'class-validator';

export class ChangePostStatusDto {
  @IsIn(['draft', 'schedule'])
  status: 'draft' | 'schedule';
}
