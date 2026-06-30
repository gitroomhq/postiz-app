import { IsArray, IsOptional, IsString } from 'class-validator';

// Mapped Out (Phase 2B): set which channels/clients an existing member can access.
export class AssignMemberDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  integrationIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  customerIds?: string[];
}
