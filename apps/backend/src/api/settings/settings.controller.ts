import { Controller, Get } from '@nestjs/common';
import { UserFromRequest } from '@clickvote/interfaces';
import { GetUserFromRequest } from '@clickvote/backend/src/helpers/user.from.request';
import { EnvironmentService } from '@clickvote/backend/src/packages/environment/environment.service';

@Controller('/settings')
export class SettingsController {
  constructor(private _environment: EnvironmentService) {}

  @Get('/')
  async getSelf(@GetUserFromRequest() user: UserFromRequest) {
    return this._environment.getKeysByOrgAndEnv(
      user.currentOrg.id,
      user.currentEnv.id
    );
  }
}
