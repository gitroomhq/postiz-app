import { Controller, Put, Body } from '@nestjs/common';
import { UserFromRequest } from '@clickvote/interfaces';
import { GetUserFromRequest } from '@clickvote/backend/src/helpers/user.from.request';
import {OrgService} from "@clickvote/backend/src/packages/org/org.service";

@Controller('/org')
export class OrgController {
  constructor(private _org: OrgService) {}

  @Put('/update')
  async getSelf(@GetUserFromRequest() user: UserFromRequest,
    @Body('name') name: string) {
    return this._org.updateOrg(user.currentOrg.id, name);
  }
}
