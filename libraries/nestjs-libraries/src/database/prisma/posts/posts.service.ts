import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ValidationPipe,
} from '@nestjs/common';
import { PostsRepository } from '@gitroom/nestjs-libraries/database/prisma/posts/posts.repository';
import { CreatePostDto } from '@gitroom/nestjs-libraries/dtos/posts/create.post.dto';
import dayjs from 'dayjs';
import { IntegrationManager } from '@gitroom/nestjs-libraries/integrations/integration.manager';
import {
  Integration,
  Post,
  Media,
  From,
  CreationMethod,
  State,
} from '@gitroom/nestjs-libraries/database/prisma/generated/client';
import { GetPostsDto } from '@gitroom/nestjs-libraries/dtos/posts/get.posts.dto';
import { GetPostsListDto } from '@gitroom/nestjs-libraries/dtos/posts/get.posts.list.dto';
import { shuffle } from 'lodash';
import { CreateGeneratedPostsDto } from '@gitroom/nestjs-libraries/dtos/generator/create.generated.posts.dto';
import { IntegrationService } from '@gitroom/nestjs-libraries/database/prisma/integrations/integration.service';
import { makeId } from '@gitroom/nestjs-libraries/services/make.is';
import utc from 'dayjs/plugin/utc';
import { MediaService } from '@gitroom/nestjs-libraries/database/prisma/media/media.service';
import { ShortLinkService } from '@gitroom/nestjs-libraries/short-linking/short.link.service';
import { CreateTagDto } from '@gitroom/nestjs-libraries/dtos/posts/create.tag.dto';
import {
  minifyPostsList,
  minifyPosts,
} from '@gitroom/helpers/utils/posts.list.minify';
import { readOrFetch } from '@gitroom/nestjs-libraries/integrations/read.or.fetch';
import sharp from 'sharp';
import { UploadFactory } from '@gitroom/nestjs-libraries/upload/upload.factory';
import { Readable } from 'stream';
import { OpenaiService } from '@gitroom/nestjs-libraries/openai/openai.service';
dayjs.extend(utc);
import * as Sentry from '@sentry/nestjs';
import { TemporalService } from 'nestjs-temporal-core';
import { TypedSearchAttributes } from '@temporalio/common';
import {
  organizationId,
  postId as postIdSearchParam,
} from '@gitroom/nestjs-libraries/temporal/temporal.search.attribute';
import { AnalyticsData } from '@gitroom/nestjs-libraries/integrations/social/social.integrations.interface';
import { timer } from '@gitroom/helpers/utils/timer';
import { ioRedis } from '@gitroom/nestjs-libraries/redis/redis.service';
import { RefreshToken } from '@gitroom/nestjs-libraries/integrations/social.abstract';
import { RefreshIntegrationService } from '@gitroom/nestjs-libraries/integrations/refresh.integration.service';
import { hasExtension } from '@gitroom/helpers/utils/has.extension';
import {
  daysSpanning,
  quarterHourMinutesOnDay,
  soonWindow,
} from '@gitroom/nestjs-libraries/database/prisma/posts/soon-slot';
import { stripLinks } from '@gitroom/helpers/utils/strip.links';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { stripHtmlValidation } from '@gitroom/helpers/utils/strip.html.validation';
import { weightedLength } from '@gitroom/helpers/utils/count.length';

type PostWithConditionals = Post & {
  integration?: Integration;
  childrenPost: Post[];
};

@Injectable()
export class PostsService {
  private storage = UploadFactory.createStorage();
  constructor(
    private _postRepository: PostsRepository,
    private _integrationManager: IntegrationManager,
    private _integrationService: IntegrationService,
    private _mediaService: MediaService,
    private _shortLinkService: ShortLinkService,
    private _openaiService: OpenaiService,
    private _temporalService: TemporalService,
    private _refreshIntegrationService: RefreshIntegrationService
  ) {}

  searchForMissingThreeHoursPosts() {
    return this._postRepository.searchForMissingThreeHoursPosts();
  }

  updatePost(id: string, postId: string, releaseURL: string) {
    return this._postRepository.updatePost(id, postId, releaseURL);
  }

  claimPost(id: string, claimant: string, anyState: boolean) {
    return this._postRepository.claimPost(id, claimant, anyState);
  }

  getPublishClaim(id: string) {
    return this._postRepository.getPublishClaim(id);
  }

  async getMissingContent(
    orgId: string,
    postId: string,
    forceRefresh = false
  ): Promise<{ id: string; url: string }[]> {
    const post = await this._postRepository.getPostById(postId, orgId);
    if (!post || post.releaseId !== 'missing') {
      return [];
    }

    const integrationProvider = this._integrationManager.getSocialIntegration(
      post.integration.providerIdentifier
    );

    if (!integrationProvider.missing) {
      return [];
    }

    const getIntegration = post.integration!;

    if (
      dayjs(getIntegration?.tokenExpiration).isBefore(dayjs()) ||
      forceRefresh
    ) {
      const data = await this._refreshIntegrationService.refresh(
        getIntegration
      );
      if (!data) {
        return [];
      }

      const { accessToken } = data;

      if (accessToken) {
        getIntegration.token = accessToken;

        if (integrationProvider.refreshWait) {
          await timer(10000);
        }
      } else {
        await this._integrationService.disconnectChannel(orgId, getIntegration);
        return [];
      }
    }

    try {
      return await integrationProvider.missing(
        getIntegration.internalId,
        getIntegration.token
      );
    } catch (e) {
      console.log(e);
      if (e instanceof RefreshToken) {
        return this.getMissingContent(orgId, postId, true);
      }
    }

    return [];
  }

