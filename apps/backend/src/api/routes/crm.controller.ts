import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Organization, User, VocaccioRole } from '@prisma/client';
import { GetOrgFromRequest } from '@gitroom/nestjs-libraries/user/org.from.request';
import { GetUserFromRequest } from '@gitroom/nestjs-libraries/user/user.from.request';
import { CrmService } from '@gitroom/nestjs-libraries/database/prisma/crm/crm.service';
import { VocaccioRoles } from '@gitroom/backend/services/auth/permissions/vocaccio-roles.decorator';
import {
  CreateClientDto,
  UpdateClientDto,
  ListClientsDto,
  CreateContactDto,
  CreateInteractionDto,
} from '@gitroom/nestjs-libraries/dtos/crm/client.dto';

@ApiTags('CRM')
@Controller('/hub/crm')
export class CrmController {
  constructor(private _crmService: CrmService) {}

  @Get('/clients')
  @VocaccioRoles(VocaccioRole.OWNER, VocaccioRole.OPERATOR, VocaccioRole.EDITOR, VocaccioRole.VIEWER_INTERNAL)
  listClients(
    @GetOrgFromRequest() org: Organization,
    @Query() query: ListClientsDto
  ) {
    return this._crmService.listClients(org.id, query.search, query.status, query.page);
  }

  @Get('/clients/:id')
  @VocaccioRoles(VocaccioRole.OWNER, VocaccioRole.OPERATOR, VocaccioRole.EDITOR, VocaccioRole.VIEWER_INTERNAL)
  getClient(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string
  ) {
    return this._crmService.getClient(org.id, id);
  }

  @Post('/clients')
  @VocaccioRoles(VocaccioRole.OWNER, VocaccioRole.OPERATOR)
  createClient(
    @GetOrgFromRequest() org: Organization,
    @Body() body: CreateClientDto
  ) {
    return this._crmService.createClient(org.id, body);
  }

  @Put('/clients/:id')
  @VocaccioRoles(VocaccioRole.OWNER, VocaccioRole.OPERATOR)
  updateClient(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string,
    @Body() body: UpdateClientDto
  ) {
    return this._crmService.updateClient(org.id, id, body);
  }

  @Delete('/clients/:id')
  @VocaccioRoles(VocaccioRole.OWNER)
  deleteClient(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string
  ) {
    return this._crmService.deleteClient(org.id, id);
  }

  @Post('/clients/:id/contacts')
  @VocaccioRoles(VocaccioRole.OWNER, VocaccioRole.OPERATOR, VocaccioRole.EDITOR)
  createContact(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string,
    @Body() body: CreateContactDto
  ) {
    return this._crmService.createContact(org.id, id, body);
  }

  @Post('/clients/:id/interactions')
  @VocaccioRoles(VocaccioRole.OWNER, VocaccioRole.OPERATOR, VocaccioRole.EDITOR)
  createInteraction(
    @GetOrgFromRequest() org: Organization,
    @GetUserFromRequest() user: User,
    @Param('id') id: string,
    @Body() body: CreateInteractionDto
  ) {
    return this._crmService.createInteraction(org.id, id, user.id, body);
  }
}
