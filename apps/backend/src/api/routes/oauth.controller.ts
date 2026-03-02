import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { OAuthService } from '@gitroom/nestjs-libraries/database/prisma/oauth/oauth.service';
import { OrganizationService } from '@gitroom/nestjs-libraries/database/prisma/organizations/organization.service';
import { AuthService } from '@gitroom/helpers/auth/auth.service';
import { User } from '@prisma/client';
import { AuthorizeOAuthQueryDto, ApproveOAuthDto } from '@gitroom/nestjs-libraries/dtos/oauth/authorize-oauth.dto';
import { TokenExchangeDto } from '@gitroom/nestjs-libraries/dtos/oauth/token-exchange.dto';

@ApiTags('OAuth')
@Controller('/oauth')
export class OAuthController {
  constructor(
    private _oauthService: OAuthService,
    private _organizationService: OrganizationService
  ) {}

  @Get('/authorize')
  async authorize(@Query() query: AuthorizeOAuthQueryDto) {
    const app = await this._oauthService.validateAuthorizationRequest(
      query.client_id
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

  @Post('/authorize')
  async approveOrDeny(
    @Body() body: ApproveOAuthDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ) {
    const auth = (req.headers as any).auth || req.cookies.auth;
    if (!auth) {
      throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    }

    let user: User;
    try {
      user = AuthService.verifyJWT(auth) as User;
      if (!user) {
        throw new Error();
      }
    } catch {
      throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    }

    const app = await this._oauthService.validateAuthorizationRequest(
      body.client_id
    );

    if (body.action === 'deny') {
      const redirectUrl = new URL(app.redirectUrl);
      redirectUrl.searchParams.set('error', 'access_denied');
      if (body.state) {
        redirectUrl.searchParams.set('state', body.state);
      }
      return { redirect: redirectUrl.toString() };
    }

    const orgs = await this._organizationService.getOrgsByUserId(user.id);
    const org = orgs.find((o: any) => !o.users?.[0]?.disabled);
    if (!org) {
      throw new HttpException(
        'No active organization found',
        HttpStatus.BAD_REQUEST
      );
    }

    const code = await this._oauthService.createAuthorizationCode(
      app.id,
      user.id,
      org.id
    );

    const redirectUrl = new URL(app.redirectUrl);
    redirectUrl.searchParams.set('code', code);
    if (body.state) {
      redirectUrl.searchParams.set('state', body.state);
    }
    return { redirect: redirectUrl.toString() };
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
      body.client_secret
    );
  }
}
