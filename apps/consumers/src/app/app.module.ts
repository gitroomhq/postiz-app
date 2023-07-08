import { Module } from '@nestjs/common';

import { AppController } from './app.controller';
import { BigdataModule } from '@clickvote/nest-libraries';

@Module({
  imports: [BigdataModule],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
