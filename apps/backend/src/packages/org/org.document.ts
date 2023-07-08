import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type OrgDocument = HydratedDocument<Org>;

@Schema()
export class Org {
  @Prop()
  name: string;
}

export const OrgSchema = SchemaFactory.createForClass(Org);
