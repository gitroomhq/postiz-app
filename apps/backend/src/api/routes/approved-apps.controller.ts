import { Controller, Delete, Get, Param } from '@nestjs/common';
import { GetUserFromRequest } from '@gitroom/nestjs-libraries/user/user.from.request';
import { User } from '@prisma/client';
import { ApiTags } from '@nestjs/swagger';
import { OAuthService } from '@gitroom/nestjs-libraries/database/prisma/oauth/oauth.service';

@ApiTags('Approved Apps')
@Controller('/user/approved-apps')
export class ApprovedAppsController {
  constructor(private _oauthService: OAuthService) {}

  @Get('/')
  async list(@GetUserFromRequest() user: User) {
    return this._oauthService.getApprovedApps(user.id);
  }

  @Delete('/:id')
  async revoke(
    @GetUserFromRequest() user: User,
    @Param('id') id: string
  ) {
    return this._oauthService.revokeApp(user.id, id);
  }
}
