import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  Param,
  Post,
  Put,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { GetOrgFromRequest } from '@gitroom/nestjs-libraries/user/org.from.request';
import { Organization } from '@prisma/client';
import { IntegrationService } from '@gitroom/nestjs-libraries/database/prisma/integrations/integration.service';
import { CheckPolicies } from '@gitroom/backend/services/auth/permissions/permissions.ability';
import { PostsService } from '@gitroom/nestjs-libraries/database/prisma/posts/posts.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadFactory } from '@gitroom/nestjs-libraries/upload/upload.factory';
import { MediaService } from '@gitroom/nestjs-libraries/database/prisma/media/media.service';
import { GetPostsDto } from '@gitroom/nestjs-libraries/dtos/posts/get.posts.dto';
import {
  AuthorizationActions,
  Sections,
} from '@gitroom/backend/services/auth/permissions/permission.exception.class';
import { VideoDto } from '@gitroom/nestjs-libraries/dtos/videos/video.dto';
import { VideoFunctionDto } from '@gitroom/nestjs-libraries/dtos/videos/video.function.dto';
import { UploadDto } from '@gitroom/nestjs-libraries/dtos/media/upload.dto';
import { NotificationService } from '@gitroom/nestjs-libraries/database/prisma/notifications/notification.service';
import { GetNotificationsDto } from '@gitroom/nestjs-libraries/dtos/notifications/get.notifications.dto';
import axios from 'axios';
import { Readable } from 'stream';
import { lookup, extension } from 'mime-types';
import * as Sentry from '@sentry/nestjs';
import { socialIntegrationList, IntegrationManager } from '@gitroom/nestjs-libraries/integrations/integration.manager';
import { getValidationSchemas } from '@gitroom/nestjs-libraries/chat/validation.schemas.helper';
import { RefreshIntegrationService } from '@gitroom/nestjs-libraries/integrations/refresh.integration.service';
import { RefreshToken } from '@gitroom/nestjs-libraries/integrations/social.abstract';
import { timer } from '@gitroom/helpers/utils/timer';
import { ioRedis } from '@gitroom/nestjs-libraries/redis/redis.service';

@ApiTags('Public API')
@Controller('/public/v1')
export class PublicIntegrationsController {
  private storage = UploadFactory.createStorage();

  constructor(
    private _integrationService: IntegrationService,
    private _postsService: PostsService,
    private _mediaService: MediaService,
    private _notificationService: NotificationService,
    private _integrationManager: IntegrationManager,
    private _refreshIntegrationService: RefreshIntegrationService
  ) {}

  @Post('/upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadSimple(
    @GetOrgFromRequest() org: Organization,
    @UploadedFile('file') file: Express.Multer.File
  ) {
    Sentry.metrics.count('public_api-request', 1);
    if (!file) {
      throw new HttpException({ msg: 'No file provided' }, 400);
    }

    const getFile = await this.storage.uploadFile(file);
    return this._mediaService.saveFile(
      org.id,
      getFile.originalname,
      getFile.path
    );
  }

  @Post('/upload-from-url')
  async uploadsFromUrl(
    @GetOrgFromRequest() org: Organization,
    @Body() body: UploadDto
  ) {
    Sentry.metrics.count('public_api-request', 1);
    const response = await axios.get(body.url, {
      responseType: 'arraybuffer',
    });

    const buffer = Buffer.from(response.data);
    const responseMime = response.headers?.['content-type']?.split(';')[0]?.trim();
    const urlMime = lookup(body?.url?.split?.('?')?.[0]);
    const mimetype = (urlMime || responseMime || 'image/jpeg') as string;
    const ext = extension(mimetype) || 'jpg';

    const getFile = await this.storage.uploadFile({
      buffer,
      mimetype,
      size: buffer.length,
      path: '',
      fieldname: '',
      destination: '',
      stream: new Readable(),
      filename: '',
      originalname: `upload.${ext}`,
      encoding: '',
    });

    return this._mediaService.saveFile(
      org.id,
      getFile.originalname,
      getFile.path
    );
  }

  @Get('/find-slot/:id')
  async findSlotIntegration(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id?: string
  ) {
    Sentry.metrics.count('public_api-request', 1);
    return { date: await this._postsService.findFreeDateTime(org.id, id) };
  }

  @Get('/posts')
  async getPosts(
    @GetOrgFromRequest() org: Organization,
    @Query() query: GetPostsDto
  ) {
    Sentry.metrics.count('public_api-request', 1);
    const posts = await this._postsService.getPosts(org.id, query);
    return {
      posts,
      // comments,
    };
  }

