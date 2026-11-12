import { IsDefined, IsIn, IsOptional, IsUrl } from 'class-validator';
import {
  allProviders,
  EmptySettings,
} from '@gitroom/nestjs-libraries/dtos/posts/providers-settings/all.providers.settings';

export class ConnectLinkDto {
  @IsDefined()
  @IsIn(allProviders(EmptySettings).map((p) => p.name), {
    message: `"integration" must be ${allProviders(EmptySettings)
      .map((p) => p.name)
      .join(', ')}`,
  })
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
