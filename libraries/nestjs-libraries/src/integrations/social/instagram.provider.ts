import {
  AnalyticsData,
  AuthTokenDetails,
  PostDetails,
  PostResponse,
  SocialProvider,
} from '@gitroom/nestjs-libraries/integrations/social/social.integrations.interface';
import { makeId } from '@gitroom/nestjs-libraries/services/make.is';
import { timer } from '@gitroom/helpers/utils/timer';
import dayjs from 'dayjs';
import { SocialAbstract } from '@gitroom/nestjs-libraries/integrations/social.abstract';
import { InstagramDto } from '@gitroom/nestjs-libraries/dtos/posts/providers-settings/instagram.dto';
import { Integration } from '@prisma/client';

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
  editor = 'normal' as const;

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

  public override handleErrors(body: string):
    | {
        type: 'refresh-token' | 'bad-body';
        value: string;
      }
    | undefined {

    if (body.indexOf('REVOKED_ACCESS_TOKEN') > -1) {
      return {
        type: 'refresh-token' as const,
        value:
          'Something is wrong with your connected user, please re-authenticate',
      };
    }

    if (body.toLowerCase().indexOf('the user is not an instagram business') > -1) {
      return {
        type: 'refresh-token' as const,
        value:
          'Your Instagram account is not a business account, please convert it to a business account',
      };
    }

    if (body.toLowerCase().indexOf('session has been invalidated') > -1) {
      return {
        type: 'refresh-token' as const,
        value: 'Please re-authenticate your Instagram account',
      };
    }

    if (body.indexOf('2207050') > -1) {
      return {
        type: 'refresh-token' as const,
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

    if (body.indexOf('2207027') > -1) {
      return {
        type: 'bad-body' as const,
        value: 'Unknown error, please try again later or contact support',
      };
    }

    console.log('err', body);
    return undefined;
  }

  async reConnect(
    id: string,
    requiredId: string,
    accessToken: string
  ): Promise<AuthTokenDetails> {
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
      refreshToken: information.access_token,
      expiresIn: dayjs().add(59, 'days').unix() - dayjs().unix(),
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
      await this.fetch(
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
      await this.fetch(
        'https://graph.facebook.com/v20.0/oauth/access_token' +
          '?grant_type=fb_exchange_token' +
          `&client_id=${process.env.FACEBOOK_APP_ID}` +
          `&client_secret=${process.env.FACEBOOK_APP_SECRET}` +
          `&fb_exchange_token=${getAccessToken.access_token}`
      )
    ).json();

    const { data } = await (
      await this.fetch(
        `https://graph.facebook.com/v20.0/me/permissions?access_token=${access_token}`
      )
    ).json();

    const permissions = data
      .filter((d: any) => d.status === 'granted')
      .map((p: any) => p.permission);
    this.checkScopes(this.scopes, permissions);

    const {
      id,
      name,
      picture: {
        data: { url },
      },
    } = await (
      await this.fetch(
        `https://graph.facebook.com/v20.0/me?fields=id,name,picture&access_token=${access_token}`
      )
    ).json();

    return {
      id,
      name,
      accessToken: access_token,
      refreshToken: access_token,
      expiresIn: dayjs().add(59, 'days').unix() - dayjs().unix(),
      picture: url,
      username: '',
    };
  }

  async pages(accessToken: string) {
    const { data } = await (
      await this.fetch(
        `https://graph.facebook.com/v20.0/me/accounts?fields=id,instagram_business_account,username,name,picture.type(large)&access_token=${accessToken}&limit=500`
      )
    ).json();

    const onlyConnectedAccounts = await Promise.all(
      data
        .filter((f: any) => f.instagram_business_account)
        .map(async (p: any) => {
          return {
            pageId: p.id,
            ...(await (
              await this.fetch(
                `https://graph.facebook.com/v20.0/${p.instagram_business_account.id}?fields=name,profile_picture_url&access_token=${accessToken}&limit=500`
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
    accessToken: string,
    data: { pageId: string; id: string }
  ) {
    const { access_token, ...all } = await (
      await this.fetch(
        `https://graph.facebook.com/v20.0/${data.pageId}?fields=access_token,name,picture.type(large)&access_token=${accessToken}`
      )
    ).json();

    const { id, name, profile_picture_url, username } = await (
      await this.fetch(
        `https://graph.facebook.com/v20.0/${data.id}?fields=username,name,profile_picture_url&access_token=${accessToken}`
      )
    ).json();

    console.log(id, name, profile_picture_url, username);
    return {
      id,
      name,
      picture: profile_picture_url,
      access_token,
      username,
    };
  }

  async post(
    id: string,
    accessToken: string,
    postDetails: PostDetails<InstagramDto>[],
    integration: Integration,
    type = 'graph.facebook.com'
  ): Promise<PostResponse[]> {
    const [firstPost, ...theRest] = postDetails;
    console.log('in progress', id);
    const isStory = firstPost.settings.post_type === 'story';
    const medias = await Promise.all(
      firstPost?.media?.map(async (m) => {
        const caption =
          firstPost.media?.length === 1
            ? `&caption=${encodeURIComponent(firstPost.message)}`
            : ``;
        const isCarousel =
          (firstPost?.media?.length || 0) > 1 ? `&is_carousel_item=true` : ``;
        const mediaType =
          m.path.indexOf('.mp4') > -1
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
        console.log('in progress1');

        const collaborators =
          firstPost?.settings?.collaborators?.length && !isStory
            ? `&collaborators=${JSON.stringify(
                firstPost?.settings?.collaborators.map((p) => p.label)
              )}`
            : ``;

        console.log(collaborators);
        const { id: photoId } = await (
          await this.fetch(
            `https://${type}/v20.0/${id}/media?${mediaType}${isCarousel}${collaborators}&access_token=${accessToken}${caption}`,
            {
              method: 'POST',
            }
          )
        ).json();
        console.log('in progress2', id);

        let status = 'IN_PROGRESS';
        while (status === 'IN_PROGRESS') {
          const { status_code } = await (
            await this.fetch(
              `https://${type}/v20.0/${photoId}?access_token=${accessToken}&fields=status_code`
            )
          ).json();
          await timer(10000);
          status = status_code;
        }
        console.log('in progress3', id);

        return photoId;
      }) || []
    );

    const arr = [];

    let containerIdGlobal = '';
    let linkGlobal = '';
    if (medias.length === 1) {
      const { id: mediaId } = await (
        await this.fetch(
          `https://${type}/v20.0/${id}/media_publish?creation_id=${medias[0]}&access_token=${accessToken}&field=id`,
          {
            method: 'POST',
          }
        )
      ).json();

      containerIdGlobal = mediaId;

      const { permalink } = await (
        await this.fetch(
          `https://${type}/v20.0/${mediaId}?fields=permalink&access_token=${accessToken}`
        )
      ).json();

      arr.push({
        id: firstPost.id,
        postId: mediaId,
        releaseURL: permalink,
        status: 'success',
      });

      linkGlobal = permalink;
    } else {
      const { id: containerId, ...all3 } = await (
        await this.fetch(
          `https://${type}/v20.0/${id}/media?caption=${encodeURIComponent(
            firstPost?.message
          )}&media_type=CAROUSEL&children=${encodeURIComponent(
            medias.join(',')
          )}&access_token=${accessToken}`,
          {
            method: 'POST',
          }
        )
      ).json();

      let status = 'IN_PROGRESS';
      while (status === 'IN_PROGRESS') {
        const { status_code } = await (
          await this.fetch(
            `https://${type}/v20.0/${containerId}?fields=status_code&access_token=${accessToken}`
          )
        ).json();
        await timer(10000);
        status = status_code;
      }

      const { id: mediaId, ...all4 } = await (
        await this.fetch(
          `https://${type}/v20.0/${id}/media_publish?creation_id=${containerId}&access_token=${accessToken}&field=id`,
          {
            method: 'POST',
          }
        )
      ).json();

      containerIdGlobal = mediaId;

      const { permalink } = await (
        await this.fetch(
          `https://${type}/v20.0/${mediaId}?fields=permalink&access_token=${accessToken}`
        )
      ).json();

      arr.push({
        id: firstPost.id,
        postId: mediaId,
        releaseURL: permalink,
        status: 'success',
      });

      linkGlobal = permalink;
    }

    for (const post of theRest) {
      const { id: commentId } = await (
        await this.fetch(
          `https://${type}/v20.0/${containerIdGlobal}/comments?message=${encodeURIComponent(
            post.message
          )}&access_token=${accessToken}`,
          {
            method: 'POST',
          }
        )
      ).json();

      arr.push({
        id: firstPost.id,
        postId: commentId,
        releaseURL: linkGlobal,
        status: 'success',
      });
    }

    return arr;
  }

  private setTitle(name: string) {
    switch (name) {
      case "likes": {
        return 'Likes';
      }

      case "followers": {
        return 'Followers';
      }

      case "reach": {
        return 'Reach';
      }

      case "follower_count": {
        return 'Follower Count';
      }

      case "views": {
        return 'Views';
      }

      case "comments": {
        return 'Comments';
      }

      case "shares": {
        return 'Shares';
      }

      case "saves": {
        return 'Saves';
      }

      case "replies": {
        return 'Replies';
      }
    }

    return "";
  }

  async analytics(
    id: string,
    accessToken: string,
    date: number,
    type = 'graph.facebook.com'
  ): Promise<AnalyticsData[]> {
    const until = dayjs().endOf('day').unix();
    const since = dayjs().subtract(date, 'day').unix();

    const { data, ...all } = await (
      await this.fetch(
        `https://${type}/v21.0/${id}/insights?metric=follower_count,reach&access_token=${accessToken}&period=day&since=${since}&until=${until}`
      )
    ).json();

    const { data: data2, ...all2 } = await (
      await this.fetch(
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
          {
            total: d.total_value.value,
            date: dayjs().add(1, 'day').format('YYYY-MM-DD'),
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
}