  @Post('/posts')
  @CheckPolicies([AuthorizationActions.Create, Sections.POSTS_PER_MONTH])
  async createPost(
    @GetOrgFromRequest() org: Organization,
    @Body() rawBody: any
  ) {
    Sentry.metrics.count('public_api-request', 1);
    const body = await this._postsService.mapTypeToPost(
      rawBody,
      org.id,
      rawBody.type === 'draft'
    );
    body.type = rawBody.type;

    console.log(JSON.stringify(body, null, 2));
    return this._postsService.createPost(org.id, body);
  }

  @Delete('/posts/:id')
  async deletePost(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string
  ) {
    Sentry.metrics.count('public_api-request', 1);
    const getPostById = await this._postsService.getPost(org.id, id);
    return this._postsService.deletePost(org.id, getPostById.group);
  }

  @Delete('/posts/group/:group')
  deletePostByGroup(
    @GetOrgFromRequest() org: Organization,
    @Param('group') group: string
  ) {
    Sentry.metrics.count('public_api-request', 1);
    return this._postsService.deletePost(org.id, group);
  }

  @Get('/is-connected')
  async getActiveIntegrations(@GetOrgFromRequest() org: Organization) {
    Sentry.metrics.count('public_api-request', 1);
    return { connected: true };
  }

  @Get('/integrations')
  async listIntegration(@GetOrgFromRequest() org: Organization) {
    Sentry.metrics.count('public_api-request', 1);
    return (await this._integrationService.getIntegrationsList(org.id)).map(
      (org) => ({
        id: org.id,
        name: org.name,
        identifier: org.providerIdentifier,
        picture: org.picture,
        disabled: org.disabled,
        profile: org.profile,
        customer: org.customer
          ? {
              id: org.customer.id,
              name: org.customer.name,
            }
          : undefined,
      })
    );
  }

  @Get('/social/:integration')
  @CheckPolicies([AuthorizationActions.Create, Sections.CHANNEL])
  async getIntegrationUrl(
    @Param('integration') integration: string,
    @Query('refresh') refresh: string,
    @GetOrgFromRequest() org: Organization
  ) {
    Sentry.metrics.count('public_api-request', 1);
    if (
      !this._integrationManager
        .getAllowedSocialsIntegrations()
        .includes(integration)
    ) {
      throw new HttpException({ msg: 'Integration not allowed' }, 400);
    }

    const integrationProvider =
      this._integrationManager.getSocialIntegration(integration);

    if (integrationProvider.externalUrl) {
      throw new HttpException(
        { msg: 'This integration requires an external URL and is not supported via the public API' },
        400
      );
    }

    try {
      const { codeVerifier, state, url } =
        await integrationProvider.generateAuthUrl();

      if (refresh) {
        await ioRedis.set(`refresh:${state}`, refresh, 'EX', 3600);
      }

      await ioRedis.set(`organization:${state}`, org.id, 'EX', 3600);
      await ioRedis.set(`login:${state}`, codeVerifier, 'EX', 3600);

      return { url };
    } catch (err) {
      throw new HttpException({ msg: 'Failed to generate auth URL' }, 500);
    }
  }

  @Get('/notifications')
  async getNotifications(
    @GetOrgFromRequest() org: Organization,
    @Query() query: GetNotificationsDto
  ) {
    Sentry.metrics.count('public_api-request', 1);
    return this._notificationService.getNotificationsPaginated(
      org.id,
      query.page ?? 0
    );
  }

  @Post('/generate-video')
  generateVideo(
    @GetOrgFromRequest() org: Organization,
    @Body() body: VideoDto
  ) {
    Sentry.metrics.count('public_api-request', 1);
    return this._mediaService.generateVideo(org, body);
  }

  @Post('/video/function')
  videoFunction(@Body() body: VideoFunctionDto) {
    Sentry.metrics.count('public_api-request', 1);
    return this._mediaService.videoFunction(
      body.identifier,
      body.functionName,
      body.params
    );
  }

  @Delete('/integrations/:id')
  async deleteChannel(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string
  ) {
    Sentry.metrics.count('public_api-request', 1);
    const isTherePosts = await this._integrationService.getPostsForChannel(
      org.id,
      id
    );
    if (isTherePosts.length) {
      for (const post of isTherePosts) {
        this._postsService.deletePost(org.id, post.group).catch(() => {});
      }
    }

    return this._integrationService.deleteChannel(org.id, id);
  }

  @Get('/integration-settings/:id')
  async getIntegrationSettings(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string
  ) {
    Sentry.metrics.count('public_api-request', 1);
    const loadIntegration = await this._integrationService.getIntegrationById(
      org.id,
      id
    );

    const verified =
      JSON.parse(loadIntegration.additionalSettings || '[]')?.find(
        (p: any) => p?.title === 'Verified'
      )?.value || false;

    const integration = socialIntegrationList.find(
      (p) => p.identifier === loadIntegration.providerIdentifier
    )!;

    if (!integration) {
      return {
        output: { rules: '', maxLength: 0, settings: {}, tools: [] as any[] },
      };
    }

    const maxLength = integration.maxLength(verified);
    const schemas = !integration.dto
      ? false
      : getValidationSchemas()[integration.dto.name];
    const tools = this._integrationManager.getAllTools();
    const rules = this._integrationManager.getAllRulesDescription();

    return {
      output: {
        rules: rules[integration.identifier],
        maxLength,
        settings: !schemas ? 'No additional settings required' : schemas,
        tools: tools[integration.identifier],
      },
    };
  }

