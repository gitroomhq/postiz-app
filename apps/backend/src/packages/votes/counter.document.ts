import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import * as mongoose from "mongoose";
import {Votes} from "@clickvote/backend/src/packages/votes/vote.document";

export type CounterDocument = HydratedDocument<Counter>;

@Schema()
export class Counter {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Votes' })
  vote: Votes;

  @Prop({ index: true })
  identifier: string;

  @Prop({ index: true })
  country: string;

  @Prop({ index: true })
  identity: string;

  @Prop({ index: true })
  ip: string;
}

export const CounterSchema = SchemaFactory.createForClass(Counter);
