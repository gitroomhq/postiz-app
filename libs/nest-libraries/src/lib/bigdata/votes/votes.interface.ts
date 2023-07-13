export class VotesInterface {
  uuid?: string;

  env!: string;

  id!: string;

  to!: string;

  geo_location!: {
    type: 'Point',
    coordinates: [number, number]
  };

  device!: string;

  browser!: string;

  ref?: string;

  value!: number;

  user!: string;
}
