import { IsDefined, IsOptional, IsString, IsUrl } from 'class-validator';

export class ConnectLinkDto {
  @IsString()
  @IsDefined()
  integration: string;

  // The browser is sent here once the channel is connected, so only http(s)
  @IsOptional()
  @IsUrl({
    protocols: ['http', 'https'],
    require_protocol: true,
    require_tld: false,
  })
  redirectUrl?: string;
}
