import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import {Org} from "@clickvote/backend/src/packages/org/org.document";
import mongoose from "mongoose";

@Schema()
export class User {
  @Prop()
  email: string;

  @Prop()
  password: string

  @Prop({ type: [mongoose.Schema.Types.ObjectId], ref: 'Org' })
  org: Array<Org>;
}

export const UserSchema = SchemaFactory.createForClass(User);
