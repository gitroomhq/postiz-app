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
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { PostsService } from './posts.service';

@Controller('posts')
@UseGuards(JwtAuthGuard)
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Get()
  async list(
    @CurrentUser() user: AuthUser,
    @Query('state') state?: string,
    @Query('campaignId') campaignId?: string,
    @Query('integrationId') integrationId?: string,
    @Query('start') start?: string,
    @Query('end') end?: string,
  ) {
    return this.postsService.list(user.organizationId, {
      state,
      campaignId,
      integrationId,
      start: start ? new Date(start) : undefined,
      end: end ? new Date(end) : undefined,
    });
  }

  @Post()
  async create(
    @CurrentUser() user: AuthUser,
    @Body()
    body: {
      integrationIds: string[];
      content: string;
      mediaIds?: string[];
      publishDate?: string;
      templateId?: string;
      platformSettings?: Record<string, any>;
      campaignId?: string;
    },
  ) {
    return this.postsService.create(user.organizationId, body);
  }

  @Get(':id')
  async detail(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.postsService.detail(user.organizationId, id);
  }

  @Put(':id')
  async update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body()
    body: {
      content?: string;
      mediaIds?: string[];
      publishDate?: string;
      platformSettings?: Record<string, any>;
    },
  ) {
    return this.postsService.update(user.organizationId, id, body);
  }

  @Delete(':id')
  async remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.postsService.remove(user.organizationId, id);
  }

  @Post(':id/approve')
  @HttpCode(200)
  async approve(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { action: 'APPROVED' | 'REJECTED' | 'REGENERATE'; feedback?: string },
  ) {
    return this.postsService.approve(user, id, body.action, body.feedback);
  }

  @Post('bulk-approve')
  @HttpCode(200)
  async bulkApprove(
    @CurrentUser() user: AuthUser,
    @Body() body: { postIds: string[]; action: 'APPROVED' | 'REJECTED' | 'REGENERATE' },
  ) {
    return this.postsService.bulkApprove(user, body.postIds, body.action);
  }

  @Post(':id/regenerate')
  @HttpCode(200)
  async regenerate(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { feedback?: string },
  ) {
    return this.postsService.regenerate(user.organizationId, id, body.feedback);
  }

  @Get(':id/versions')
  async versions(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.postsService.getVersions(user.organizationId, id);
  }

  @Put(':id/reschedule')
  async reschedule(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { publishDate: string },
  ) {
    return this.postsService.reschedule(user.organizationId, id, body.publishDate);
  }
}
