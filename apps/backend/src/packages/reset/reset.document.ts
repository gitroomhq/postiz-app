// Defines schema for password-reset-tokens collection
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema()
export class PasswordResetToken {
  @Prop({ unique: true })
  email: string;

  @Prop()
  token: string;

  @Prop({ type: Date, default: Date.now, index: { expires: '30m' } })
  expireAt: Date;
}

export const PasswordResetTokensSchema =
  SchemaFactory.createForClass(PasswordResetToken);