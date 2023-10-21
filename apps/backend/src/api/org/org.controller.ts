import { Controller, Put, Body, Post, Param, Delete, Res, HttpStatus, Get } from '@nestjs/common';
import { Response } from 'express';
import { UserFromRequest } from '@clickvote/interfaces';
import { GetUserFromRequest } from '@clickvote/backend/src/helpers/user.from.request';
import { OrgService } from "@clickvote/backend/src/packages/org/org.service";

@Controller('/org')
export class OrgController {
  constructor(private _org: OrgService) {}

  @Put('/update')
  async updateOrg(@GetUserFromRequest() user: UserFromRequest,
    @Body('name') name: string) {
    return this._org.updateOrg(user.currentOrg.id, name);
  }

  @Get('/invites/user')
  async getOrgInvite(
    @GetUserFromRequest() user: UserFromRequest,
  ) {
    const invite = await this._org.getPendingOrgInvite(user.email);
    return {
      invite
    }
  }

  @Get('/invites')
  async getOrgInvites(
    @GetUserFromRequest() user: UserFromRequest,
  ) {
    const invites = await this._org.getOrgInvites(user.currentOrg.id);
    return {
      invites
    }
  }

  @Post('/invites/create')
  async createOrgInvite(
    @GetUserFromRequest() user: UserFromRequest,
    @Body('email') email: string
  ) {
    return this._org.createOrgInvite(user.currentOrg.id, email);
  }

  @Delete('/invites/decline/:id')
  async declineOrgInvite(
    @GetUserFromRequest() user: UserFromRequest,
    @Param('id') id: string,
    @Res() res: Response
  ) {
    await this._org.declineOrgInvite(id, user.email);
    res.status(HttpStatus.NO_CONTENT).json({});
  }

  @Put('/invites/accept/:id')
  async acceptOrgInvite(
    @GetUserFromRequest() user: UserFromRequest,
    @Param('id') id: string,
    @Res() res: Response
  ) {
    await this._org.acceptOrgInvite(id, user.id, user.email);
    res.status(HttpStatus.NO_CONTENT).json({});
  }
}
