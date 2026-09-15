import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpException,
  HttpStatus,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { OAuthService } from '@gitroom/nestjs-libraries/database/prisma/oauth/oauth.service';
import { GetUserFromRequest } from '@gitroom/nestjs-libraries/user/user.from.request';
import { GetOrgFromRequest } from '@gitroom/nestjs-libraries/user/org.from.request';
import { User, Organization } from '@prisma/client';
import { AuthorizeOAuthQueryDto, ApproveOAuthDto } from '@gitroom/nestjs-libraries/dtos/oauth/authorize-oauth.dto';
import { TokenExchangeDto } from '@gitroom/nestjs-libraries/dtos/oauth/token-exchange.dto';
import { RegisterClientDto } from '@gitroom/nestjs-libraries/dtos/oauth/register-client.dto';

@ApiTags('OAuth')
@Controller('/oauth')
export class OAuthController {
  constructor(private _oauthService: OAuthService) {}

  // Dynamic Client Registration (RFC 7591), used by MCP clients like Claude
  @Post('/register')
  @HttpCode(201)
  async register(@Body() body: RegisterClientDto) {
    return this._oauthService.registerDynamicClient(body);
  }

  @Get('/authorize')
  async authorize(@Query() query: AuthorizeOAuthQueryDto) {
    const app = await this._oauthService.validateAuthorizationRequest(
      query.client_id,
      {
        redirectUri: query.redirect_uri,
        codeChallenge: query.code_challenge,
        codeChallengeMethod: query.code_challenge_method,
      }
    );

    return {
      app: {
        name: app.name,
        description: app.description,
        picture: app.picture,
        clientId: app.clientId,
        redirectUrl: app.redirectUrl,
      },
      state: query.state,
    };
  }

  @Post('/token')
  async token(@Body() body: TokenExchangeDto) {
    if (body.grant_type !== 'authorization_code') {
      throw new HttpException(
        { error: 'unsupported_grant_type' },
        HttpStatus.BAD_REQUEST
      );
    }

    return this._oauthService.exchangeCodeForToken(
      body.code,
      body.client_id,
      body.client_secret,
      body.code_verifier,
      body.redirect_uri
    );
  }

  @Get('/userinfo')
  async userinfo(@Headers('authorization') authorization?: string) {
    return this._oauthService.getUserInfo(authorization);
  }

  @Post('/userinfo')
  async userinfoPost(@Headers('authorization') authorization?: string) {
    return this._oauthService.getUserInfo(authorization);
  }
}

@ApiTags('OAuth')
@Controller('/oauth')
export class OAuthAuthorizedController {
  constructor(private _oauthService: OAuthService) {}

  @Post('/authorize')
  async approveOrDeny(
    @Body() body: ApproveOAuthDto,
    @GetUserFromRequest() user: User,
    @GetOrgFromRequest() org: Organization
  ) {
    const app = await this._oauthService.validateAuthorizationRequest(
      body.client_id,
      {
        redirectUri: body.redirect_uri,
        codeChallenge: body.code_challenge,
        codeChallengeMethod: body.code_challenge_method,
      }
    );

    // Dynamic clients redirect to their validated redirect_uri,
    // static apps keep using the one stored on the app
    const redirectTarget = app.dynamic ? body.redirect_uri! : app.redirectUrl;

    if (body.action === 'deny') {
      const redirectUrl = new URL(redirectTarget);
      redirectUrl.searchParams.set('error', 'access_denied');
      if (body.state) {
        redirectUrl.searchParams.set('state', body.state);
      }
      return { redirect: redirectUrl.toString() };
    }

    const code = await this._oauthService.createAuthorizationCode(
      app.id,
      user.id,
      org.id,
      app.dynamic
        ? {
            codeChallenge: body.code_challenge,
            codeChallengeMethod: body.code_challenge_method,
            redirectUri: body.redirect_uri,
          }
        : undefined
    );

    const redirectUrl = new URL(redirectTarget);
    redirectUrl.searchParams.set('code', code);
    if (body.state) {
      redirectUrl.searchParams.set('state', body.state);
    }
    return { redirect: redirectUrl.toString() };
  }
}
