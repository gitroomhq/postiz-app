import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Counter,
  CounterSchema,
} from '@clickvote/backend/src/packages/votes/counter.document';
import { VotesRepository } from '@clickvote/backend/src/packages/votes/votes.repository';
import { VotesService } from '@clickvote/backend/src/packages/votes/votes.service';
import {
  Votes,
  VotesSchema,
} from '@clickvote/backend/src/packages/votes/vote.document';
import { VotesList, VotesListSchema } from 'libs/nest-libraries/src/lib/bigdata/votes/votes.list.document';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Counter.name, schema: CounterSchema },
      { name: Votes.name, schema: VotesSchema },
      { name: VotesList.name, schema: VotesListSchema },
    ]),
  ],
  controllers: [],
  providers: [VotesRepository, VotesService],
  exports: [VotesService],
})
export class VotesModule {}
