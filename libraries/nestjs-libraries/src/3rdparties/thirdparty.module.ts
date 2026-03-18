import { Global, Module } from '@nestjs/common';
import { HeygenProvider } from './heygen/heygen.provider';
import { SuperWarmProvider } from './superwarm/superwarm.provider';
import { ThirdPartyManager } from '@gitroom/nestjs-libraries/3rdparties/thirdparty.manager';

@Global()
@Module({
  providers: [HeygenProvider, SuperWarmProvider, ThirdPartyManager],
  get exports() {
    return this.providers;
  },
})
export class ThirdPartyModule {}
