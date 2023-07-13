import { Module } from '@nestjs/common';
import { VotesModule } from './votes/votes.module';
@Module({
  imports: [
    VotesModule
  ],
  get exports() {
    return [...this.imports];
  },
})
export class BigdataModule {}
