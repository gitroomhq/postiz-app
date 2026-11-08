import { Injectable } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { AttributionProviderAbstract } from '@gitroom/nestjs-libraries/services/attribution/attribution.provider.interface';

@Injectable()
export class AttributionProviderManager {
  constructor(private _moduleRef: ModuleRef) {}

  // Only the providers configured on this instance
  getProviders(): { name: string; provider: AttributionProviderAbstract }[] {
    const metadata: { target: any; provider: string }[] =
      Reflect.getMetadata('attribution-provider', AttributionProviderAbstract) ||
      [];

    return metadata
      .map((m) => ({
        name: m.provider,
        provider: this._moduleRef.get<AttributionProviderAbstract>(m.target, {
          strict: false,
        }),
      }))
      .filter((p) => p.provider.isEnabled());
  }
}
