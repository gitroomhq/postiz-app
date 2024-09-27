import { Body, Controller, Get, Param, Post, Req, Res } from '@nestjs/common';
import { Response, Request } from 'express';

import { CreateOrgUserDto } from '@gitroom/nestjs-libraries/dtos/auth/create.org.user.dto';
import { LoginUserDto } from '@gitroom/nestjs-libraries/dtos/auth/login.user.dto';
import { AuthService } from '@gitroom/backend/services/auth/auth.service';
import { ForgotReturnPasswordDto } from '@gitroom/nestjs-libraries/dtos/auth/forgot-return.password.dto';
import { ForgotPasswordDto } from '@gitroom/nestjs-libraries/dtos/auth/forgot.password.dto';
import { ApiTags } from '@nestjs/swagger';
import { getCookieUrlFromDomain } from '@gitroom/helpers/subdomain/subdomain.management';
import { EmailService } from '@gitroom/nestjs-libraries/services/email.service';

@ApiTags('Auth')
@Controller('/auth')
export class AuthController {
  constructor(
    private _authService: AuthService,
    private _emailService: EmailService
  ) {}
  @Post('/register')
  async register(
    @Req() req: Request,
    @Body() body: CreateOrgUserDto,
    @Res({ passthrough: true }) response: Response
  ) {
    try {
      const getOrgFromCookie = this._authService.getOrgFromCookie(
        req?.cookies?.org
      );

      const { jwt, addedOrg } = await this._authService.routeAuth(
        body.provider,
        body,
        getOrgFromCookie
      );

      const activationRequired = body.provider === 'LOCAL' && this._emailService.hasProvider();

      if (activationRequired) {
        response.header('activate', 'true');
        response.status(200).json({ activate: true });
        return;
      }

      response.cookie('auth', jwt, {
        domain: getCookieUrlFromDomain(process.env.FRONTEND_URL!),
        secure: true,
        httpOnly: true,
        sameSite: 'none',
        expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365),
      });

      if (typeof addedOrg !== 'boolean' && addedOrg?.organizationId) {
        response.cookie('showorg', addedOrg.organizationId, {
          domain: getCookieUrlFromDomain(process.env.FRONTEND_URL!),
          secure: true,
          httpOnly: true,
          sameSite: 'none',
          expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365),
        });
      }

      response.header('onboarding', 'true');
      response.status(200).json({
        register: true,
      });
    } catch (e) {
      response.status(400).send(e.message);
    }
  }

  @Post('/login')
  async login(
    @Req() req: Request,
    @Body() body: LoginUserDto,
    @Res({ passthrough: true }) response: Response
  ) {
    try {
      const getOrgFromCookie = this._authService.getOrgFromCookie(
        req?.cookies?.org
      );

      const { jwt, addedOrg } = await this._authService.routeAuth(
        body.provider,
        body,
        getOrgFromCookie
      );

      response.cookie('auth', jwt, {
        domain: getCookieUrlFromDomain(process.env.FRONTEND_URL!),
        secure: true,
        httpOnly: true,
        sameSite: 'none',
        expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365),
      });

      if (typeof addedOrg !== 'boolean' && addedOrg?.organizationId) {
        response.cookie('showorg', addedOrg.organizationId, {
          domain: getCookieUrlFromDomain(process.env.FRONTEND_URL!),
          secure: true,
          httpOnly: true,
          sameSite: 'none',
          expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365),
        });
      }

      response.header('reload', 'true');
      response.status(200).json({
        login: true,
      });
    } catch (e) {
      response.status(400).send(e.message);
    }
  }

  @Post('/forgot')
  async forgot(@Body() body: ForgotPasswordDto) {
    try {
      await this._authService.forgot(body.email);
      return {
        forgot: true,
      };
    } catch (e) {
      return {
        forgot: false,
      };
    }
  }

  @Post('/forgot-return')
  async forgotReturn(@Body() body: ForgotReturnPasswordDto) {
    const reset = await this._authService.forgotReturn(body);
    return {
      reset: !!reset,
    };
  }

  @Get('/oauth/:provider')
  async oauthLink(@Param('provider') provider: string) {
    return this._authService.oauthLink(provider);
  }

  @Post('/activate')
  async activate(
    @Body('code') code: string,
    @Res({ passthrough: true }) response: Response
  ) {
    const activate = await this._authService.activate(code);
    if (!activate) {
      return response.status(200).send({ can: false });
    }

    response.cookie('auth', activate, {
      domain: getCookieUrlFromDomain(process.env.FRONTEND_URL!),
      secure: true,
      httpOnly: true,
      sameSite: 'none',
      expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365),
    });

    response.header('onboarding', 'true');
    return response.status(200).send({ can: true });
  }

  @Post('/oauth/:provider/exists')
  async oauthExists(
    @Body('code') code: string,
    @Param('provider') provider: string,
    @Res({ passthrough: true }) response: Response
  ) {
    const { jwt, token } = await this._authService.checkExists(provider, code);
    if (token) {
      return response.json({ token });
    }

    response.cookie('auth', jwt, {
      domain: getCookieUrlFromDomain(process.env.FRONTEND_URL!),
      secure: true,
      httpOnly: true,
      sameSite: 'none',
      expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365),
    });

    response.header('reload', 'true');

    response.status(200).json({
      login: true,
    });
  }
}
