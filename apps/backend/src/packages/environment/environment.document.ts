import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import mongoose from 'mongoose';
import { Org } from '@clickvote/backend/src/packages/org/org.document';

export type EnvironmentDocument = HydratedDocument<Environment>;

@Schema()
export class Environment {
  @Prop()
  name: string;

  @Prop()
  apiKey: string;

  @Prop()
  secretKey: string;

  @Prop({ index: true })
  order: number;

  @Prop({ index: true, type: mongoose.Schema.Types.ObjectId, ref: 'Org' })
  org: Org;
}

export const EnvironmentSchema = SchemaFactory.createForClass(Environment);
