import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Organization, VocaccioRole } from '@prisma/client';
import { GetOrgFromRequest } from '@gitroom/nestjs-libraries/user/org.from.request';
import { ProjectService } from '@gitroom/nestjs-libraries/database/prisma/crm/project.service';
import { VocaccioRoles } from '@gitroom/backend/services/auth/permissions/vocaccio-roles.decorator';
import { CreateProjectDto, UpdateProjectDto, ListProjectsDto } from '@gitroom/nestjs-libraries/dtos/crm/project.dto';

@ApiTags('Projects')
@Controller('/hub/crm/projects')
export class ProjectController {
  constructor(private _projectService: ProjectService) {}

  @Get()
  @VocaccioRoles(VocaccioRole.OWNER, VocaccioRole.OPERATOR, VocaccioRole.EDITOR, VocaccioRole.VIEWER_INTERNAL)
  listProjects(@GetOrgFromRequest() org: Organization, @Query() q: ListProjectsDto) {
    return this._projectService.listProjects(org.id, q.clientId, q.status, q.page);
  }

  @Get(':id')
  @VocaccioRoles(VocaccioRole.OWNER, VocaccioRole.OPERATOR, VocaccioRole.EDITOR, VocaccioRole.VIEWER_INTERNAL)
  getProject(@GetOrgFromRequest() org: Organization, @Param('id') id: string) {
    return this._projectService.getProject(org.id, id);
  }

  @Post()
  @VocaccioRoles(VocaccioRole.OWNER, VocaccioRole.OPERATOR)
  createProject(@Body() body: CreateProjectDto) {
    return this._projectService.createProject(body);
  }

  @Put(':id')
  @VocaccioRoles(VocaccioRole.OWNER, VocaccioRole.OPERATOR, VocaccioRole.EDITOR)
  updateProject(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string,
    @Body() body: UpdateProjectDto,
  ) {
    return this._projectService.updateProject(org.id, id, body);
  }

  @Delete(':id')
  @VocaccioRoles(VocaccioRole.OWNER)
  deleteProject(@GetOrgFromRequest() org: Organization, @Param('id') id: string) {
    return this._projectService.deleteProject(org.id, id);
  }
}