  async getPostById(postId: string, orgId: string) {
    return this._postRepository.getPostById(postId, orgId);
  }

  async updateReleaseId(orgId: string, postId: string, releaseId: string) {
    return this._postRepository.updateReleaseId(postId, orgId, releaseId);
  }

  async checkPostAnalytics(
    orgId: string,
    postId: string,
    date: number,
    forceRefresh = false
  ): Promise<AnalyticsData[] | { missing: true }> {
    const post = await this._postRepository.getPostById(postId, orgId);
    if (!post || !post.releaseId) {
      return [];
    }

    if (post.releaseId === 'missing') {
      return { missing: true };
    }

    const integrationProvider = this._integrationManager.getSocialIntegration(
      post.integration.providerIdentifier
    );

    if (!integrationProvider.postAnalytics) {
      return [];
    }

    const getIntegration = post.integration!;

    if (
      dayjs(getIntegration?.tokenExpiration).isBefore(dayjs()) ||
      forceRefresh
    ) {
      const data = await this._refreshIntegrationService.refresh(
        getIntegration
      );
      if (!data) {
        return [];
      }

      const { accessToken } = data;

      if (accessToken) {
        getIntegration.token = accessToken;

        if (integrationProvider.refreshWait) {
          await timer(10000);
        }
      } else {
        await this._integrationService.disconnectChannel(orgId, getIntegration);
        return [];
      }
    }

    // const getIntegrationData = await ioRedis.get(
    //   `integration:${orgId}:${post.id}:${date}`
    // );
    // if (getIntegrationData) {
    //   return JSON.parse(getIntegrationData);
    // }

    try {
      const loadAnalytics = await integrationProvider.postAnalytics(
        getIntegration.internalId,
        getIntegration.token,
        post.releaseId,
        date
      );
      await ioRedis.set(
        `integration:${orgId}:${post.id}:${date}`,
        JSON.stringify(loadAnalytics),
        'EX',
        !process.env.NODE_ENV || process.env.NODE_ENV === 'development'
          ? 1
          : 3600
      );
      return loadAnalytics;
    } catch (e) {
      console.log(e);
      if (e instanceof RefreshToken) {
        return this.checkPostAnalytics(orgId, postId, date, true);
      }
    }

    return [];
  }

  async getStatistics(orgId: string, id: string) {
    const getPost = await this.getPostsRecursively(id, true, orgId, true);
    const content = getPost.map((p) => p.content);
    const shortLinksTracking = await this._shortLinkService.getStatistics(
      content
    );

    return {
      clicks: shortLinksTracking,
    };
  }

  async mapTypeToPost(
    body: CreatePostDto,
    organization: string,
    replaceDraft: boolean = false
  ): Promise<CreatePostDto> {
    if (!body?.posts?.every((p) => p?.integration?.id)) {
      throw new BadRequestException('All posts must have an integration id');
    }

    const mappedValues = {
      ...body,
      type: replaceDraft ? 'schedule' : body?.type,
      posts: await Promise.all(
        body?.posts?.map(async (post) => {
          const integration = await this._integrationService.getIntegrationById(
            organization,
            post.integration.id
          );

          if (!integration) {
            throw new BadRequestException(
              `Integration with id ${post.integration.id} not found`
            );
          }

          return {
            ...post,
            // After the spread, not before. Post.type carries no validator, so
            // with the spread last a caller could set a per-post type of
            // 'draft' and skip that entry's settings validation while the
            // top-level type stayed 'schedule'.
            type: replaceDraft ? 'schedule' : body?.type,
            settings: {
              ...(post.settings || ({} as any)),
              __type: integration.providerIdentifier,
            },
          };
        }) || []
      ),
    };

    const validationPipe = new ValidationPipe({
      skipMissingProperties: false,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    });

    return await validationPipe.transform(mappedValues, {
      type: 'body',
      metatype: CreatePostDto,
    });
  }

  async getPostsRecursively(
    id: string,
    includeIntegration = false,
    orgId?: string,
    isFirst?: boolean
  ): Promise<PostWithConditionals[]> {
    const post = await this._postRepository.getPost(
      id,
      includeIntegration,
      orgId,
      isFirst
    );

    if (!post) {
      return [];
    }

    return [
      post!,
      ...(post?.childrenPost?.length
        ? await this.getPostsRecursively(
            post?.childrenPost?.[0]?.id,
            false,
            orgId,
            false
          )
        : []),
    ];
  }

  async getPosts(orgId: string, query: GetPostsDto) {
    return this._postRepository.getPosts(orgId, query);
  }

  async getPostsMinified(orgId: string, query: GetPostsDto) {
    return minifyPosts({
      posts: await this._postRepository.getPosts(orgId, query),
    });
  }

  countPostsByState(orgId: string, integrationId: string) {
    return this._postRepository.countPostsByState(orgId, integrationId);
  }

  async getPostsList(orgId: string, query: GetPostsListDto) {
    return minifyPostsList(
      await this._postRepository.getPostsList(orgId, query)
    );
  }

