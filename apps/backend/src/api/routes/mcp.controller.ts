import { Body, Controller, HttpException, Param, Post, Sse } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { McpService } from '@gitroom/nestjs-libraries/mcp/mcp.service';
import { OrganizationService } from '@gitroom/nestjs-libraries/database/prisma/organizations/organization.service';

@ApiTags('Mcp')
@Controller('/mcp')
export class McpController {
  constructor(
    private _mcpService: McpService,
    private _organizationService: OrganizationService
  ) {}

  @Sse('/:api/sse')
  async sse(@Param('api') api: string) {
    const apiModel = await this._organizationService.getOrgByApiKey(api);
    if (!apiModel) {
      throw new HttpException('Invalid url', 400);
    }

    return await this._mcpService.runServer(api, apiModel.id);
  }

  @Post('/:api/messages')
  async post(@Param('api') api: string, @Body() body: any) {
    const apiModel = await this._organizationService.getOrgByApiKey(api);
    if (!apiModel) {
      throw new HttpException('Invalid url', 400);
    }

    return this._mcpService.processPostBody(apiModel.id, body);
  }
}
