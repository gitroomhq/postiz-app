import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type VotesListDocument = HydratedDocument<VotesList>;

@Schema({
  timeseries: {
    timeField: 'time',
    metaField: 'time_meta',
    granularity: 'hours'
  }
})
export class VotesList {
  @Prop()
  env: string;

  @Prop()
  to: string;

  @Prop({
    type: Object
  })
  time_meta: object;

  @Prop()
  time: Date;

  @Prop({
    type: {
      type: String,
      enum: ['Point'],
      required: true
    },
    coordinates: {
      type: [Number],
      required: true
    }
  })
  geo_location: string;

  @Prop()
  device: string;

  @Prop()
  browser: string;

  @Prop()
  ref: string;

  @Prop()
  value: number;

  @Prop()
  uuid: string;

  @Prop()
  user: string;

  @Prop()
  voteId: string;
}

export const VotesListSchema = SchemaFactory.createForClass(VotesList);
VotesListSchema.index({
  geo_location: '2dsphere'
})