  async updateMedia(id: string, imagesList: any[], convertToJPEG = false) {
    try {
      let imageUpdateNeeded = false;
      const getImageList = await Promise.all(
        (
          await Promise.all(
            (imagesList || []).map(async (p: any) => {
              if (!p.path && p.id) {
                imageUpdateNeeded = true;
                return this._mediaService.getMediaById(p.id);
              }

              return p;
            })
          )
        )
          .map((m) => {
            return {
              ...m,
              url:
                m.path.indexOf('http') === -1
                  ? process.env.FRONTEND_URL +
                    '/' +
                    (process.env.NEXT_PUBLIC_UPLOAD_STATIC_DIRECTORY || 'uploads') +
                    m.path
                  : m.path,
              // Was hardcoded 'image', videos included. This is the value the
              // publish payload carries and providers branch on it: gmb sends
              // `mediaFormat: PHOTO` for anything that is not 'video', telegram
              // picks sendPhoto over sendVideo. So an uploaded mp4 went to
              // those networks as a still.
              //
              // Read off the path rather than the row: Media has a `type`
              // column, but nothing has ever written to it, so every row still
              // carries the "image" default whatever was uploaded. mp4 is the
              // only video the uploaders accept (ALLOWED_EXT_TO_MIME,
              // LOCAL_STORAGE_ALLOWED_MIME).
              type: hasExtension(m.path, 'mp4') ? 'video' : 'image',
              path:
                m.path.indexOf('http') === -1
                  ? process.env.UPLOAD_DIRECTORY + m.path
                  : m.path,
            };
          })
          .map(async (m) => {
            if (!convertToJPEG) {
              return m;
            }

            if (hasExtension(m.path, 'png')) {
              imageUpdateNeeded = true;
              // The stored path can name any host, so it goes through the same
              // guarded reader the providers use.
              const imageBuffer = Buffer.from(await readOrFetch(m.url));

              // Use sharp to get the metadata of the image
              const buffer = await sharp(imageBuffer)
                .jpeg({ quality: 100 })
                .toBuffer();

              const { path, originalname } = await this.storage.uploadFile({
                buffer,
                mimetype: 'image/jpeg',
                size: buffer.length,
                path: '',
                fieldname: '',
                destination: '',
                stream: new Readable(),
                filename: '',
                originalname: '',
                encoding: '',
              });

              return {
                ...m,
                name: originalname,
                url:
                  path.indexOf('http') === -1
                    ? process.env.FRONTEND_URL +
                      '/' +
                      (process.env.NEXT_PUBLIC_UPLOAD_STATIC_DIRECTORY || 'uploads') +
                      path
                    : path,
                type: 'image',
                path:
                  path.indexOf('http') === -1
                    ? process.env.UPLOAD_DIRECTORY + path
                    : path,
              };
            }

            return m;
          })
      );

      if (imageUpdateNeeded) {
        await this._postRepository.updateImages(
          id,
          JSON.stringify(getImageList)
        );
      }

      return getImageList;
    } catch (err: any) {
      return imagesList;
    }
  }

  async getPostGroupDebugExport(orgId: string, group: string) {
    const loadAll = await this._postRepository.getPostsByGroup(orgId, group);
    const errors = await this._postRepository.getErrorsByPostIds(
      loadAll.map((p) => p.id)
    );
    const posts = this.arrangePostsByGroup(loadAll, undefined);
    const rootPost = posts[0] as any;

    return {
      type: 'draft' as const,
      shortLink: false,
      date: rootPost.publishDate.toISOString(),
      tags:
        rootPost.tags?.map((t: any) => ({
          value: t.tag.id,
          label: t.tag.name,
        })) || [],
      posts: [
        {
          integration: { id: 'REPLACE_WITH_LOCAL_INTEGRATION_ID' },
          group: rootPost.group,
          settings: JSON.parse(rootPost.settings || '{}'),
          value: posts.map((post) => ({
            content: post.content,
            image: JSON.parse(post.image || '[]'),
            delay: post.delay || 0,
          })),
        },
      ],
      _debug: {
        providerIdentifier: rootPost.integration?.providerIdentifier,
        providerName: rootPost.integration?.name,
        state: rootPost.state,
        error: rootPost.error,
        errors: errors.map((e) => ({
          message: e.message,
          platform: e.platform,
          body: e.body,
          createdAt: e.createdAt,
        })),
        originalGroup: group,
        originalPublishDate: rootPost.publishDate,
        exportedAt: new Date().toISOString(),
      },
    };
  }

  async getPostsByGroup(orgId: string, group: string) {
    const convertToJPEG = false;
    const loadAll = await this._postRepository.getPostsByGroup(orgId, group);
    const posts = this.arrangePostsByGroup(loadAll, undefined);

    return {
      group: posts?.[0]?.group,
      posts: await Promise.all(
        (posts || []).map(async (post) => ({
          ...post,
          image: await this.updateMedia(
            post.id,
            JSON.parse(post.image || '[]'),
            convertToJPEG
          ),
        }))
      ),
      integrationPicture: posts[0]?.integration?.picture,
      integration: posts[0].integrationId,
      settings: JSON.parse(posts[0].settings || '{}'),
    };
  }

  arrangePostsByGroup(all: any, parent?: string): PostWithConditionals[] {
    const findAll = all
      .filter((p: any) =>
        !parent ? !p.parentPostId : p.parentPostId === parent
      )
      .map(({ integration, ...all }: any) => ({
        ...all,
        ...(!parent ? { integration } : {}),
      }));

    return [
      ...findAll,
      ...(findAll.length
        ? findAll.flatMap((p: any) => this.arrangePostsByGroup(all, p.id))
        : []),
    ];
  }

  async getPost(orgId: string, id: string, convertToJPEG = false) {
    const posts = await this.getPostsRecursively(id, true, orgId, true);
    const list = {
      group: posts?.[0]?.group,
      posts: await Promise.all(
        (posts || []).map(async (post) => ({
          ...post,
          image: await this.updateMedia(
            post.id,
            JSON.parse(post.image || '[]'),
            convertToJPEG
          ),
        }))
      ),
      integrationPicture: posts[0]?.integration?.picture,
      integration: posts[0].integrationId,
      settings: JSON.parse(posts[0].settings || '{}'),
    };

    return list;
  }

