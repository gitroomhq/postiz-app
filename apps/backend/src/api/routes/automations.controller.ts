import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { GetOrgFromRequest } from '@gitroom/nestjs-libraries/user/org.from.request';
import { Organization } from '@prisma/client';
import { ApiTags } from '@nestjs/swagger';
import { AutomationService } from '@gitroom/nestjs-libraries/database/prisma/automations/automation.service';
import { AutomationDto } from '@gitroom/nestjs-libraries/dtos/automations/automation.dto';
import { IntegrationManager } from '@gitroom/nestjs-libraries/integrations/integration.manager';

@ApiTags('Automations')
@Controller('/automations')
export class AutomationsController {
  constructor(
    private _automationService: AutomationService,
    private _integrationManager: IntegrationManager
  ) {}

  @Get('/list')
  async getWebhooksList() {
    return { webhooks: this._integrationManager.getAllWebhooks() };
  }

  @Get('/')
  async getAutomations(
    @GetOrgFromRequest() org: Organization,
    @Query('platform') platform?: string
  ) {
    return this._automationService.getAutomations(org.id, platform);
  }

  @Post('/')
  async createAutomation(
    @GetOrgFromRequest() org: Organization,
    @Body() body: AutomationDto
  ) {
    return this._automationService.createOrUpdateAutomation(org.id, body);
  }

  @Put('/:id')
  async updateAutomation(
    @Param('id') id: string,
    @GetOrgFromRequest() org: Organization,
    @Body() body: AutomationDto
  ) {
    return this._automationService.createOrUpdateAutomation(org.id, body, id);
  }

  @Put('/:id/activate')
  async changeAutomationActivation(
    @Param('id') id: string,
    @GetOrgFromRequest() org: Organization,
    @Body('status') status: boolean
  ) {
    return this._automationService.changeAutomationActivation(
      org.id,
      id,
      status
    );
  }

  @Delete('/:id')
  async deleteAutomation(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string
  ) {
    return this._automationService.deleteAutomation(org.id, id);
  }
}
