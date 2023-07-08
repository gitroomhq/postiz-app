import { Point } from '../types/point';

export class VotesInterface {
  uuid?: string;

  env!: string;

  id!: string;

  to!: string;

  time!: Date;

  geo_location!: Point;

  device!: string;

  browser!: string;

  ref?: string;

  value!: number;

  user!: string;
}