  async getOldPosts(orgId: string, date: string) {
    return this._postRepository.getOldPosts(orgId, date);
  }

  public async updateTags(orgId: string, post: Post[]): Promise<Post[]> {
    const plainText = JSON.stringify(post);
    const extract = Array.from(
      plainText.match(/\(post:[a-zA-Z0-9-_]+\)/g) || []
    );
    if (!extract.length) {
      return post;
    }

    const ids = (extract || []).map((e) =>
      e.replace('(post:', '').replace(')', '')
    );
    const urls = await this._postRepository.getPostUrls(orgId, ids);
    const newPlainText = ids.reduce((acc, value) => {
      const findUrl = urls?.find?.((u) => u.id === value)?.releaseURL || '';
      return acc.replace(
        new RegExp(`\\(post:${value}\\)`, 'g'),
        findUrl.split(',')[0]
      );
    }, plainText);

    return this.updateTags(orgId, JSON.parse(newPlainText) as Post[]);
  }

  public async checkInternalPlug(
    integration: Integration,
    orgId: string,
    id: string,
    settings: any
  ) {
    const plugs = Object.entries(settings).filter(([key]) => {
      return key.indexOf('plug-') > -1;
    });

    if (plugs.length === 0) {
      return [];
    }

    const parsePlugs = plugs.reduce((all, [key, value]) => {
      const [_, name, identifier] = key.split('--');
      all[name] = all[name] || { name };
      all[name][identifier] = value;
      return all;
    }, {} as any);

    const list: {
      name: string;
      integrations: { id: string }[];
      delay: string;
      active: boolean;
    }[] = Object.values(parsePlugs);

    return (list || []).flatMap((trigger) => {
      return (trigger?.integrations || []).flatMap((int) => ({
        type: 'internal-plug',
        post: id,
        originalIntegration: integration.id,
        integration: int.id,
        plugName: trigger.name,
        orgId: orgId,
        delay: +trigger.delay,
        information: trigger,
      }));
    });
  }

  public async checkPlugs(
    orgId: string,
    providerName: string,
    integrationId: string
  ) {
    const loadAllPlugs = this._integrationManager.getAllPlugs();
    const getPlugs = await this._integrationService.getPlugs(
      orgId,
      integrationId
    );

    const currentPlug = loadAllPlugs.find((p) => p.identifier === providerName);

    return getPlugs
      .filter((plug) => {
        return currentPlug?.plugs?.some(
          (p: any) => p.methodName === plug.plugFunction
        );
      })
      .map((plug) => {
        const runPlug = currentPlug?.plugs?.find(
          (p: any) => p.methodName === plug.plugFunction
        )!;
        return {
          type: 'global',
          plugId: plug.id,
          delay: runPlug.runEveryMilliseconds,
          totalRuns: runPlug.totalRuns,
        };
      });
  }

  async deletePost(orgId: string, group: string) {
    const post = await this._postRepository.deletePost(orgId, group);

    if (post?.id) {
      try {
        const workflows = this._temporalService.client
          .getRawClient()
          ?.workflow.list({
            query: `postId="${post.id}" AND ExecutionStatus="Running"`,
          });

        for await (const executionInfo of workflows) {
          try {
            const workflow =
              await this._temporalService.client.getWorkflowHandle(
                executionInfo.workflowId
              );
            if (
              workflow &&
              (await workflow.describe()).status.name !== 'TERMINATED'
            ) {
              await workflow.terminate();
            }
          } catch (err) {}
        }
      } catch (err) {}
    }

    return { error: true };
  }

  /**
   * Deleting a channel takes its posts with it. `getPostsForChannel` has no
   * state filter, so that list is every group the channel ever had, and each
   * deletePost above costs two queries plus a Temporal visibility search and a
   * terminate per running workflow. Firing all of them at once exhausted the
   * Prisma pool on busy channels while the HTTP request sat there, so they run
   * a few at a time. Rejections are returned, not thrown: the channel delete
   * must still happen.
   */
  async deletePostsByGroups(orgId: string, groups: string[]) {
    const results: PromiseSettledResult<any>[] = [];
    const chunkSize = 5;

    for (let i = 0; i < groups.length; i += chunkSize) {
      results.push(
        ...(await Promise.allSettled(
          groups
            .slice(i, i + chunkSize)
            .map((group) => this.deletePost(orgId, group))
        ))
      );
    }

    return results;
  }

  async countPostsFromDay(orgId: string, date: Date) {
    return this._postRepository.countPostsFromDay(orgId, date);
  }

  getPostByForWebhookId(id: string, orgId: string, integrationId: string) {
    return this._postRepository.getPostByForWebhookId(id, orgId, integrationId);
  }

