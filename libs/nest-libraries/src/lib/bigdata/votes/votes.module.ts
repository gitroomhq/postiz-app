import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { VotesList, VotesListSchema } from './votes.list.document';
import { VotesService } from './votes.service';
import { VotesRepository } from './votes.repository';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: VotesList.name, schema: VotesListSchema },
    ]),
  ],
  providers: [VotesService, VotesRepository],
  get exports() {
    return [...this.imports, ...this.providers];
  },
  controllers: [],
})
export class VotesModule {}
