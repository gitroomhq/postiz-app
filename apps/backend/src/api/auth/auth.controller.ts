import {
  Body,
  Controller,
  Post,
  Res,
} from '@nestjs/common';
import { AuthValidator } from '@clickvote/validations';
import { Response } from 'express';
import { RegistrationLoginService } from '@clickvote/backend/src/shared/auth/registration.login.service';
import { PosthogService } from '@clickvote/nest-libraries';
@Controller('/auth')
export class AuthController {
  constructor(private _registrationLoginService: RegistrationLoginService, private _posthogService:PosthogService) {}

  @Post('/register')
  async getData(
    @Body() register: AuthValidator,
    @Res({ passthrough: true }) response: Response
  ) {
    const sign = await this._registrationLoginService.register(register);
    const domain = process.env.FRONT_END_URL;
    const domainAttribute = domain.indexOf('localhost') > -1 ? {} : { domain: "." + new URL(domain).hostname.split(".").slice(-2).join("."), sameSite: 'none' as const, secure: true };
    this._posthogService.trackEvent("auth_register","registerEvent",{login_type:"email",email:register.email})
    response.cookie('auth', sign, {
      httpOnly: false,
      sameSite: 'strict',
      path: '/',
      ...domainAttribute
    });
  }

  @Post('/login')
  async login(
    @Body() login: AuthValidator,
    @Res({ passthrough: true }) response: Response
  ) {
    const sign = await this._registrationLoginService.login(login);
    const domain = process.env.FRONT_END_URL;
    const domainAttribute = domain.indexOf('localhost') > -1 ? {} : { domain: "." + new URL(domain).hostname.split(".").slice(-2).join("."), sameSite: 'none' as const, secure: true };
    this._posthogService.trackEvent("auth_login","loginEvent",{login_type:"email",email:login.email})

    response.cookie('auth', sign, {
      httpOnly: false,
      sameSite: 'strict',
      path: '/',
      ...domainAttribute
    });
  }
}
