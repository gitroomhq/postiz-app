import { Global, Module } from '@nestjs/common';
import { HeygenProvider } from '@chaolaolo/nestjs-libraries/3rdparties/heygen/heygen.provider';
import { ThirdPartyManager } from '@chaolaolo/nestjs-libraries/3rdparties/thirdparty.manager';

@Global()
@Module({
  providers: [HeygenProvider, ThirdPartyManager],
  get exports() {
    return this.providers;
  },
})
export class ThirdPartyModule { }