  @Get('/posts/:id/missing')
  async getMissingContent(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string
  ) {
    Sentry.metrics.count('public_api-request', 1);
    return this._postsService.getMissingContent(org.id, id);
  }

  @Put('/posts/:id/release-id')
  async updateReleaseId(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string,
    @Body('releaseId') releaseId: string
  ) {
    Sentry.metrics.count('public_api-request', 1);
    return this._postsService.updateReleaseId(org.id, id, releaseId);
  }

  @Get('/analytics/:integration')
  async getAnalytics(
    @GetOrgFromRequest() org: Organization,
    @Param('integration') integration: string,
    @Query('date') date: string
  ) {
    Sentry.metrics.count('public_api-request', 1);
    return this._integrationService.checkAnalytics(org, integration, date);
  }

  @Get('/analytics/post/:postId')
  async getPostAnalytics(
    @GetOrgFromRequest() org: Organization,
    @Param('postId') postId: string,
    @Query('date') date: string
  ) {
    Sentry.metrics.count('public_api-request', 1);
    return this._postsService.checkPostAnalytics(org.id, postId, +date);
  }

  @Post('/integration-trigger/:id')
  async triggerIntegrationTool(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string,
    @Body() body: { methodName: string; data: Record<string, string> }
  ) {
    Sentry.metrics.count('public_api-request', 1);
    const getIntegration = await this._integrationService.getIntegrationById(
      org.id,
      id
    );

    if (!getIntegration) {
      throw new HttpException({ msg: 'Integration not found' }, 404);
    }

    const integrationProvider = socialIntegrationList.find(
      (p) => p.identifier === getIntegration.providerIdentifier
    )!;

    if (!integrationProvider) {
      throw new HttpException({ msg: 'Integration provider not found' }, 404);
    }

    const tools = this._integrationManager.getAllTools();
    if (
      // @ts-ignore
      !tools[integrationProvider.identifier]?.some(
        (p: any) => p.methodName === body.methodName
      ) ||
      // @ts-ignore
      !integrationProvider[body.methodName]
    ) {
      throw new HttpException({ msg: 'Tool not found' }, 404);
    }

    while (true) {
      try {
        // @ts-ignore
        const result = await integrationProvider[body.methodName](
          getIntegration.token,
          body.data || {},
          getIntegration.internalId,
          getIntegration
        );

        return { output: result };
      } catch (err) {
        if (err instanceof RefreshToken) {
          const data = await this._refreshIntegrationService.refresh(
            getIntegration
          );

          if (!data) {
            await this._integrationService.disconnectChannel(
              org.id,
              getIntegration
            );
            throw new HttpException(
              { msg: 'Channel disconnected due to expired token' },
              401
            );
          }

          const { accessToken } = data;
          if (accessToken) {
            getIntegration.token = accessToken;

            if (integrationProvider.refreshWait) {
              await timer(10000);
            }

            continue;
          }
        }
        throw new HttpException({ msg: 'Unexpected error' }, 500);
      }
    }
  }

  // ===== Ghost-specific post management endpoints =====

  @Put('/posts/:id/date')
  async updatePostDate(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string,
    @Body() body: { date: string; action?: 'schedule' | 'update' }
  ) {
    Sentry.metrics.count('public_api-request', 1);
    const action = body.action || 'schedule';

    // Validate date format
    const newDate = new Date(body.date);
    if (isNaN(newDate.getTime())) {
      throw new HttpException({ msg: 'Invalid date format. Use ISO 8601.' }, 400);
    }

    // Update the publish date - PostsService.changeDate handles:
    // - schedule: sets state to QUEUE (or DRAFT if it was draft), resets releaseId/releaseURL
    // - update: just changes the date
    const result = await this._postsService.changeDate(
      org.id,
      id,
      body.date,
      action
    );

    return { success: true, postId: id, publishDate: result.publishDate };
  }

