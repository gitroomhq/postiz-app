import { Global, Module } from '@nestjs/common';
import { HeygenProvider } from '@gitroom/nestjs-libraries/3rdparties/heygen/heygen.provider';
import { ReelFarmProvider } from '@gitroom/nestjs-libraries/3rdparties/reelfarm/reelfarm.provider';
import { XquikProvider } from '@gitroom/nestjs-libraries/3rdparties/xquik/xquik.provider';
import { ThirdPartyManager } from '@gitroom/nestjs-libraries/3rdparties/thirdparty.manager';

@Global()
@Module({
  providers: [HeygenProvider, ReelFarmProvider, XquikProvider, ThirdPartyManager],
  get exports() {
    return this.providers;
  },
})
export class ThirdPartyModule {}
