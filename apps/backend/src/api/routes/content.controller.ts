import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Organization, User, VocaccioRole } from '@prisma/client';
import { GetOrgFromRequest } from '@gitroom/nestjs-libraries/user/org.from.request';
import { GetUserFromRequest } from '@gitroom/nestjs-libraries/user/user.from.request';
import { ContentService } from '@gitroom/nestjs-libraries/database/prisma/crm/content.service';
import { VocaccioRoles } from '@gitroom/backend/services/auth/permissions/vocaccio-roles.decorator';
import { CreateContentItemDto, UpdateContentItemDto, AddEventDto } from '@gitroom/nestjs-libraries/dtos/crm/content.dto';

@ApiTags('Content')
@Controller('/hub/crm/projects/:projectId/content')
export class ContentController {
  constructor(private _contentService: ContentService) {}

  @Get()
  @VocaccioRoles(VocaccioRole.OWNER, VocaccioRole.OPERATOR, VocaccioRole.EDITOR, VocaccioRole.VIEWER_INTERNAL)
  listItems(
    @GetOrgFromRequest() org: Organization,
    @Param('projectId') projectId: string,
  ) {
    return this._contentService.listItems(projectId, org.id);
  }

  @Get(':id')
  @VocaccioRoles(VocaccioRole.OWNER, VocaccioRole.OPERATOR, VocaccioRole.EDITOR, VocaccioRole.VIEWER_INTERNAL)
  getItem(
    @GetOrgFromRequest() org: Organization,
    @Param('projectId') projectId: string,
    @Param('id') id: string,
  ) {
    return this._contentService.getItem(projectId, org.id, id);
  }

  @Post()
  @VocaccioRoles(VocaccioRole.OWNER, VocaccioRole.OPERATOR, VocaccioRole.EDITOR)
  createItem(
    @GetOrgFromRequest() org: Organization,
    @GetUserFromRequest() user: User,
    @Param('projectId') projectId: string,
    @Body() body: CreateContentItemDto,
  ) {
    return this._contentService.createItem(projectId, org.id, user.id, body);
  }

  @Put(':id')
  @VocaccioRoles(VocaccioRole.OWNER, VocaccioRole.OPERATOR, VocaccioRole.EDITOR)
  updateItem(
    @GetOrgFromRequest() org: Organization,
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Body() body: UpdateContentItemDto,
  ) {
    return this._contentService.updateItem(projectId, org.id, id, body);
  }

  @Delete(':id')
  @VocaccioRoles(VocaccioRole.OWNER, VocaccioRole.OPERATOR)
  deleteItem(
    @GetOrgFromRequest() org: Organization,
    @Param('projectId') projectId: string,
    @Param('id') id: string,
  ) {
    return this._contentService.deleteItem(projectId, org.id, id);
  }

  @Post(':id/comments')
  @VocaccioRoles(VocaccioRole.OWNER, VocaccioRole.OPERATOR, VocaccioRole.EDITOR, VocaccioRole.VIEWER_INTERNAL)
  addComment(
    @GetOrgFromRequest() org: Organization,
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Body() body: AddEventDto,
  ) {
    return this._contentService.addComment(projectId, org.id, id, body);
  }

  @Post('/portal-link')
  @VocaccioRoles(VocaccioRole.OWNER, VocaccioRole.OPERATOR)
  generatePortalLink(
    @GetOrgFromRequest() org: Organization,
    @GetUserFromRequest() user: User,
    @Param('projectId') projectId: string,
  ) {
    return this._contentService.generatePortalLink(projectId, org.id, user.id);
  }
}
