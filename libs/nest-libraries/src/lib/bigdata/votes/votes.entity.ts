import {Entity, EntityRepositoryType, Index, PrimaryKey, Property} from '@mikro-orm/core';
import { PointType } from '../types/point.type';
import { Point } from '../types/point';
import {VotesInterface} from "./votes.interface";
import {VotesRepository} from "./votes.repository";

@Entity({
  tableName: 'votes',
  customRepository: () => VotesRepository
})
export class VotesEntity implements VotesInterface {
  [EntityRepositoryType]?: VotesRepository;

  constructor(entity: VotesInterface) {
    Object.assign(this, entity);
  }

  @PrimaryKey({ type: 'uuid', defaultRaw: 'uuid_generate_v4()' })
  uuid!: string;

  @Index()
  @Property()
  env!: string;

  @Index()
  @Property()
  user!: string;

  @Index()
  @Property()
  id!: string;

  @Index()
  @Property()
  to!: string;

  @Index()
  @Property({
    type: 'datetime',
  })
  time!: Date;

  @Index()
  @Property({ type: PointType })
  geo_location!: Point;

  @Index()
  @Property()
  device!: string;

  @Index()
  @Property()
  browser!: string;

  @Index()
  @Property()
  ref?: string;

  @Index()
  @Property()
  value!: number;
}
