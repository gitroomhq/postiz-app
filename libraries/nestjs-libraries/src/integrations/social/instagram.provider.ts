import {
  AnalyticsData,
  AuthTokenDetails,
  PendingCheckResponse,
  PostDetails,
  PostResponse,
  SocialProvider,
} from '@gitroom/nestjs-libraries/integrations/social/social.integrations.interface';
import { makeId } from '@gitroom/nestjs-libraries/services/make.is';
import { timer } from '@gitroom/helpers/utils/timer';
import dayjs from 'dayjs';
import {
  BadBody,
  SocialAbstract,
  ValidityMedia,
} from '@gitroom/nestjs-libraries/integrations/social.abstract';
import { InstagramDto } from '@gitroom/nestjs-libraries/dtos/posts/providers-settings/instagram.dto';
import { Integration } from '@prisma/client';
import { Rules } from '@gitroom/nestjs-libraries/chat/rules.description.decorator';
import { Tool } from '@gitroom/nestjs-libraries/integrations/tool.decorator';
import { hasExtension } from '@gitroom/helpers/utils/has.extension';

@Rules(
  "Instagram should have at least one attachment, if it's a story, it can have only one picture"
)
export class InstagramProvider
  extends SocialAbstract
  implements SocialProvider
{
  identifier = 'instagram';
  name = 'Instagram\n(Facebook Business)';
  isBetweenSteps = true;
  toolTip = 'Instagram must be business and connected to a Facebook page';
  scopes = [
    'instagram_basic',
    'pages_show_list',
    'pages_read_engagement',
    'business_management',
    'instagram_content_publish',
    'instagram_manage_comments',
    'instagram_manage_insights',
  ];
  override maxConcurrentJob = 400;
  editor = 'normal' as const;
  dto = InstagramDto;
  maxLength() {
    return 2200;
  }

  override async checkValidity(
    [firstPost]: Array<ValidityMedia[]>,
    settings: any
  ): Promise<string | true> {
    if (!firstPost?.length) {
      return 'Should have at least one media';
    }
    if (firstPost.length > 10) {
      return 'Instagram carousel only supports up to 10 media attachments';
    }
    if (this.assetBoolean(settings?.is_trial_reel)) {
      if ((firstPost?.length ?? 0) > 1) {
        return 'Trial Reels can only have one video';
      }
      const hasVideo = firstPost?.some(
        (f) => (f?.path?.indexOf?.('mp4') ?? -1) > -1
      );
      if (!hasVideo) {
        return 'Trial Reels must be a video';
      }
    }
    if (settings?.audio?.id) {
      if (settings?.post_type === 'story') {
        return 'Audio can only be added to Reels, not to Stories';
      }
      if ((firstPost?.length ?? 0) > 1) {
        return 'Audio can only be added to a single video Reel';
      }
      const hasVideo = firstPost?.some(
        (f) => (f?.path?.indexOf?.('mp4') ?? -1) > -1
      );
      if (!hasVideo) {
        return 'Audio can only be added to a video Reel';
      }
    }
    return true;
  }

  async refreshToken(refresh_token: string): Promise<AuthTokenDetails> {
    return {
      refreshToken: '',
      expiresIn: 0,
      accessToken: '',
      id: '',
      name: '',
      picture: '',
      username: '',
    };
  }

  public override handleErrors(
    body: string,
    status: number
  ):
    | {
        type: 'refresh-token' | 'bad-body' | 'retry';
        value: string;
      }
    | undefined {
    if (body.indexOf('An unknown error occurred') > -1) {
      return {
        type: 'retry' as const,
        value: 'An unknown error occurred, please try again later',
      };
    }
    if (body.indexOf('2207081') > -1) {
      return {
        type: 'bad-body' as const,
        value: "This account doesn't support Trial Reels",
      };
    }

    if (
      body.indexOf('REVOKED_ACCESS_TOKEN') > -1 ||
      body.indexOf('"error_subcode":33') > -1
    ) {
      return {
        type: 'refresh-token' as const,
        value:
          'Something is wrong with your connected user, please re-authenticate',
      };
    }

    if (
      body.toLowerCase().indexOf('the user is not an instagram business') > -1
    ) {
      return {
        type: 'refresh-token' as const,
        value:
          'Your Instagram account is not a business account, please convert it to a business account',
      };
    }

    if (body.toLowerCase().indexOf('session has been invalidated') > -1) {
      return {
        type: 'refresh-token' as const,
        value:
          'You session has been invalidated, this can usually happen from frequent posting, please re-authenticate, and wait 1-2 days before posting again',
      };
    }

    if (body.indexOf('2207050') > -1) {
      return {
        type: 'bad-body' as const,
        value: 'Instagram user is restricted',
      };
    }

    // Media download/upload errors
    if (body.indexOf('2207003') > -1) {
      return {
        type: 'bad-body' as const,
        value: 'Timeout downloading media, please try again',
      };
    }

    if (body.indexOf('2207020') > -1) {
      return {
        type: 'bad-body' as const,
        value: 'Media expired, please upload again',
      };
    }

    if (body.indexOf('2207032') > -1) {
      return {
        type: 'bad-body' as const,
        value: 'Failed to create media, please try again',
      };
    }

    if (body.indexOf('2207053') > -1) {
      return {
        type: 'bad-body' as const,
        value: 'Unknown upload error, please try again',
      };
    }

    if (body.indexOf('2207052') > -1) {
      return {
        type: 'bad-body' as const,
        value: 'Media fetch failed, please try again',
      };
    }

    if (body.indexOf('2207057') > -1) {
      return {
        type: 'bad-body' as const,
        value: 'Invalid thumbnail offset for video',
      };
    }

    if (body.indexOf('2207026') > -1) {
      return {
        type: 'bad-body' as const,
        value: 'Unsupported video format',
      };
    }

    if (body.indexOf('2207023') > -1) {
      return {
        type: 'bad-body' as const,
        value: 'Unknown media type',
      };
    }

    if (body.indexOf('2207006') > -1) {
      return {
        type: 'bad-body' as const,
        value: 'Media not found, please upload again',
      };
    }

    if (body.indexOf('2207008') > -1) {
      return {
        type: 'bad-body' as const,
        value: 'Media builder expired, please try again',
      };
    }

    // Content validation errors
    if (body.indexOf('2207028') > -1) {
      return {
        type: 'bad-body' as const,
        value: 'Carousel validation failed',
      };
    }

    if (body.indexOf('2207010') > -1) {
      return {
        type: 'bad-body' as const,
        value: 'Caption is too long',
      };
    }

    // Product tagging errors
    if (body.indexOf('2207035') > -1) {
      return {
        type: 'bad-body' as const,
        value: 'Product tag positions not supported for videos',
      };
    }

    if (body.indexOf('2207036') > -1) {
      return {
        type: 'bad-body' as const,
        value: 'Product tag positions required for photos',
      };
    }

    if (body.indexOf('2207037') > -1) {
      return {
        type: 'bad-body' as const,
        value: 'Product tag validation failed',
      };
    }

    if (body.indexOf('2207040') > -1) {
      return {
        type: 'bad-body' as const,
        value: 'Too many product tags',
      };
    }

    // Image format/size errors
    if (body.indexOf('2207004') > -1) {
      return {
        type: 'bad-body' as const,
        value: 'Image is too large',
      };
    }

    if (body.indexOf('2207005') > -1) {
      return {
        type: 'bad-body' as const,
        value: 'Unsupported image format',
      };
    }

    if (body.indexOf('2207009') > -1) {
      return {
        type: 'bad-body' as const,
        value: 'Aspect ratio not supported, must be between 4:5 to 1.91:1',
      };
    }

    if (body.indexOf('Page request limit reached') > -1) {
      return {
        type: 'bad-body' as const,
        value: 'Page posting for today is limited, please try again tomorrow',
      };
    }

    if (body.indexOf('2207042') > -1) {
      return {
        type: 'bad-body' as const,
        value:
          'You have reached the maximum of 25 posts per day, allowed for your account',
      };
    }

    if (body.indexOf('Not enough permissions to post') > -1) {
      return {
        type: 'bad-body' as const,
        value: 'Not enough permissions to post',
      };
    }

    if (body.indexOf('36003') > -1) {
      return {
        type: 'bad-body' as const,
        value: 'Aspect ratio not supported, must be between 4:5 to 1.91:1',
      };
    }

    if (body.indexOf('190,') > -1) {
      return {
        type: 'bad-body' as const,
        value:
          'The account is missing some permissions to perform this action, please re-add the account and allow all permissions',
      };
    }

    if (body.indexOf('36001') > -1) {
      return {
        type: 'bad-body' as const,
        value: 'Invalid Instagram image resolution max: 1920x1080px',
      };
    }

    if (body.indexOf('2207051') > -1) {
      return {
        type: 'bad-body' as const,
        value: 'Instagram blocked your request',
      };
    }

    if (body.indexOf('2207001') > -1) {
      return {
        type: 'bad-body' as const,
        value:
          'Instagram detected that your post is spam, please try again with different content',
      };
    }

    if (body.indexOf('2207082') > -1) {
      return {
        type: 'retry' as const,
        value: 'Could not upload your media',
      }
    }

    if (body.indexOf('2207077') > -1) {
      return {
        type: 'bad-body' as const,
        value: 'Instagram Video download failed',
      };
    }

    if (body.indexOf('too little or too many attachments') > -1) {
      return {
        type: 'bad-body' as const,
        value: 'Instagram carousel should have between 2 and 10 media attachments',
      }
    }

    if (body.indexOf('2207027') > -1) {
      return {
        type: 'bad-body' as const,
        value: 'Unknown error, please try again later or contact support',
      };
    }

    if (body.indexOf('param collaborators is not allowed') > -1) {
      return {
        type: 'bad-body' as const,
        value: 'Collaborators are not allowed for carousel',
      };
    }

    return undefined;
  }

  async reConnect(
    id: string,
    requiredId: string,
    token: string
  ): Promise<Omit<AuthTokenDetails, 'refreshToken' | 'expiresIn'>> {
    const [accessToken, userToken] = token.split('___');
    const findPage = (await this.pages(accessToken)).find(
      (p) => p.id === requiredId
    );

    const information = await this.fetchPageInformation(accessToken, {
      id: requiredId,
      pageId: findPage?.pageId!,
    });

    return {
      id: information.id,
      name: information.name,
      accessToken: information.access_token,
      picture: information.picture,
      username: information.username,
    };
  }

  async generateAuthUrl() {
    const state = makeId(6);
    return {
      url:
        'https://www.facebook.com/v20.0/dialog/oauth' +
        `?client_id=${process.env.FACEBOOK_APP_ID}` +
        `&redirect_uri=${encodeURIComponent(
          `${process.env.FRONTEND_URL}/integrations/social/instagram`
        )}` +
        `&state=${state}` +
        `&scope=${encodeURIComponent(this.scopes.join(','))}`,
      codeVerifier: makeId(10),
      state,
    };
  }

  async authenticate(params: {
    code: string;
    codeVerifier: string;
    refresh: string;
  }) {
    const getAccessToken = await (
      await fetch(
        'https://graph.facebook.com/v20.0/oauth/access_token' +
          `?client_id=${process.env.FACEBOOK_APP_ID}` +
          `&redirect_uri=${encodeURIComponent(
            `${process.env.FRONTEND_URL}/integrations/social/instagram${
              params.refresh ? `?refresh=${params.refresh}` : ''
            }`
          )}` +
          `&client_secret=${process.env.FACEBOOK_APP_SECRET}` +
          `&code=${params.code}`
      )
    ).json();

    const { access_token, expires_in, ...all } = await (
      await fetch(
        'https://graph.facebook.com/v20.0/oauth/access_token' +
          '?grant_type=fb_exchange_token' +
          `&client_id=${process.env.FACEBOOK_APP_ID}` +
          `&client_secret=${process.env.FACEBOOK_APP_SECRET}` +
          `&fb_exchange_token=${getAccessToken.access_token}`
      )
    ).json();

    const { data } = await (
      await fetch(
        `https://graph.facebook.com/v20.0/me/permissions?access_token=${access_token}`
      )
    ).json();

    const permissions = data
      .filter((d: any) => d.status === 'granted')
      .map((p: any) => p.permission);
    this.checkScopes(this.scopes, permissions);

    const { id, name, picture } = await (
      await fetch(
        `https://graph.facebook.com/v20.0/me?fields=id,name,picture&access_token=${access_token}`
      )
    ).json();

    return {
      id,
      name,
      accessToken: access_token,
      refreshToken: access_token,
      expiresIn: dayjs().add(59, 'days').unix() - dayjs().unix(),
      picture: picture?.data?.url || '',
      username: '',
    };
  }

  async pages(token: string) {
    const [accessToken, userToken] = token.split('___');
    const seenPageIds = new Set<string>();
    const allFacebookPages: any[] = [];

    const fetchPaginated = async (startUrl: string) => {
      let nextUrl: string | undefined = startUrl;
      while (nextUrl) {
        const response = await (await fetch(nextUrl)).json();
        if (response.data) {
          for (const page of response.data) {
            if (!seenPageIds.has(page.id)) {
              seenPageIds.add(page.id);
              allFacebookPages.push(page);
            }
          }
        }
        nextUrl = response.paging?.next;
      }
    };

    // Fetch pages the user explicitly shared during the OAuth dialog
    await fetchPaginated(
      `https://graph.facebook.com/v20.0/me/accounts?fields=id,instagram_business_account,username,name,picture.type(large)&limit=100&access_token=${accessToken}`
    );

    // Also fetch pages via Business Manager API to discover pages
    // not selected during the OAuth page selection step
    try {
      let bizUrl:
        | string
        | undefined = `https://graph.facebook.com/v20.0/me/businesses?access_token=${accessToken}`;

      while (bizUrl) {
        const bizResponse = await (await fetch(bizUrl)).json();
        if (bizResponse.data) {
          for (const business of bizResponse.data) {
            try {
              await fetchPaginated(
                `https://graph.facebook.com/v20.0/${business.id}/owned_pages?fields=id,instagram_business_account,username,name,picture.type(large)&limit=100&access_token=${accessToken}`
              );
            } catch {
              // Continue with other businesses
            }

            try {
              await fetchPaginated(
                `https://graph.facebook.com/v20.0/${business.id}/client_pages?fields=id,instagram_business_account,username,name,picture.type(large)&limit=100&access_token=${accessToken}`
              );
            } catch {
              // Continue with other businesses
            }
          }
        }
        bizUrl = bizResponse.paging?.next;
      }
    } catch {
      // Business Manager API not available for all users
    }

    const onlyConnectedAccounts = await Promise.all(
      allFacebookPages
        .filter((f: any) => f.instagram_business_account)
        .map(async (p: any) => {
          return {
            pageId: p.id,
            ...(await (
              await fetch(
                `https://graph.facebook.com/v20.0/${p.instagram_business_account.id}?fields=name,profile_picture_url&access_token=${accessToken}`
              )
            ).json()),
            id: p.instagram_business_account.id,
          };
        })
    );

    return onlyConnectedAccounts.map((p: any) => ({
      pageId: p.pageId,
      id: p.id,
      name: p.name,
      picture: { data: { url: p.profile_picture_url } },
    }));
  }

  async fetchPageInformation(
    token: string,
    data: { pageId: string; id: string }
  ) {
    const [accessToken, userToken] = token.split('___');
    const { access_token, ...all } = await (
      await fetch(
        `https://graph.facebook.com/v20.0/${data.pageId}?fields=access_token,name,picture.type(large)&access_token=${accessToken}`
      )
    ).json();

    const { id, name, profile_picture_url, username } = await (
      await fetch(
        `https://graph.facebook.com/v20.0/${data.id}?fields=username,name,profile_picture_url&access_token=${accessToken}`
      )
    ).json();

    return {
      id,
      name,
      picture: profile_picture_url,
      access_token: access_token + '___' + accessToken,
      username,
    };
  }

  // Single, read-only status check of a media container - the polling loops
  // that used to live inside post() are now driven by the post workflow.
  private async igContainerStatus(
    containerId: string,
    checkToken: string,
    type: string
  ): Promise<string> {
    const { status_code, status } = await (
      await this.fetch(
        `https://${type}/v20.0/${containerId}?access_token=${checkToken}&fields=status_code,status`,
        undefined,
        '',
        0,
        true
      )
    ).json();

    if (status_code === 'ERROR' || status_code === 'EXPIRED') {
      throw new BadBody(
        this.identifier,
        JSON.stringify({ status_code, status }),
        '{}',
        status || 'Instagram could not process the media'
      );
    }

    return status_code;
  }

  // The post is live, the permalink is only cosmetic: never fail (and risk
  // re-publishing) a live post over it.
  private async igPermalink(
    mediaId: string,
    checkToken: string,
    type: string,
    integration: Integration
  ): Promise<string> {
    try {
      const { permalink } = await (
        await this.fetch(
          `https://${type}/v20.0/${mediaId}?fields=permalink&access_token=${checkToken}`
        )
      ).json();
      return permalink;
    } catch (err) {
      return `https://www.instagram.com/${integration.profile}`;
    }
  }

  async postPending(
    id: string,
    token: string,
    postDetails: PostDetails<InstagramDto>[],
    integration: Integration,
    type = 'graph.facebook.com'
  ): Promise<PostResponse[]> {
    const [accessToken] = token.split('___');
    const [firstPost] = postDetails;
    const isStory = firstPost.settings.post_type === 'story';
    const isTrialReel = this.assetBoolean(firstPost.settings.is_trial_reel);
    const medias = await Promise.all(
      firstPost?.media?.map(async (m) => {
        const caption =
          firstPost.media?.length === 1
            ? `&caption=${encodeURIComponent(firstPost.message)}`
            : ``;
        const isCarousel =
          (firstPost?.media?.length || 0) > 1 && !isStory
            ? `&is_carousel_item=true`
            : ``;
        const mediaType = hasExtension(m.path, 'mp4')
          ? firstPost?.media?.length === 1
            ? isStory
              ? `video_url=${m.path}&media_type=STORIES`
              : `video_url=${m.path}&media_type=REELS&thumb_offset=${
                  m?.thumbnailTimestamp || 0
                }`
            : isStory
            ? `video_url=${m.path}&media_type=STORIES`
            : `video_url=${m.path}&media_type=VIDEO&thumb_offset=${
                m?.thumbnailTimestamp || 0
              }`
          : isStory
          ? `image_url=${m.path}&media_type=STORIES`
          : `image_url=${m.path}`;

        const trialParams = isTrialReel
          ? `&trial_params=${encodeURIComponent(
              JSON.stringify({
                graduation_strategy:
                  firstPost.settings.graduation_strategy || 'MANUAL',
              })
            )}`
          : ``;

        const collaborators =
          firstPost?.settings?.collaborators?.length && !isStory
            ? `&collaborators=${JSON.stringify(
                firstPost?.settings?.collaborators.map((p) => p.label)
              )}`
            : ``;

        // audio_configuration is only supported for Reels (single video, not a story)
        // and only with Facebook Login (not Instagram Login / graph.instagram.com)
        const audioConfiguration =
          firstPost?.settings?.audio?.id &&
          type === 'graph.facebook.com' &&
          !isStory &&
          firstPost?.media?.length === 1 &&
          hasExtension(m.path, 'mp4')
            ? `&audio_configuration=${encodeURIComponent(
                JSON.stringify({
                  audio_id: firstPost.settings.audio.id,
                  ...(typeof firstPost.settings.audio.audio_volume !==
                  'undefined'
                    ? { audio_volume: +firstPost.settings.audio.audio_volume }
                    : {}),
                  ...(typeof firstPost.settings.audio.video_volume !==
                  'undefined'
                    ? { video_volume: +firstPost.settings.audio.video_volume }
                    : {}),
                })
              )}`
            : ``;

        const { id: photoId } = await (
          await this.fetch(
            `https://${type}/v20.0/${id}/media?${mediaType}${isCarousel}${collaborators}${trialParams}${audioConfiguration}&access_token=${accessToken}${caption}`,
            {
              method: 'POST',
            }
          )
        ).json();

        return photoId;
      }) || []
    );

    // Containers are invisible until media_publish runs: the processing wait
    // and the publish itself move to checkPostStatus / finalizePost so a
    // failure there can never re-create (and re-publish) the whole post.
    return [
      {
        id: firstPost.id,
        postId: '',
        releaseURL: '',
        status: 'pending',
        pendingData: {
          type,
          postType:
            isStory && medias.length > 1
              ? 'stories'
              : medias.length === 1
              ? 'single'
              : 'carousel',
          containers: medias,
          message: firstPost?.message || '',
        },
      },
    ];
  }

  override async checkPostStatus(
    token: string,
    pendingData: {
      type: string;
      postType: 'stories' | 'single' | 'carousel';
      containers: string[];
      message?: string;
      carouselId?: string;
    },
    integration: Integration
  ): Promise<PendingCheckResponse> {
    const [accessToken, userToken] = token.split('___');
    const checkToken = userToken || accessToken;

    // the carousel container was already created: wait for it
    if (pendingData.carouselId) {
      const status = await this.igContainerStatus(
        pendingData.carouselId,
        checkToken,
        pendingData.type
      );

      if (status === 'IN_PROGRESS') {
        return { status: 'pending', pendingData };
      }

      // a previous finalizePost published but died before reporting: the post
      // is live, never publish again
      if (status === 'PUBLISHED') {
        return {
          status: 'completed',
          postId: pendingData.carouselId,
          releaseURL: `https://www.instagram.com/${integration.profile}`,
        };
      }

      return { status: 'ready', pendingData };
    }

    for (const containerId of pendingData.containers) {
      const status = await this.igContainerStatus(
        containerId,
        checkToken,
        pendingData.type
      );

      if (status === 'IN_PROGRESS') {
        return { status: 'pending', pendingData };
      }

      if (status === 'PUBLISHED') {
        // a previous finalizePost died mid-way: a single post is fully live,
        // stories are resumed by finalizePost (it skips published containers)
        if (pendingData.postType === 'single') {
          return {
            status: 'completed',
            postId: containerId,
            releaseURL: `https://www.instagram.com/${integration.profile}`,
          };
        }
      }
    }

    return { status: 'ready', pendingData };
  }

  override async finalizePost(
    token: string,
    pendingData: {
      type: string;
      postType: 'stories' | 'single' | 'carousel';
      containers: string[];
      message?: string;
      carouselId?: string;
    },
    integration: Integration
  ): Promise<PendingCheckResponse> {
    const [accessToken, userToken] = token.split('___');
    const checkToken = userToken || accessToken;
    const igId = integration.internalId;

    if (pendingData.postType === 'stories') {
      // Stories don't support carousels - publish each media as a separate
      // story, skipping containers a previous (crashed) run already published
      let lastMediaId = '';
      for (const mediaCreationId of pendingData.containers) {
        const status = await this.igContainerStatus(
          mediaCreationId,
          checkToken,
          pendingData.type
        );
        if (status === 'PUBLISHED') {
          continue;
        }

        const { id: mediaId } = await (
          await this.fetch(
            `https://${pendingData.type}/v20.0/${igId}/media_publish?creation_id=${mediaCreationId}&access_token=${accessToken}&field=id`,
            {
              method: 'POST',
            }
          )
        ).json();
        lastMediaId = mediaId;
      }

      return {
        status: 'completed',
        postId: lastMediaId || pendingData.containers.at(-1)!,
        releaseURL: !lastMediaId
          ? `https://www.instagram.com/${integration.profile}`
          : await this.igPermalink(
              lastMediaId,
              checkToken,
              pendingData.type,
              integration
            ),
      };
    }

    if (pendingData.postType === 'carousel' && !pendingData.carouselId) {
      // create the carousel container and hand back to the workflow to wait
      // for it (an orphan container from a crashed run is invisible, so
      // re-running this is safe)
      const { id: containerId } = await (
        await this.fetch(
          `https://${pendingData.type}/v20.0/${igId}/media?caption=${encodeURIComponent(
            pendingData.message || ''
          )}&media_type=CAROUSEL&children=${encodeURIComponent(
            pendingData.containers.join(',')
          )}&access_token=${accessToken}`,
          {
            method: 'POST',
          }
        )
      ).json();

      return {
        status: 'pending',
        pendingData: { ...pendingData, carouselId: containerId },
      };
    }

    const creationId =
      pendingData.postType === 'carousel'
        ? pendingData.carouselId
        : pendingData.containers[0];

    const { id: mediaId } = await (
      await this.fetch(
        `https://${pendingData.type}/v20.0/${igId}/media_publish?creation_id=${creationId}&access_token=${accessToken}&field=id`,
        {
          method: 'POST',
        }
      )
    ).json();

    return {
      status: 'completed',
      postId: mediaId,
      releaseURL: await this.igPermalink(
        mediaId,
        checkToken,
        pendingData.type,
        integration
      ),
    };
  }

  // Old blocking behavior, kept for workflow versions before v1.0.6 that don't
  // know how to resolve a `pending` response.
  async post(
    id: string,
    token: string,
    postDetails: PostDetails<InstagramDto>[],
    integration: Integration,
    type = 'graph.facebook.com'
  ): Promise<PostResponse[]> {
    const [firstPost] = postDetails;
    const [response] = await this.postPending(
      id,
      token,
      postDetails,
      integration,
      type
    );

    let pendingData = response.pendingData;
    const started = Date.now();

    // eslint-disable-next-line no-constant-condition
    while (true) {
      // Cap below the 10-minute activity timeout of the old workflows using
      // this method: failing here (non-retryable) is safe, timing the
      // activity out is not - a retried activity would publish again.
      if (Date.now() - started > 8 * 60 * 1000) {
        throw new BadBody(
          this.identifier,
          '{}',
          '{}',
          'Media processing timed out'
        );
      }

      const check = await this.checkPostStatus(token, pendingData, integration);

      if (check.status === 'pending') {
        pendingData = check.pendingData;
        await timer(30000);
        continue;
      }

      const result =
        check.status === 'ready'
          ? await this.finalizePost(token, check.pendingData, integration)
          : check;

      if (result.status === 'completed') {
        return [
          {
            id: firstPost.id,
            postId: result.postId,
            releaseURL: result.releaseURL,
            status: 'success',
          },
        ];
      }

      pendingData = result.pendingData;
      await timer(30000);
    }
  }

  async comment(
    id: string,
    postId: string,
    lastCommentId: string | undefined,
    token: string,
    postDetails: PostDetails<InstagramDto>[],
    integration: Integration,
    type = 'graph.facebook.com'
  ): Promise<PostResponse[]> {
    const [accessToken, userToken] = token.split('___');
    const [commentPost] = postDetails;

    const { id: commentId } = await (
      await this.fetch(
        `https://${type}/v20.0/${postId}/comments?message=${encodeURIComponent(
          commentPost.message
        )}&access_token=${accessToken}`,
        {
          method: 'POST',
        }
      )
    ).json();

    // Get the permalink from the parent post
    const { permalink } = await (
      await this.fetch(
        `https://${type}/v20.0/${postId}?fields=permalink&access_token=${
          userToken || accessToken
        }`
      )
    ).json();

    return [
      {
        id: commentPost.id,
        postId: commentId,
        releaseURL: permalink,
        status: 'success',
      },
    ];
  }

  private setTitle(name: string) {
    switch (name) {
      case 'likes': {
        return 'Likes';
      }

      case 'followers': {
        return 'Followers';
      }

      case 'reach': {
        return 'Reach';
      }

      case 'follower_count': {
        return 'Follower Count';
      }

      case 'views': {
        return 'Views';
      }

      case 'comments': {
        return 'Comments';
      }

      case 'shares': {
        return 'Shares';
      }

      case 'saves': {
        return 'Saves';
      }

      case 'replies': {
        return 'Replies';
      }
    }

    return '';
  }

  async analytics(
    id: string,
    token: string,
    date: number,
    type = 'graph.facebook.com'
  ): Promise<AnalyticsData[]> {
    const [accessToken, userToken] = token.split('___');
    const until = dayjs().startOf('day').unix();
    const since = dayjs().subtract(date, 'day').unix();

    const { data, ...all } = await (
      await fetch(
        `https://${type}/v21.0/${id}/insights?metric=follower_count,reach&access_token=${accessToken}&period=day&since=${since}&until=${until}`
      )
    ).json();

    const { data: data2, ...all2 } = await (
      await fetch(
        `https://${type}/v21.0/${id}/insights?metric_type=total_value&metric=likes,views,comments,shares,saves,replies&access_token=${accessToken}&period=day&since=${since}&until=${until}`
      )
    ).json();
    const analytics = [];

    analytics.push(
      ...(data?.map((d: any) => ({
        label: this.setTitle(d.name),
        percentageChange: 5,
        data: d.values.map((v: any) => ({
          total: v.value,
          date: dayjs(v.end_time).format('YYYY-MM-DD'),
        })),
      })) || [])
    );

    analytics.push(
      ...data2.map((d: any) => ({
        label: this.setTitle(d.name),
        percentageChange: 5,
        data: [
          {
            total: d.total_value.value,
            date: dayjs().format('YYYY-MM-DD'),
          },
        ],
      }))
    );

    return analytics;
  }

  music(accessToken: string, data: { q: string }) {
    return this.fetch(
      `https://graph.facebook.com/v20.0/music/search?q=${encodeURIComponent(
        data.q
      )}&access_token=${accessToken}`
    );
  }

  // https://developers.facebook.com/docs/instagram-platform/content-publishing/audio-api/
  // empty search_query returns trending audio
  @Tool({
    description:
      'Search audio (music or original sounds) to attach to a Reel via the "audio" setting, an empty query returns trending audio',
    dataSchema: [
      {
        key: 'q',
        type: 'string',
        description: 'Search query, leave empty for trending audio',
      },
      {
        key: 'type',
        type: 'string',
        description: 'Either "music" or "original_sound", defaults to "music"',
      },
    ],
  })
  async audioSearch(
    token: string,
    data: { q?: string; type?: 'music' | 'original_sound' },
    internalId?: string
  ) {
    const [accessToken, userToken] = token.split('___');
    const audioType =
      data?.type === 'original_sound' ? 'original_sound' : 'music';

    const { audio } = await (
      await this.fetch(
        `https://graph.facebook.com/v22.0/ig_audio?audio_type=${audioType}&user_id=${internalId}${
          data?.q ? `&search_query=${encodeURIComponent(data.q)}` : ''
        }&access_token=${userToken || accessToken}`
      )
    ).json();

    return (audio || []).map((audio: any) => ({
      id: audio.audio_id,
      title: audio.title || '',
      artist: audio.display_artist || audio.ig_username || '',
      image:
        audio.cover_artwork_thumbnail_uri ||
        audio.cover_artwork_thumbnail_url ||
        audio.profile_picture_url ||
        '',
      duration: audio.duration_in_ms || 0,
      previewUrl: audio.download_url || '',
    }));
  }

  async postAnalytics(
    integrationId: string,
    token: string,
    postId: string,
    date: number,
    type = 'graph.facebook.com'
  ): Promise<AnalyticsData[]> {
    const [accessToken, userToken] = token.split('___');
    const today = dayjs().format('YYYY-MM-DD');

    try {
      // Fetch media insights from Instagram Graph API
      const { data } = await (
        await fetch(
          `https://${type}/v21.0/${postId}/insights?metric=views,reach,saved,likes,comments,shares&access_token=${accessToken}`
        )
      ).json();

      if (!data || data.length === 0) {
        return [];
      }

      const result: AnalyticsData[] = [];

      for (const metric of data) {
        const value = metric.values?.[0]?.value;
        if (value === undefined) continue;

        let label = '';

        switch (metric.name) {
          case 'views':
            label = 'Views';
            break;
          case 'reach':
            label = 'Reach';
            break;
          case 'engagement':
            label = 'Engagement';
            break;
          case 'saved':
            label = 'Saves';
            break;
          case 'likes':
            label = 'Likes';
            break;
          case 'comments':
            label = 'Comments';
            break;
          case 'shares':
            label = 'Shares';
            break;
        }

        if (label) {
          result.push({
            label,
            percentageChange: 0,
            data: [{ total: String(value), date: today }],
          });
        }
      }

      return result;
    } catch (err) {
      console.error('Error fetching Instagram post analytics:', err);
      return [];
    }
  }
}