  async startWorkflow(
    taskQueue: string,
    postId: string,
    orgId: string,
    state: State
  ) {
    try {
      const workflows = this._temporalService.client
        .getRawClient()
        ?.workflow.list({
          query: `postId="${postId}" AND ExecutionStatus="Running"`,
        });

      for await (const executionInfo of workflows) {
        try {
          const workflow = await this._temporalService.client.getWorkflowHandle(
            executionInfo.workflowId
          );
          if (
            workflow &&
            (await workflow.describe()).status.name !== 'TERMINATED'
          ) {
            await workflow.terminate();
          }
        } catch (err) {}
      }
    } catch (err) {}

    if (state === 'DRAFT') {
      return;
    }

    try {
      await this._temporalService.client
        .getRawClient()
        ?.workflow.start('postWorkflowV109', {
          workflowId: `post_${postId}`,
          taskQueue: 'main',
          workflowIdConflictPolicy: 'TERMINATE_EXISTING',
          args: [
            {
              taskQueue: taskQueue,
              postId: postId,
              organizationId: orgId,
            },
          ],
          typedSearchAttributes: new TypedSearchAttributes([
            {
              key: postIdSearchParam,
              value: postId,
            },
            {
              key: organizationId,
              value: orgId,
            },
          ]),
        });
    } catch (err) {
      // Rethrown, not swallowed. This used to be `catch (err) {}`, which made
      // the failure unreportable *by construction*: `createPost` attaches a
      // `.catch` that reports to Sentry and logs, and that handler could never
      // run because this promise could never reject. An unreachable Temporal
      // therefore looked exactly like a successful schedule — HTTP 200, a row
      // in QUEUE, and nothing anywhere to say the post would never publish.
      //
      // The terminate sweep above keeps its empty catches on purpose: failing
      // to find or kill a previous execution is normal, and the start below
      // uses TERMINATE_EXISTING anyway.
      throw err;
    }
  }

  /**
   * Server-side validation that used to live on the client (`checkValidity` +
   * the manage modal loop). Runs the provider's settings DTO validation, the
   * provider `checkValidity` (media rules) and the empty-content / too-long
   * character checks. Returns one result per post so the frontend can show the
   * same toasts it did before — and so `/posts` can refuse to create invalid
   * posts.
   */
  async validatePosts(
    orgId: string,
    posts: Array<{
      integration: { id: string };
      value: Array<{
        content?: string;
        image?: Array<{ path: string; thumbnail?: string }>;
      }>;
      settings?: any;
    }>
  ) {
    return Promise.all(
      (posts || []).map(async (post) => {
        const integration = await this._integrationService.getIntegrationById(
          orgId,
          post?.integration?.id
        );

        if (!integration) {
          throw new BadRequestException(
            `Integration with id ${post?.integration?.id} not found`
          );
        }

        const provider = this._integrationManager.getSocialIntegration(
          integration.providerIdentifier
        );

        let additionalSettings: any[] = [];
        try {
          additionalSettings = JSON.parse(
            integration.additionalSettings || '[]'
          );
        } catch {
          additionalSettings = [];
        }

        const settings = post.settings || {};
        const media = (post.value || []).map((p) => p.image || []);

        // Settings DTO validation — mirrors the client `form.trigger()`.
        let valid = true;
        let settingsError = '';
        if (provider?.dto) {
          const instance = plainToInstance(provider.dto, settings, {
            enableImplicitConversion: false,
          });
          const validationErrors = await validate(instance as object, {
            skipMissingProperties: false,
          });
          settingsError = this.firstValidationError(validationErrors);
          valid = validationErrors.length === 0;
        }

        // Provider-specific media validation (the old client `checkValidity`).
        let errors: string | true = true;
        try {
          errors = await provider.checkValidity(
            media,
            settings,
            additionalSettings
          );
        } catch (err: any) {
          errors = err?.message || 'Invalid media';
        }

        const maximumCharacters = provider.maxLength(additionalSettings, settings);
        const isX = integration.providerIdentifier === 'x';

        const emptyContent = (post.value || []).some((a) => {
          const strip = stripHtmlValidation('normal', a.content || '', true);
          const length = isX ? weightedLength(strip) : strip.length;
          return length === 0 && (a.image || []).length === 0;
        });

        const tooLong = (post.value || []).some((a) => {
          const strip = stripHtmlValidation('normal', a.content || '', true);
          const weighted = isX ? weightedLength(strip) : strip.length;
          const totalCharacters =
            weighted > strip.length ? weighted : strip.length;
          return totalCharacters > (maximumCharacters || 1000000);
        });

        return {
          id: integration.id,
          identifier: integration.providerIdentifier,
          name: integration.name,
          valid,
          settingsError,
          errors,
          emptyContent,
          tooLong,
          maximumCharacters,
        };
      })
    );
  }

  /** Returns the first class-validator message (incl. nested children), or ''. */
  private firstValidationError(errors: any[]): string {
    for (const e of errors || []) {
      if (e?.constraints) {
        return Object.values(e.constraints as Record<string, string>)[0] || '';
      }
      const child = e?.children?.length
        ? this.firstValidationError(e.children)
        : '';
      if (child) {
        return child;
      }
    }
    return '';
  }

  // A schedule-type save targeting an already-PUBLISHED post republishes it to
  // the platform: require the explicit `republish` opt-in instead. The message
  // doubles as the confirmation dialog for API/MCP automation.
  private guardAgainstRepublish(
    post: { state: State; publishDate: Date; integration?: { providerIdentifier: string } } | null,
    source: 'createPost' | 'changeDate'
  ) {
    if (post?.state !== 'PUBLISHED') {
      return;
    }

    const howToUpdate =
      source === 'createPost' ? `use type 'update'` : `use action 'update'`;

    throw new BadRequestException(
      `This post was already published on ${dayjs
        .utc(post.publishDate)
        .format('YYYY-MM-DD HH:mm')} UTC. Saving it this way would publish it again to ${
        post.integration?.providerIdentifier || 'the channel'
      }. To edit without republishing, ${howToUpdate}. To intentionally publish again, pass republish: true.`
    );
  }

