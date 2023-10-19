import { Controller, Get } from '@nestjs/common';
import { UserFromRequest } from '@clickvote/interfaces';
import { GetUserFromRequest } from '@clickvote/backend/src/helpers/user.from.request';
import { EnvironmentService } from '@clickvote/backend/src/packages/environment/environment.service';
import { PosthogService } from '@clickvote/nest-libraries';

@Controller('/settings')
export class SettingsController {
  constructor(private _environment: EnvironmentService, private _posthogService:PosthogService) {}

  @Get('/')
  async getSelf(@GetUserFromRequest() user: UserFromRequest) {
    this._posthogService.trackEvent("settings", "settingsEvent", { login_type: "email", email: user.email })

    return this._environment.getKeysByOrgAndEnv(
      user.currentOrg.id,
      user.currentEnv.id
    );
  }
}
