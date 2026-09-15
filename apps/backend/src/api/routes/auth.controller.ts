import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { Response, Request } from 'express';

import { CreateOrgUserDto } from '@gitroom/nestjs-libraries/dtos/auth/create.org.user.dto';
import { LoginUserDto } from '@gitroom/nestjs-libraries/dtos/auth/login.user.dto';
import { AuthService } from '@gitroom/backend/services/auth/auth.service';
import { ForgotReturnPasswordDto } from '@gitroom/nestjs-libraries/dtos/auth/forgot-return.password.dto';
import { ForgotPasswordDto } from '@gitroom/nestjs-libraries/dtos/auth/forgot.password.dto';
import { ResendActivationDto } from '@gitroom/nestjs-libraries/dtos/auth/resend-activation.dto';
import { OtpRequestDto } from '@gitroom/nestjs-libraries/dtos/auth/otp.request.dto';
import { OtpVerifyDto } from '@gitroom/nestjs-libraries/dtos/auth/otp.verify.dto';
import { ApiTags } from '@nestjs/swagger';
import { getCookieUrlFromDomain } from '@gitroom/helpers/subdomain/subdomain.management';
import { EmailService } from '@gitroom/nestjs-libraries/services/email.service';
import { RealIP } from 'nestjs-real-ip';
import { UserAgent } from '@gitroom/nestjs-libraries/user/user.agent';
import { Provider } from '@gitroom/nestjs-libraries/database/prisma/generated/client';
import { makeId } from '@gitroom/nestjs-libraries/services/make.is';
import * as Sentry from '@sentry/nestjs';
import { areCookiesSecured } from '@gitroom/helpers/utils/cookies.secured';
import { isEmailActivationRequired } from '@gitroom/helpers/utils/activation.required';
import { AbuseGuardService } from '@gitroom/nestjs-libraries/services/abuse-guard.service';
import { isWalletLoginEnabled } from '@gitroom/helpers/utils/wallet.login';

@ApiTags('Auth')
@Controller('/auth')
export class AuthController {
  constructor(
    private _authService: AuthService,
    private _emailService: EmailService,
    private _abuseGuardService: AbuseGuardService,
  ) {}

  /**
   * These routes are unauthenticated and were entirely unthrottled: the global
   * throttler short-circuits everything except the public posts endpoint. That
   * left credential stuffing on /login and mail bombing through /register and
   * /forgot with no ceiling at all.
   */
  private async isAbusive(
    action: 'login' | 'register' | 'forgot',
    email: string,
    ip: string,
  ) {
    const decision = await this._abuseGuardService.challenge({
      action,
      email,
      ip,
    });

    return !decision.allow;
  }

  @Get('/can-register')
  async canRegister() {
    return {
      register: await this._authService.canRegister(Provider.LOCAL as string),
    };
  }

  @Post('/register')
  async register(
    @Req() req: Request,
    @Body() body: CreateOrgUserDto,
    @Res({ passthrough: false }) response: Response,
    @RealIP() ip: string,
    @UserAgent() userAgent: string,
  ) {
    if (await this.isAbusive('register', body.email, ip)) {
      response.status(429).send('Too many requests, please try again later');
      return;
    }

    try {
      const getOrgFromCookie = this._authService.getOrgFromCookie(
        req?.cookies?.org,
      );

      const { jwt, addedOrg } = await this._authService.routeAuth(
        body.provider,
        body,
        ip,
        userAgent,
        getOrgFromCookie,
      );

      // A provider round-trip already proves the address, so only LOCAL
      // sign-ups can need this. The provider check stays: requiring activation
      // with nothing able to deliver the link would lock the account out.
      const activationRequired =
        body.provider === 'LOCAL' &&
        isEmailActivationRequired() &&
        this._emailService.hasProvider();

      if (activationRequired) {
        response.header('activate', 'true');
        response.status(200).json({ activate: true });
        return;
      }

      response.cookie('auth', jwt, {
        domain: getCookieUrlFromDomain(process.env.FRONTEND_URL!),
        ...(areCookiesSecured()
          ? {
              secure: true,
              httpOnly: true,
              sameSite: 'none',
            }
          : {}),
        expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365),
      });

      if (!areCookiesSecured()) {
        response.header('auth', jwt);
      }

      if (typeof addedOrg !== 'boolean' && addedOrg?.organizationId) {
        response.cookie('showorg', addedOrg.organizationId, {
          domain: getCookieUrlFromDomain(process.env.FRONTEND_URL!),
          ...(areCookiesSecured()
            ? {
                secure: true,
                httpOnly: true,
                sameSite: 'none',
              }
            : {}),
          expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365),
        });

        if (!areCookiesSecured()) {
          response.header('showorg', addedOrg.organizationId);
        }
      }

