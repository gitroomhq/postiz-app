import { IsDefined, IsString } from 'class-validator';

export class HubspotInstallQueryDto {
  // Added by HubSpot to the HubSpot app's redirect URL after an install
  @IsString()
  @IsDefined()
  code: string;
}
