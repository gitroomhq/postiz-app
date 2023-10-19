// Defines schema for password-reset-tokens collection
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema()
export class PasswordResetToken {
  @Prop({ unique: true })
  email: string;

  @Prop()
  token: string;
}

export const PasswordResetTokensSchema =
  SchemaFactory.createForClass(PasswordResetToken);

// TTL Index - Expires document after 30 minutes => Token expiry
PasswordResetTokensSchema.index({ "createdAt": 1 }, { expireAfterSeconds: 1800 })