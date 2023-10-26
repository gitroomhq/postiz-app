import {
    HttpException,
    HttpStatus,
    Injectable,
  } from '@nestjs/common';
  import { PasswordResetTokenService } from '@clickvote/backend/src/packages/reset/reset.service';
  import { UsersService } from '@clickvote/backend/src/packages/users/users.service';
  import { ResetRequestValidator, ResetConfirmValidator } from '@clickvote/validations';
  
  @Injectable()
  export class ResetPasswordService {
    constructor(
      private _resetService: PasswordResetTokenService,
      private _userService: UsersService
    ) {}
  
    async generateResetToken(reset: ResetRequestValidator) {
      const user = await this._userService.getByEmail(reset.email);
      
      if (!user) {
        throw new HttpException('User isn\'t registered', HttpStatus.BAD_REQUEST);
      }
      
      const token = await this._resetService.genResetToken(reset.email);
  
      await this._resetService.sendResetLinkToMail(reset.email, token);
    }
  
    async setNewPassword(reset: ResetConfirmValidator) {
      await this._resetService.setPassword(reset.token, reset.password);
    }
  }
  