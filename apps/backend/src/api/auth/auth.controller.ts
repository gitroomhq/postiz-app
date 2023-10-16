import {
  Body,
  Controller,
  Post,Get,
  Res,
} from '@nestjs/common';
import { AuthValidator } from '@clickvote/validations';
import { Response } from 'express';
import { RegistrationLoginService } from '@clickvote/backend/src/shared/auth/registration.login.service';

@Controller('/auth')
export class AuthController {
  constructor(private _registrationLoginService: RegistrationLoginService) {}

  @Post('/register')
  async getData(
    @Body() register: AuthValidator,
    @Res({ passthrough: true }) response: Response
  ) {
    const sign = await this._registrationLoginService.register(register);
    const domain = process.env.FRONT_END_URL;
    const domainAttribute = domain.indexOf('localhost') > -1 ? {} : { domain: "." + new URL(domain).hostname.split(".").slice(-2).join("."), sameSite: 'none' as const, secure: true };
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

    response.cookie('auth', sign, {
      httpOnly: false,
      sameSite: 'strict',
      path: '/',
      ...domainAttribute
    });
  }
  @Get("/logout")
  async logout(@Res({ passthrough: true }) response: Response) {
    response.cookie("auth", "", {
      httpOnly: false,
      sameSite: "strict",
      path: "/",
      expires: new Date(0),
    });
  }
}
