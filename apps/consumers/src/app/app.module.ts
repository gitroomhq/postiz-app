import { Module } from '@nestjs/common';

import { AppController } from './app.controller';
import {BigdataModule, MongooseModule} from '@clickvote/nest-libraries';

@Module({
  imports: [MongooseModule, BigdataModule],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
