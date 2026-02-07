import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
  HttpCode,
  Sse,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { CampaignsService } from './campaigns.service';

@Controller('campaigns')
@UseGuards(JwtAuthGuard)
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  @Get()
  async list(@CurrentUser() user: AuthUser) {
    return this.campaignsService.list(user.organizationId);
  }

  @Post()
  async create(
    @CurrentUser() user: AuthUser,
    @Body()
    body: {
      name: string;
      description?: string;
      mode: 'FULLY_AUTOMATED' | 'SEMI_AUTOMATED' | 'MANUAL';
      templateId?: string;
      startDate: string;
      endDate: string;
      postsPerWeek?: number;
      preferredTimes?: number[];
      integrationIds: string[];
    },
  ) {
    return this.campaignsService.create(user, body);
  }

  @Get(':id')
  async detail(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.campaignsService.detail(user.organizationId, id);
  }

  @Put(':id')
  async update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      description?: string;
      status?: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'COMPLETED';
      templateId?: string;
      startDate?: string;
      endDate?: string;
      postsPerWeek?: number;
      preferredTimes?: number[];
    },
  ) {
    return this.campaignsService.update(user.organizationId, id, body);
  }

  @Delete(':id')
  async remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.campaignsService.remove(user.organizationId, id);
  }

  @Post(':id/generate-plan')
  @Sse()
  generatePlan(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Observable<MessageEvent> {
    return this.campaignsService.generatePlan(user.organizationId, id);
  }

  @Post(':id/upload-assets')
  @HttpCode(200)
  async uploadAssets(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { mediaIds?: string[]; urls?: string[] },
  ) {
    return this.campaignsService.uploadAssets(user.organizationId, id, body);
  }

  @Post(':id/process-assets')
  @HttpCode(200)
  async processAssets(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    return this.campaignsService.processAssets(user.organizationId, id);
  }
}
