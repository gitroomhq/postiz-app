import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { PasswordResetToken } from '@clickvote/backend/src/packages/reset/reset.document';
import { Model } from 'mongoose';

@Injectable()
export class PasswordResetTokensRepository {
  constructor(
    @InjectModel(PasswordResetToken.name)
    private resetDocument: Model<PasswordResetToken>
  ) {}

  // Here, all `token`s are hashed versions of password reset tokens
  // So, token <- hashed(token)
  async upsertToken(email: string, token: string) {
    return this.resetDocument
      .findOneAndUpdate(
        { email: email },
        { $set: { token: token, expireAt: Date.now() } },
        { upsert: true, new: true }
      )
      .exec();
  }

  async getByToken(token: string) {
    return this.resetDocument.findOne({ token }).exec();
  }

  async deleteByToken(token: string) {
    return this.resetDocument.deleteOne({ token }).exec();
  }
}