  async createPost(
    orgId: string,
    body: CreatePostDto,
    creationMethod: CreationMethod,
    keepGroup = false
  ): Promise<any[]> {
    const postList = [];
    for (const post of body.posts) {
      if (
        (body.type === 'schedule' || body.type === 'now') &&
        !body.republish &&
        post.value?.[0]?.id
      ) {
        this.guardAgainstRepublish(
          await this._postRepository.getPostById(post.value[0].id, orgId),
          'createPost'
        );
      }
      const provider = this._integrationManager.getSocialIntegration(
        (post.settings as any)?.__type
      );
      const removeLinks = !!provider?.stripLinks?.();

      const messages = (post.value || []).map((p) => p.content);
      // No point shortlinking links on platforms that strip them out anyway
      const updateContent =
        !body.shortLink || removeLinks
          ? messages
          : await this._shortLinkService.convertTextToShortLinks(
              orgId,
              messages
            );

      post.value = (post.value || []).map((p, i) => ({
        ...p,
        content: removeLinks ? stripLinks(updateContent[i]) : updateContent[i],
      }));

      // Media entries carrying an id but no path are resolved from the database
      // at publish time by id alone, so a borrowed id would pull another
      // organization's file into this post. Reject them at the door, where the
      // organization is still in scope.
      const borrowedMediaIds = [
        ...new Set(
          (post.value || [])
            .flatMap((p) => p.image || [])
            .filter((image: any) => image?.id && !image?.path)
            .map((image: any) => image.id as string)
        ),
      ];

      if (borrowedMediaIds.length) {
        const owned = await this._mediaService.findOwnedMediaIds(
          orgId,
          borrowedMediaIds
        );

        if (owned.length !== borrowedMediaIds.length) {
          throw new Error('Media not found');
        }
      }

      const { posts } = await this._postRepository.createOrUpdatePost(
        body.type,
        orgId,
        body.type === 'now' ? dayjs().format('YYYY-MM-DDTHH:mm:00') : body.date,
        post,
        body.tags,
        creationMethod,
        body.inter,
        keepGroup
      );

      if (!posts?.length) {
        return [] as any[];
      }

      if (body.type !== 'update') {
        // The row is already written, so a failure here does not undo the post:
        // it leaves it in QUEUE with nothing scheduled to publish it. Swallowing
        // that made an unreachable Temporal look exactly like a successful
        // schedule, so record it. The request still succeeds, because the post
        // does exist and can be rescheduled.
        this.startWorkflow(
          post.settings.__type.split('-')[0].toLowerCase(),
          posts[0].id,
          orgId,
          posts[0].state
        ).catch((err) => {
          Sentry.captureException(err, {
            tags: { area: 'post_workflow_start' },
            extra: { postId: posts[0].id, orgId },
          });
          console.error(
            `Could not start the publishing workflow for post ${posts[0].id}. It will not go out until it is rescheduled.`,
            err
          );
        });
      }

      Sentry.metrics.count('post_created', 1);
      postList.push({
        postId: posts[0].id,
        integration: post.integration.id,
      });
    }

    return postList;
  }

  // Update ONLY the provider settings of a not-yet-published post (scheduled or
  // draft). The passed keys are merged into the existing settings; content and
  // publish date stay as they are, so the running publish workflow is left
  // untouched (type "update"). Shared by the agent/MCP tool and the public API
  // PUT /posts/:id/settings so both go through one path.
  async updatePostSettings(
    orgId: string,
    postId: string,
    settings: Record<string, any>,
    creationMethod: CreationMethod
  ): Promise<{ postId: string; publishDate: string }> {
    // Ordered as post -> comments, root includes integration and tags.
    const ordered = await this.getPostsRecursively(postId, true, orgId, true);

    const [root] = ordered;
    if (!root) {
      throw new NotFoundException('Post not found');
    }

    if (root.parentPostId) {
      throw new BadRequestException(
        'This id belongs to a comment, pass the id of the main post'
      );
    }

    if (root.state !== 'QUEUE' && root.state !== 'DRAFT') {
      throw new BadRequestException(
        'Only scheduled posts that were not published yet (or drafts) can be updated'
      );
    }

    if (
      root.state === 'QUEUE' &&
      dayjs.utc(root.publishDate).isBefore(dayjs.utc())
    ) {
      throw new BadRequestException(
        'The publish time of this post already passed, it cannot be updated'
      );
    }

    const integration = (root as any).integration;

    let existingSettings: Record<string, any>;
    try {
      existingSettings = JSON.parse(root.settings || '{}');
    } catch (err) {
      existingSettings = {};
    }

    // Merge: only the passed keys change, everything else stays.
    const mergedSettings = {
      ...existingSettings,
      ...(settings || {}),
      __type: integration.providerIdentifier,
    };

    // Keep the existing content/ids so the posts are updated in place (the
    // workflow identity is preserved) - only the settings differ.
    const value = ordered.map((p) => {
      let image = [];
      try {
        image = JSON.parse(p.image || '[]');
      } catch (err) {}
      return {
        id: p.id,
        content: p.content,
        delay: p.delay || 0,
        image,
      };
    });

    // Same server-side validation as the dashboard / public create route.
    const [validation] = await this.validatePosts(orgId, [
      {
        integration: { id: integration.id },
        settings: mergedSettings,
        value: value.map((p) => ({ content: p.content, image: p.image })),
      },
    ]);

    if (validation.emptyContent) {
      throw new BadRequestException(
        `${validation.name}: Your post should have at least one character or one image.`
      );
    }

    if (root.state !== 'DRAFT') {
      if (!validation.valid) {
        throw new BadRequestException(
          `${validation.name}: ${
            validation.settingsError || 'Please fix your settings'
          }`
        );
      }

      if (validation.errors !== true) {
        throw new BadRequestException(
          `${validation.name}: ${validation.errors}`
        );
      }

      if (validation.tooLong) {
        throw new BadRequestException(
          `${validation.name}: The maximum characters is ${validation.maximumCharacters}`
        );
      }
    }

    const date = dayjs.utc(root.publishDate).format('YYYY-MM-DDTHH:mm:ss');

    const [output] = await this.createPost(
      orgId,
      {
        date,
        // Settings-only update: keep the current state and leave the running
        // publish workflow alone.
        type: 'update',
        shortLink: false,
        tags: ((root as any).tags || []).map((t: any) => ({
          value: t.tag.name,
          label: t.tag.name,
        })),
        posts: [
          {
            integration,
            group: root.group,
            settings: mergedSettings,
            value,
          },
        ],
      } as any,
      creationMethod,
      // Keep the group stable: a client may have the calendar open while the
      // settings are updated out of band, and the calendar links posts by group.
      true
    );

    if (!output) {
      throw new BadRequestException('Failed to update the post');
    }

    return {
      postId: output.postId,
      publishDate: date,
    };
  }

