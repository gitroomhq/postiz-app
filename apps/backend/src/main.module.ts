import { Module } from '@nestjs/common';

import {AppModule} from "@clickvote/backend/src/api/app.module";
import {SharedModule} from "@clickvote/backend/src/shared/shared.module";
import {PackagesModule} from "@clickvote/backend/src/packages/packages.module";

@Module({
  imports: [AppModule, SharedModule, PackagesModule],
  controllers: [],
  providers: [],
})
export class MainModule {}
