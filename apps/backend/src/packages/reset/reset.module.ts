import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  PasswordResetToken,
  PasswordResetTokensSchema,
} from '@clickvote/backend/src/packages/reset/reset.document';
import { PasswordResetTokensRepository } from '@clickvote/backend/src/packages/reset/reset.repository';
import { PasswordResetTokenService } from '@clickvote/backend/src/packages/reset/reset.service';
import { EncryptionService } from '@clickvote/nest-libraries';
import { UsersModule } from '@clickvote/backend/src/packages/users/users.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: PasswordResetToken.name, schema: PasswordResetTokensSchema }]),
    UsersModule
  ],
  controllers: [],
  providers: [PasswordResetTokensRepository, PasswordResetTokenService, EncryptionService],
  exports: [PasswordResetTokenService, EncryptionService],
})
export class PasswordResetTokensModule {}
