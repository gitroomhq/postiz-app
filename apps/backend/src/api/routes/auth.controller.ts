import {Body, Controller, Post, Res} from '@nestjs/common';
import {Response} from 'express';

import {CreateOrgUserDto} from "@gitroom/nestjs-libraries/dtos/auth/create.org.user.dto";
import {LoginUserDto} from "@gitroom/nestjs-libraries/dtos/auth/login.user.dto";
import {AuthService} from "@gitroom/backend/services/auth/auth.service";

@Controller('/auth')
export class AuthController {
  constructor(
      private _authService: AuthService
  ) {
  }
  @Post('/register')
  async register(
      @Body() body: CreateOrgUserDto,
      @Res({ passthrough: true }) response: Response
  ) {
    try {
      const jwt = await this._authService.routeAuth(body.provider, body);
      response.cookie('auth', jwt, {
        domain: '.' + new URL(process.env.FRONTEND_URL!).hostname,
        secure: true,
        httpOnly: true,
        expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365),
      });
      response.header('reload', 'true');
      response.status(200).send();
    }
    catch (e) {
      response.status(400).send(e.message);
    }
  }

  @Post('/login')
  async login(
      @Body() body: LoginUserDto,
      @Res({ passthrough: true }) response: Response
  ) {
    try {
      console.log('heghefrgefg');
      const jwt = await this._authService.routeAuth(body.provider, body);
      response.cookie('auth', jwt, {
        domain: '.' + new URL(process.env.FRONTEND_URL!).hostname,
        secure: true,
        httpOnly: true,
        expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365),
      });
      response.header('reload', 'true');
      response.status(200).send();
    }
    catch (e) {
      response.status(400).send(e.message);
    }
  }
}
