import { EntityRepository } from '@mikro-orm/postgresql';
import { VotesEntity } from './votes.entity';
import { VotesInterface } from './votes.interface'; // or any other driver package

export class VotesRepository extends EntityRepository<VotesEntity> {
  addRow(data: VotesInterface) {
    return this.em.fork().persistAndFlush(new VotesEntity(data));
  }
}
