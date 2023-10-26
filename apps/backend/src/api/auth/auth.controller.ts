import { Body, Controller, HttpCode, Post, Res } from '@nestjs/common';
import { AuthValidator, ResetConfirmValidator, ResetRequestValidator } from '@clickvote/validations';
import { Response } from 'express';
import { RegistrationLoginService } from '@clickvote/backend/src/shared/auth/registration.login.service';
import { ResetPasswordService } from '@clickvote/backend/src/shared/auth/reset.service';

@Controller('/auth')
export class AuthController {
  constructor(
    private _registrationLoginService: RegistrationLoginService,
    private _resetPasswordService: ResetPasswordService
  ) {}

  @Post('/register')
  async getData(
    @Body() register: AuthValidator,
    @Res({ passthrough: true }) response: Response
  ) {
    const sign = await this._registrationLoginService.register(register);
    const domain = process.env.FRONT_END_URL;
    const domainAttribute =
      domain.indexOf('localhost') > -1
        ? {}
        : {
            domain:
              '.' + new URL(domain).hostname.split('.').slice(-2).join('.'),
            sameSite: 'none' as const,
            secure: true,
          };
    response.cookie('auth', sign, {
      httpOnly: false,
      sameSite: 'strict',
      path: '/',
      ...domainAttribute,
    });
  }

  @Post('/login')
  async login(
    @Body() login: AuthValidator,
    @Res({ passthrough: true }) response: Response
  ) {
    const sign = await this._registrationLoginService.login(login);
    const domain = process.env.FRONT_END_URL;
    const domainAttribute =
      domain.indexOf('localhost') > -1
        ? {}
        : {
            domain:
              '.' + new URL(domain).hostname.split('.').slice(-2).join('.'),
            sameSite: 'none' as const,
            secure: true,
          };

    response.cookie('auth', sign, {
      httpOnly: false,
      sameSite: 'strict',
      path: '/',
      ...domainAttribute,
    });
  }

  @Post('/reset/request')
  async reset(
    @Body() reset: ResetRequestValidator,
    @Res({ passthrough: true }) response: Response
  ) {
    await this._resetPasswordService.generateResetToken(reset);
    response.status(201);
    response.send('Reset URL sent to mail');
  }

  @Post('/reset/confirm')
  async confirmReset(
    @Body() reset: ResetConfirmValidator,
    @Res({ passthrough: true }) response: Response
  ){
    await this._resetPasswordService.setNewPassword(reset);
    response.status(204);
    response.send('Password reset successful');
  }
}
