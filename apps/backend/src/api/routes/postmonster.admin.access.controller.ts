import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { User } from '@prisma/client';
import { GetUserFromRequest } from '@gitroom/nestjs-libraries/user/user.from.request';
import { SuperAdminUserGuard } from '@gitroom/backend/services/auth/super.admin.user.guard';
import { CreateAccessInviteDto } from '@gitroom/nestjs-libraries/dtos/access/create.access.invite.dto';
import { AccessService } from '@gitroom/nestjs-libraries/database/prisma/postmonster-access/access.service';

@ApiTags('Admin Access')
@Controller('/admin')
@UseGuards(SuperAdminUserGuard)
export class AdminAccessController {
  constructor(private _accessService: AccessService) {}

  @Get('/access-requests')
  listRequests(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('email') email?: string
  ) {
    return this._accessService.listRequests({
      page: page ? parseInt(page, 10) : 0,
      limit: limit ? parseInt(limit, 10) : 20,
      status:
        status === 'PENDING' || status === 'APPROVED' || status === 'REJECTED'
          ? status
          : undefined,
      email: email || undefined,
    });
  }

  @Post('/access-requests/:id/approve')
  approve(
    @GetUserFromRequest() user: User,
    @Param('id') id: string
  ) {
    return this._accessService.approveRequest(id, user.id);
  }

  @Post('/access-requests/:id/reject')
  reject(
    @GetUserFromRequest() user: User,
    @Param('id') id: string,
    @Body('sendEmail') sendEmail?: boolean
  ) {
    return this._accessService.rejectRequest(id, user.id, sendEmail !== false);
  }

  @Get('/access-invites')
  listInvites() {
    return this._accessService.listInvites();
  }

  @Post('/access-invites')
  createInvite(
    @GetUserFromRequest() user: User,
    @Body() body: CreateAccessInviteDto
  ) {
    return this._accessService.createInviteManually(body.email, user.id);
  }

  @Post('/access-invites/:id/resend')
  resend(@Param('id') id: string) {
    return this._accessService.resendInvite(id);
  }

  @Post('/access-invites/:id/revoke')
  revoke(@Param('id') id: string) {
    return this._accessService.revokeInvite(id);
  }

  @Get('/users')
  listUsers(
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    return this._accessService.listUsers(
      page ? parseInt(page, 10) : 0,
      limit ? parseInt(limit, 10) : 20
    );
  }
}
