import { IsIn, IsString, IsUUID, Length } from 'class-validator';

export class PrivacyExportDto {
  @IsString()
  @IsIn(['person', 'workspace'])
  target: 'person' | 'workspace';

  @IsUUID()
  targetId: string;

  @IsString()
  @Length(1, 100)
  requestReference: string;
}
