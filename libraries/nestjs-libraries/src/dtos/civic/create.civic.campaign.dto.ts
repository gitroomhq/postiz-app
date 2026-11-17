import { IsBoolean, IsIn, IsOptional, IsString, IsUrl } from 'class-validator';

export class CreateCivicCampaignDto {
  @IsIn(['check_voter_list', 'polling_day', 'find_booth', 'documents', 'helpline', 'custom_civic'])
  theme: string;

  // Artwork label only. It is never used as a targeting field.
  @IsString()
  placeLabel: string;

  @IsIn(['en', 'hi', 'both'])
  language: string;

  @IsOptional()
  @IsString()
  pollDate?: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  officialUrl?: string;

  @IsOptional()
  @IsString()
  helpline?: string;

  @IsOptional()
  @IsString()
  paidForBy?: string;

  @IsOptional()
  @IsString()
  authorizedBy?: string;

  @IsOptional()
  @IsBoolean()
  demoWatermark?: boolean;
}

export class ApproveCivicCampaignDto {
  @IsString()
  paidForBy: string;

  @IsString()
  authorizedBy: string;

  @IsString()
  approverName: string;
}

export class LinkPublishedCivicPostDto {
  // ID of a Postiz post already published through the normal Facebook provider.
  @IsString()
  postId: string;
}