  async separatePosts(content: string, len: number) {
    return this._openaiService.separatePosts(content, len);
  }

  async changeState(id: string, state: State, err?: any, body?: any) {
    return this._postRepository.changeState(id, state, err, body);
  }

  async changePostStatus(
    orgId: string,
    id: string,
    status: 'draft' | 'schedule'
  ) {
    const getPostById = await this._postRepository.getPostById(id, orgId);
    if (!getPostById) {
      throw new BadRequestException('Post not found');
    }

    if (getPostById.state === 'PUBLISHED' || getPostById.state === 'ERROR') {
      throw new BadRequestException(
        'Cannot change status of a published or errored post'
      );
    }

    const state: State = status === 'draft' ? 'DRAFT' : 'QUEUE';

    // Idempotent: already a draft — skip Temporal churn.
    if (status === 'draft' && getPostById.state === 'DRAFT') {
      return { id, state };
    }

    if (status === 'draft') {
      await this._postRepository.setPostDraft(id);
    } else {
      await this._postRepository.changeState(id, state);
    }

    try {
      await this.startWorkflow(
        getPostById.integration.providerIdentifier.split('-')[0].toLowerCase(),
        getPostById.id,
        orgId,
        state
      );
    } catch (err) {
      // The row has already moved to QUEUE, so a start failure here means a
      // post the user believes is scheduled with nothing scheduled to publish
      // it. Not fatal to the request — the hourly sweep can still pick it up
      // while it is inside the two-day window — but it must not be invisible.
      Sentry.captureException(err, {
        tags: { area: 'post_workflow_start', path: 'changePostStatus' },
        extra: { postId: id, orgId },
      });
      Logger.error(
        `Could not start the publishing workflow for post ${id} after a status change`,
        err as Error
      );
    }

    return { id, state };
  }

  async changeDate(
    orgId: string,
    id: string,
    date: string,
    action: 'schedule' | 'update' = 'schedule',
    republish = false
  ) {
    const getPostById = await this._postRepository.getPostById(id, orgId);

    // A `schedule` here clears releaseId/releaseURL, puts the row back in QUEUE
    // and starts the workflow — so on an already-published post it publishes
    // the same content to the customer's audience a second time. The only
    // thing standing in the way used to be a confirmation modal in the
    // calendar: a stale tab, a double drop, or any direct API call went
    // straight through, and if the new date was in the past the workflow slept
    // zero and posted immediately.
    //
    // Upstream's guard replaces the flat refusal we had here — it names the
    // platform and the original publish date, tells the caller how to edit
    // without republishing, and leaves a deliberate `republish: true` opt-in
    // for the case where publishing again is the actual intent.
    if (action === 'schedule' && !republish) {
      this.guardAgainstRepublish(getPostById, 'changeDate');
    }

    // schedule: Set status to QUEUE and change date (reschedule the post)
    // update: Just change the date without changing the status
    const newDate = await this._postRepository.changeDate(
      orgId,
      id,
      date,
      action
    );

    if (action === 'schedule') {
      try {
        // Always QUEUE after a schedule changeDate — the DB row was just
        // promoted. Passing the *old* DRAFT state made startWorkflow no-op
        // (Drafts panel → calendar drop never started Temporal).
        await this.startWorkflow(
          getPostById.integration.providerIdentifier
            .split('-')[0]
            .toLowerCase(),
          getPostById.id,
          orgId,
          'QUEUE'
        );
      } catch (err) {
        // Same reasoning as changePostStatus: the row says QUEUE, so a failed
        // start is a post nobody is going to publish. Report it.
        Sentry.captureException(err, {
          tags: { area: 'post_workflow_start', path: 'changeDate' },
          extra: { postId: id, orgId },
        });
        Logger.error(
          `Could not start the publishing workflow for post ${id} after a date change`,
          err as Error
        );
      }
    }

    return newDate;
  }

