import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Organization, User, VocaccioRole } from '@prisma/client';
import { GetOrgFromRequest } from '@gitroom/nestjs-libraries/user/org.from.request';
import { GetUserFromRequest } from '@gitroom/nestjs-libraries/user/user.from.request';
import { ServiceRequestService } from '@gitroom/nestjs-libraries/database/prisma/atelie/service-request.service';
import { VocaccioRoles } from '@gitroom/backend/services/auth/permissions/vocaccio-roles.decorator';
import {
  CreateServiceRequestDto,
  UpdateServiceRequestStatusDto,
  AddServiceRequestEventDto,
} from '@gitroom/nestjs-libraries/dtos/atelie/service-request.dto';

/**
 * Ateliê Virtual — AT-2. Cockpit interno (/atelie/fila no front-end), restrito a
 * OWNER/OPERATOR: quem opera o back-office (Felipe/Nicolas/agência), não o cliente final.
 * Ver docs/atelie/plano-atelie-virtual.md.
 */
@ApiTags('Atelie')
@Controller('/hub/atelie')
export class AtelieController {
  constructor(private _serviceRequestService: ServiceRequestService) {}

  @Get('/offerings')
  @VocaccioRoles(VocaccioRole.OWNER, VocaccioRole.OPERATOR)
  listOfferings() {
    return this._serviceRequestService.listOfferings();
  }

  @Get('/fila')
  @VocaccioRoles(VocaccioRole.OWNER, VocaccioRole.OPERATOR)
  listQueue(@GetOrgFromRequest() org: Organization) {
    return this._serviceRequestService.listQueue(org.id);
  }

  @Get('/fila/:id')
  @VocaccioRoles(VocaccioRole.OWNER, VocaccioRole.OPERATOR)
  getRequest(@GetOrgFromRequest() org: Organization, @Param('id') id: string) {
    return this._serviceRequestService.getRequest(org.id, id);
  }

  @Post('/projects/:projectId/requests')
  @VocaccioRoles(VocaccioRole.OWNER, VocaccioRole.OPERATOR)
  createRequest(
    @GetOrgFromRequest() org: Organization,
    @GetUserFromRequest() user: User,
    @Param('projectId') projectId: string,
    @Body() body: CreateServiceRequestDto,
  ) {
    return this._serviceRequestService.createRequest(org.id, user.id, projectId, body);
  }

  @Patch('/fila/:id/status')
  @VocaccioRoles(VocaccioRole.OWNER, VocaccioRole.OPERATOR)
  updateStatus(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string,
    @Body() body: UpdateServiceRequestStatusDto,
  ) {
    return this._serviceRequestService.updateStatus(org.id, id, body.status);
  }

  @Post('/fila/:id/events')
  @VocaccioRoles(VocaccioRole.OWNER, VocaccioRole.OPERATOR)
  addEvent(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string,
    @Body() body: AddServiceRequestEventDto,
  ) {
    return this._serviceRequestService.addEvent(org.id, id, body);
  }
}
