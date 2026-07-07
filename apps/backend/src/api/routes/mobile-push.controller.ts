import { Body, Controller, Delete, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Organization, User } from '@prisma/client';
import { GetOrgFromRequest } from '@gitroom/nestjs-libraries/user/org.from.request';
import { GetUserFromRequest } from '@gitroom/nestjs-libraries/user/user.from.request';
import {
  DeleteMobilePushTokenDto,
  MobilePushTokenDto,
} from '@gitroom/nestjs-libraries/dtos/mobile/mobile-push-token.dto';
import { MobilePushService } from '@gitroom/nestjs-libraries/database/prisma/mobile-devices/mobile-push.service';

@ApiTags('Mobile')
@Controller('/mobile')
export class MobilePushController {
  constructor(private _mobilePushService: MobilePushService) {}

  @Post('/push-token')
  async registerPushToken(
    @GetUserFromRequest() user: User,
    @GetOrgFromRequest() organization: Organization,
    @Body() body: MobilePushTokenDto
  ) {
    await this._mobilePushService.registerDevice(user.id, organization.id, body);
    return { success: true };
  }

  @Delete('/push-token')
  async deletePushToken(
    @GetUserFromRequest() user: User,
    @GetOrgFromRequest() organization: Organization,
    @Body() body: DeleteMobilePushTokenDto
  ) {
    return this._mobilePushService.deleteDevice(
      user.id,
      organization.id,
      body.token
    );
  }
}
