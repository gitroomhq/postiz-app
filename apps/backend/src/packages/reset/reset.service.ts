import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PasswordResetTokensRepository } from '@clickvote/backend/src/packages/reset/reset.repository';
import { UsersService } from '@clickvote/backend/src/packages/users/users.service';
import { EncryptionService } from '@clickvote/nest-libraries';
import { MailService } from '@clickvote/backend/src/shared/mail/mail.service';

@Injectable()
export class PasswordResetTokenService {
  constructor(
    private readonly _resetRepository: PasswordResetTokensRepository,
    private readonly _userService: UsersService,
    private readonly _encryptionService: EncryptionService,
    private readonly _mailerService: MailService
  ) {}

  async hash(token: string) {
    return this._encryptionService.hashPasswordResetToken(token);
  }

  async genResetToken(email: string) {
    // Generate reset token
    const token = await this._encryptionService.genPasswordResetToken();
    const hashedToken = await this.hash(token);

    // Store it in DB - {email , hashedToken}
    await this._resetRepository.upsertToken(email, hashedToken);

    return token;
  }

  async sendResetLinkToMail(email: string, token: string) {
    const resetUrl = `app.clickvote.dev/auth/reset?token=${token}`;
    await this._mailerService.sendMail(
      email,
      'Clickvote Password Reset',
      `Password reset url -> ${resetUrl}`,
      `<strong>Password reset url -> ${resetUrl}<strong>`
    );
  }

  async setPassword(token: string, password: string) {
    const hashedToken = await this.hash(token);
    try {
      // retreive email if token is valid
      const email = (await this._resetRepository.getByToken(hashedToken)).email;
      const hashedPassword = await this._encryptionService.hashPassword(password);
      // Prune token(so that it can't be reused)
      await this._resetRepository.deleteByToken(hashedToken);
      // update password
      return await this._userService.updatePassword(email, hashedPassword);
    } catch (err) {
      throw new HttpException(
        'Token Expired/Invalid. Try again with valid token',
        HttpStatus.BAD_REQUEST
      );
    }
  }
}
