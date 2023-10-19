import { Controller, Put, Body } from '@nestjs/common';
import { UserFromRequest } from '@clickvote/interfaces';
import { GetUserFromRequest } from '@clickvote/backend/src/helpers/user.from.request';
import { OrgService } from "@clickvote/backend/src/packages/org/org.service";
import { PosthogService } from '@clickvote/nest-libraries';

@Controller('/org')
export class OrgController {
  constructor(private _org: OrgService, private _posthogService: PosthogService) { }

  @Put('/update')
  async getSelf(@GetUserFromRequest() user: UserFromRequest,
    @Body('name') name: string) {
    this._posthogService.trackEvent("org_update", "orgUpdateEvent", { login_type: "email", email: user.email })
    return this._org.updateOrg(user.currentOrg.id, name);
  }
}