  @Get('/integration/:id/post/:postId/status')
  async getPostStatus(
    @GetOrgFromRequest() org: Organization,
    @Param('id') integrationId: string,
    @Param('postId') providerPostId: string
  ) {
    Sentry.metrics.count('public_api-request', 1);
    const getIntegration = await this._integrationService.getIntegrationById(
      org.id,
      integrationId
    );

    if (!getIntegration) {
      throw new HttpException({ msg: 'Integration not found' }, 404);
    }

    const provider = this._integrationManager.getSocialIntegration(
      getIntegration.providerIdentifier
    );

    if (!provider) {
      throw new HttpException({ msg: 'Integration provider not found' }, 404);
    }

    // Check if provider supports getStatus
    // @ts-ignore
    if (typeof provider.getStatus !== 'function') {
      throw new HttpException(
        { msg: 'This integration does not support status queries' },
        400
      );
    }

    try {
      // @ts-ignore
      const status = await provider.getStatus(
        getIntegration.token,
        providerPostId,
        getIntegration.internalId,
        getIntegration
      );
      return { status };
    } catch (err: any) {
      if (err instanceof RefreshToken) {
        const data = await this._refreshIntegrationService.refresh(
          getIntegration
        );
        if (!data) {
          throw new HttpException(
            { msg: 'Failed to refresh token' },
            401
          );
        }
        // Retry with refreshed token
        // @ts-ignore
        const status = await provider.getStatus(
          data.accessToken,
          providerPostId,
          getIntegration.internalId,
          getIntegration
        );
        return { status };
      }
      throw new HttpException(
        { msg: err.message || 'Failed to get post status' },
        500
      );
    }
  }

  @Put('/integration/:id/post/:postId/status')
  async changePostStatus(
    @GetOrgFromRequest() org: Organization,
    @Param('id') integrationId: string,
    @Param('postId') providerPostId: string,
    @Body() body: { status: 'draft' | 'published' | 'scheduled'; publishedAt?: string }
  ) {
    Sentry.metrics.count('public_api-request', 1);
    const getIntegration = await this._integrationService.getIntegrationById(
      org.id,
      integrationId
    );

    if (!getIntegration) {
      throw new HttpException({ msg: 'Integration not found' }, 404);
    }

    const provider = this._integrationManager.getSocialIntegration(
      getIntegration.providerIdentifier
    );

    if (!provider) {
      throw new HttpException({ msg: 'Integration provider not found' }, 404);
    }

    // Check if provider supports changeStatus
    // @ts-ignore
    if (typeof provider.changeStatus !== 'function') {
      throw new HttpException(
        { msg: 'This integration does not support status changes' },
        400
      );
    }

    const validStatuses = ['draft', 'published', 'scheduled'];
    if (!validStatuses.includes(body.status)) {
      throw new HttpException(
        { msg: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        400
      );
    }

    try {
      // @ts-ignore
      const result = await provider.changeStatus(
        getIntegration.token,
        providerPostId,
        body.status,
        body.publishedAt,
        getIntegration.internalId,
        getIntegration
      );
      return { success: true, result };
    } catch (err: any) {
      if (err instanceof RefreshToken) {
        const data = await this._refreshIntegrationService.refresh(
          getIntegration
        );
        if (!data) {
          throw new HttpException(
            { msg: 'Failed to refresh token' },
            401
          );
        }
        // @ts-ignore
        const result = await provider.changeStatus(
          data.accessToken,
          providerPostId,
          body.status,
          body.publishedAt,
          getIntegration.internalId,
          getIntegration
        );
        return { success: true, result };
      }
      throw new HttpException(
        { msg: err.message || 'Failed to change post status' },
        500
      );
    }
  }

  @Delete('/integration/:id/post/:postId')
  async deleteProviderPost(
    @GetOrgFromRequest() org: Organization,
    @Param('id') integrationId: string,
    @Param('postId') providerPostId: string
  ) {
    Sentry.metrics.count('public_api-request', 1);
    const getIntegration = await this._integrationService.getIntegrationById(
      org.id,
      integrationId
    );

    if (!getIntegration) {
      throw new HttpException({ msg: 'Integration not found' }, 404);
    }

    const provider = this._integrationManager.getSocialIntegration(
      getIntegration.providerIdentifier
    );

    if (!provider) {
      throw new HttpException({ msg: 'Integration provider not found' }, 404);
    }

    // Check if provider supports delete
    // @ts-ignore
    if (typeof provider.delete !== 'function') {
      throw new HttpException(
        { msg: 'This integration does not support post deletion' },
        400
      );
    }

    try {
      // @ts-ignore
      await provider.delete(
        getIntegration.token,
        providerPostId,
        getIntegration.internalId,
        getIntegration
      );
      return { success: true };
    } catch (err: any) {
      if (err instanceof RefreshToken) {
        const data = await this._refreshIntegrationService.refresh(
          getIntegration
        );
        if (!data) {
          throw new HttpException(
            { msg: 'Failed to refresh token' },
            401
          );
        }
        // @ts-ignore
        await provider.delete(
          data.accessToken,
          providerPostId,
          getIntegration.internalId,
          getIntegration
        );
        return { success: true };
      }
      throw new HttpException(
        { msg: err.message || 'Failed to delete post' },
        500
      );
    }
  }
}