  async generatePostsDraft(orgId: string, body: CreateGeneratedPostsDto) {
    const getAllIntegrations = (
      await this._integrationService.getIntegrationsList(orgId)
    ).filter((f) => !f.disabled && f.providerIdentifier !== 'reddit');

    // const posts = chunk(body.posts, getAllIntegrations.length);
    const allDates = dayjs()
      .isoWeek(body.week)
      .year(body.year)
      .startOf('isoWeek');

    const dates = [...new Array(7)].map((_, i) => {
      return allDates.add(i, 'day').format('YYYY-MM-DD');
    });

    const findTime = (): string => {
      const totalMinutes = Math.floor(Math.random() * 144) * 10;

      // Convert total minutes to hours and minutes
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;

      // Format hours and minutes to always be two digits
      const formattedHours = hours.toString().padStart(2, '0');
      const formattedMinutes = minutes.toString().padStart(2, '0');
      const randomDate =
        shuffle(dates)[0] + 'T' + `${formattedHours}:${formattedMinutes}:00`;

      if (dayjs(randomDate).isBefore(dayjs())) {
        return findTime();
      }

      return randomDate;
    };

    for (const integration of getAllIntegrations) {
      for (const toPost of body.posts) {
        const group = makeId(10);
        const randomDate = findTime();

        await this.createPost(
          orgId,
          {
            type: 'draft',
            date: randomDate,
            order: '',
            shortLink: false,
            tags: [],
            posts: [
              {
                group,
                integration: {
                  id: integration.id,
                },
                settings: {
                  __type: integration.providerIdentifier as any,
                  title: '',
                  tags: [],
                  subreddit: [],
                },
                value: [
                  ...toPost.list.map((l) => ({
                    id: '',
                    content: l.post,
                    delay: 0,
                    image: [],
                  })),
                  {
                    id: '',
                    delay: 0,
                    content: `Check out the full story here:\n${
                      body.postId || body.url
                    }`,
                    image: [],
                  },
                ],
              },
            ],
          },
          'WEB'
        );
      }
    }
  }

  findAllExistingCategories() {
    return this._postRepository.findAllExistingCategories();
  }

  findAllExistingTopicsOfCategory(category: string) {
    return this._postRepository.findAllExistingTopicsOfCategory(category);
  }

  findPopularPosts(category: string, topic?: string) {
    return this._postRepository.findPopularPosts(category, topic);
  }

  async findFreeDateTime(orgId: string, integrationId?: string) {
    const findTimes = await this._integrationService.findFreeDateTime(
      orgId,
      integrationId
    );
    // getPostsCountsByDates returns `times.filter(...)`, so an empty `times`
    // answers empty for every date and the recursion below walks forward one
    // day at a time forever, one query per step. That is reachable from
    // /posts/find-slot/:id with any id that is unknown, disabled, deleted or
    // owned by another org — each request pins a connection and never answers.
    // Fall back to the same slots the column defaults to (schema.prisma
    // AutoPost/Integration postingTimes) so callers still get a sane time.
    const times = findTimes.length ? findTimes : [120, 400, 700];
    return this.findFreeDateTimeRecursive(
      orgId,
      times,
      dayjs.utc().startOf('day')
    );
  }

  /**
   * Create Post's default "when to post" — 1–4 hours from now on a quarter
   * hour, not the org postingTimes grid (02:00 / 06:40 UTC). Autopost and
   * `/posts/find-slot/:id` keep `findFreeDateTime`.
   */
  async findSoonDateTime(orgId: string) {
    const now = dayjs.utc();
    const { start, end } = soonWindow(now);
    const preferred = await this.firstFreeInRange(orgId, start, end);
    if (preferred) {
      return preferred;
    }
    const later = await this.firstFreeInRange(
      orgId,
      end.add(15, 'minute'),
      now.add(48, 'hour')
    );
    if (later) {
      return later;
    }
    return start.format('YYYY-MM-DDTHH:mm:00');
  }

  private async firstFreeInRange(
    orgId: string,
    from: dayjs.Dayjs,
    to: dayjs.Dayjs
  ): Promise<string | null> {
    for (const day of daysSpanning(from, to)) {
      const times = quarterHourMinutesOnDay(day, from, to);
      if (!times.length) {
        continue;
      }
      const free = await this._postRepository.getPostsCountsByDates(
        orgId,
        times,
        day
      );
      if (!free.length) {
        continue;
      }
      return day
        .clone()
        .add(Math.min(...free), 'minutes')
        .format('YYYY-MM-DDTHH:mm:00');
    }
    return null;
  }

  async createPopularPosts(post: {
    category: string;
    topic: string;
    content: string;
    hook: string;
  }) {
    return this._postRepository.createPopularPosts(post);
  }

  private async findFreeDateTimeRecursive(
    orgId: string,
    times: number[],
    date: dayjs.Dayjs,
    // Backstop: the empty-times case is guarded at the entry point, but this
    // branch is also taken when every slot on a day is past or taken, so bound
    // the walk rather than trust that it always terminates.
    daysLeft = 365
  ): Promise<string> {
    const list = await this._postRepository.getPostsCountsByDates(
      orgId,
      times,
      date
    );

    if (!list.length) {
      if (daysLeft <= 0) {
        return date.clone().add(times[0] ?? 0, 'minutes').format('YYYY-MM-DDTHH:mm:00');
      }
      return this.findFreeDateTimeRecursive(
        orgId,
        times,
        date.add(1, 'day'),
        daysLeft - 1
      );
    }

    const num = list.reduce<null | number>((prev, curr) => {
      if (prev === null || prev > curr) {
        return curr;
      }
      return prev;
    }, null) as number;

    return date.clone().add(num, 'minutes').format('YYYY-MM-DDTHH:mm:00');
  }

  getComments(postId: string) {
    return this._postRepository.getComments(postId);
  }

  getTags(orgId: string) {
    return this._postRepository.getTags(orgId);
  }

  createTag(orgId: string, body: CreateTagDto) {
    return this._postRepository.createTag(orgId, body);
  }

  editTag(id: string, orgId: string, body: CreateTagDto) {
    return this._postRepository.editTag(id, orgId, body);
  }

  deleteTag(id: string, orgId: string) {
    return this._postRepository.deleteTag(id, orgId);
  }

  createComment(
    orgId: string,
    userId: string,
    postId: string,
    comment: string
  ) {
    return this._postRepository.createComment(orgId, userId, postId, comment);
  }
}
