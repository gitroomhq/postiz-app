import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Organization } from '@prisma/client';
import { VocaccioRole } from '@prisma/client';
import { GetOrgFromRequest } from '@gitroom/nestjs-libraries/user/org.from.request';
import { CrmService } from '@gitroom/nestjs-libraries/database/prisma/crm/crm.service';
import { VocaccioRoles } from '@gitroom/backend/services/auth/permissions/vocaccio-roles.decorator';
import { CreateClientDto, UpdateClientDto, ListClientsDto } from '@gitroom/nestjs-libraries/dtos/crm/client.dto';
import { ProjectStatus } from '@prisma/client';

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
    return this._crmService.listClients(
      org.id,
      query.search,
      query.status as ProjectStatus | undefined,
      query.page
    );
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
}
