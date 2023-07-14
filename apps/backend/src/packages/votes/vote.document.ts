import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';
import { Org } from '@clickvote/backend/src/packages/org/org.document';
import { Environment } from '@clickvote/backend/src/packages/environment/environment.document';

export type VotesDocument = HydratedDocument<Votes>;

@Schema()
export class Votes {
  @Prop({ index: true })
  name: string;

  @Prop({ index: true })
  type: string;

  @Prop({ index: true })
  start: number;

  @Prop({ index: true })
  end: number;

  @Prop({ index: true })
  deleted: Date;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Org' })
  org: Org;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Environment' })
  env: Environment;

  @Prop({ index: true })
  sum: number;

  @Prop({ index: true })
  count: number;
}

export const VotesSchema = SchemaFactory.createForClass(Votes);