      Sentry.metrics.count('new_user', 1);
      response.header('onboarding', 'true');
      response.status(200).json({
        register: true,
      });
    } catch (e: any) {
      response.status(400).type('text/plain').send(e.message);
    }
  }

  @Post('/login')
  async login(
    @Req() req: Request,
    @Body() body: LoginUserDto,
    @Res({ passthrough: false }) response: Response,
    @RealIP() ip: string,
    @UserAgent() userAgent: string,
  ) {
    if (await this.isAbusive('login', body.email, ip)) {
      response.status(429).send('Too many requests, please try again later');
      return;
    }

    try {
      const getOrgFromCookie = this._authService.getOrgFromCookie(
        req?.cookies?.org,
      );

      const { jwt, addedOrg } = await this._authService.routeAuth(
        body.provider,
        body,
        ip,
        userAgent,
        getOrgFromCookie,
      );

      response.cookie('auth', jwt, {
        domain: getCookieUrlFromDomain(process.env.FRONTEND_URL!),
        ...(areCookiesSecured()
          ? {
              secure: true,
              httpOnly: true,
              sameSite: 'none',
            }
          : {}),
        expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365),
      });

      if (!areCookiesSecured()) {
        response.header('auth', jwt);
      }

      if (typeof addedOrg !== 'boolean' && addedOrg?.organizationId) {
        response.cookie('showorg', addedOrg.organizationId, {
          domain: getCookieUrlFromDomain(process.env.FRONTEND_URL!),
          ...(areCookiesSecured()
            ? {
                secure: true,
                httpOnly: true,
                sameSite: 'none',
              }
            : {}),
          expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365),
        });

        if (!areCookiesSecured()) {
          response.header('showorg', addedOrg.organizationId);
        }
      }

      response.header('reload', 'true');
      response.status(200).json({
        login: true,
      });
    } catch (e: any) {
      response.status(400).type('text/plain').send(e.message);
    }
  }

  @Post('/forgot')
  async forgot(@Body() body: ForgotPasswordDto, @RealIP() ip: string) {
    try {
      if (!(await this.isAbusive('forgot', body.email, ip))) {
        await this._authService.forgot(body.email);
      }
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

  @Get('/oauth-mobile-callback')
  mobileCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res({ passthrough: false }) response: Response,
  ) {
    const scheme = process.env.MOBILE_APP_SCHEME || 'postqueen://auth/callback';
    const params = new URLSearchParams();
    if (code) params.set('code', code);
    if (state) params.set('state', state);
    return response.redirect(302, `${scheme}?${params.toString()}`);
  }

  @Get('/oauth/:provider')
  async oauthLink(
    @Param('provider') provider: string,
    @Query() query: any,
    @Res({ passthrough: true }) response: Response,
  ) {
    if (provider.toUpperCase() === 'WALLET' && !isWalletLoginEnabled()) {
      return response.status(404).send('Wallet login is disabled');
    }

    const state = `login-${makeId(16)}`;
    response.cookie('oauth_state', state, {
      domain: getCookieUrlFromDomain(process.env.FRONTEND_URL!),
      ...(areCookiesSecured()
        ? {
            secure: true,
            httpOnly: true,
            sameSite: 'none',
          }
        : {}),
      expires: new Date(Date.now() + 1000 * 60 * 10),
    });

    return this._authService.oauthLink(provider, { ...query, state });
  }

  @Post('/activate')
  async activate(
    @Body('code') code: string,
    @Body('datafast_visitor_id') datafast_visitor_id: string,
    @Res({ passthrough: false }) response: Response,
  ) {
    const activate = await this._authService.activate(
      code,
      datafast_visitor_id,
    );
    if (!activate) {
      return response.status(200).json({ can: false });
    }

    response.cookie('auth', activate, {
      domain: getCookieUrlFromDomain(process.env.FRONTEND_URL!),
      ...(areCookiesSecured()
        ? {
            secure: true,
            httpOnly: true,
            sameSite: 'none',
          }
        : {}),
      expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365),
    });

    if (!areCookiesSecured()) {
      response.header('auth', activate);
    }

    response.header('onboarding', 'true');

    return response.status(200).json({ can: true });
  }

  @Post('/resend-activation')
  async resendActivation(@Body() body: ResendActivationDto) {
    try {
      await this._authService.resendActivationEmail(body.email);
    } catch (e) {
      // Swallowed on purpose. Reporting "user not found" versus "already
      // activated" versus success turned this route into a three-way oracle on
      // whether an address has an account and whether it is active. /auth/forgot
      // already answers uniformly; this now matches it.
    }

    return {
      success: true,
    };
  }

  @Post('/oauth/:provider/redirect')
  oauthRedirect(
    @Param('provider') provider: string,
    @Body('code') code: string,
    @Body('state') state: string,
    @Res({ passthrough: false }) response: Response,
  ) {
    if (!code) {
      return response.redirect(303, `${process.env.FRONTEND_URL}/auth/login`);
    }

    const params = new URLSearchParams();
    params.set('code', code);
    if (state) params.set('state', state);
    params.set('provider', provider.toUpperCase());
    return response.redirect(
      303,
      `${process.env.FRONTEND_URL}/auth?${params.toString()}`,
    );
  }

  @Post('/oauth/:provider/exists')
  async oauthExists(
    @Req() req: Request,
    @Body('code') code: string,
    @Body('redirect_uri') redirect_uri: string,
    @Body('state') state: string,
    @Param('provider') provider: string,
    @RealIP() ip: string,
    @UserAgent() userAgent: string,
    @Res({ passthrough: false }) response: Response,
  ) {
    // a cross-site form post can spoof any body field, a json body cannot
    if (!req.headers['content-type']?.includes('application/json')) {
      return response.status(400).send('Invalid request');
    }

    if (provider.toUpperCase() === 'WALLET' && !isWalletLoginEnabled()) {
      return response.status(404).send('Wallet login is disabled');
    }

    try {
      const { jwt, token, isNew, linked, stepUp } =
        await this._authService.checkExists(
          provider,
          code,
          redirect_uri,
          state,
          req?.cookies?.oauth_state,
          ip,
          userAgent,
          req?.cookies?.oauth_link_user,
        );

      if (token) {
        return response.json({ token });
      }

      if (!jwt) {
        return response.status(400).send('Invalid user');
      }

      this.setAuthCookie(response, jwt);
      if (stepUp) {
        this.setStepUpCookie(response, stepUp);
      }

      if (linked) {
        response.cookie('oauth_link_user', '', {
          domain: getCookieUrlFromDomain(process.env.FRONTEND_URL!),
          ...(areCookiesSecured()
            ? {
                secure: true,
                httpOnly: true,
                sameSite: 'none',
              }
            : {}),
          maxAge: -1,
          expires: new Date(0),
        });
        return response.status(200).json({
          login: true,
          linked: true,
        });
      }

      if (isNew) {
        Sentry.metrics.count('new_user', 1);
        response.header('onboarding', 'true');
      }
      response.header('reload', 'true');

      return response.status(200).json({
        login: true,
        isNew: !!isNew,
      });
    } catch (e: any) {
      const status = typeof e?.status === 'number' ? e.status : 400;
      return response.status(status).type('text/plain').send(e.message);
    }
  }

  private setStepUpCookie(response: Response, token: string) {
    response.cookie('stepup', token, {
      domain: getCookieUrlFromDomain(process.env.FRONTEND_URL!),
      ...(areCookiesSecured()
        ? {
            secure: true,
            httpOnly: true,
            sameSite: 'none',
          }
        : {}),
      expires: new Date(Date.now() + 1000 * 60 * 20),
    });

    if (!areCookiesSecured()) {
      response.header('stepup', token);
    }
  }

  private setAuthCookie(response: Response, jwt: string) {
    response.cookie('auth', jwt, {
      domain: getCookieUrlFromDomain(process.env.FRONTEND_URL!),
      ...(areCookiesSecured()
        ? {
            secure: true,
            httpOnly: true,
            sameSite: 'none',
          }
        : {}),
      expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365),
    });

    if (!areCookiesSecured()) {
      response.header('auth', jwt);
    }
  }

  @Post('/otp/request')
  async otpRequest(
    @Body() body: OtpRequestDto,
    @RealIP() ip: string,
    @Res({ passthrough: false }) response: Response,
  ) {
    if (process.env.PASSWORDLESS_LOGIN !== 'true') {
      return response.status(400).send('Passwordless login is disabled');
    }

    try {
      await this._authService.requestOtp(body.email, ip, body.captchaToken);
      return response.status(200).json({ sent: true });
    } catch (e: any) {
      return response.status(400).type('text/plain').send(e.message);
    }
  }

  @Post('/otp/verify')
  async otpVerify(
    @Body() body: OtpVerifyDto,
    @RealIP() ip: string,
    @UserAgent() userAgent: string,
    @Res({ passthrough: false }) response: Response,
  ) {
    if (process.env.PASSWORDLESS_LOGIN !== 'true') {
      return response.status(400).send('Passwordless login is disabled');
    }

    try {
      const { jwt, isNew } = await this._authService.verifyOtp(
        body.email,
        body.code,
        ip,
        userAgent,
      );

      this.setAuthCookie(response, jwt);

      if (isNew) {
        response.header('onboarding', 'true');
      }
      response.header('reload', 'true');

      return response.status(200).json({ login: true, isNew });
    } catch (e: any) {
      return response.status(400).type('text/plain').send(e.message);
    }
  }
}
