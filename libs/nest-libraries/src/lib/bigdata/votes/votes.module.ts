import { MikroOrmModule } from '@mikro-orm/nestjs';
import { VotesEntity } from './votes.entity';
import { VotesService } from './votes.service';
import { Module } from '@nestjs/common';

@Module({
  imports: [MikroOrmModule.forFeature([VotesEntity])],
  providers: [VotesService],
  get exports() {
    return [...this.imports, ...this.providers];
  },
  controllers: [],
})
export class VotesModule {}
