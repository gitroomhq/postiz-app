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

export class InstagramProvider
  extends SocialAbstract
  implements SocialProvider
{
  identifier = 'instagram';
  name = 'Instagram';
  isBetweenSteps = true;
  scopes = [
    'instagram_basic',
    'pages_show_list',
    'pages_read_engagement',
    'business_management',
    'instagram_content_publish',
    'instagram_manage_comments',
    'instagram_manage_insights',
  ];

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
    postDetails: PostDetails[]
  ): Promise<PostResponse[]> {
    const [firstPost, ...theRest] = postDetails;

    const medias = await Promise.all(
      firstPost?.media?.map(async (m) => {
        const caption =
          firstPost.media?.length === 1
            ? `&caption=${encodeURIComponent(firstPost.message)}`
            : ``;
        const isCarousel =
          (firstPost?.media?.length || 0) > 1 ? `&is_carousel_item=true` : ``;
        const mediaType =
          m.url.indexOf('.mp4') > -1
            ? firstPost?.media?.length === 1
              ? `video_url=${m.url}&media_type=REELS`
              : `video_url=${m.url}&media_type=VIDEO`
            : `image_url=${m.url}`;

        const { id: photoId } = await (
          await this.fetch(
            `https://graph.facebook.com/v20.0/${id}/media?${mediaType}${isCarousel}&access_token=${accessToken}${caption}`,
            {
              method: 'POST',
            }
          )
        ).json();

        let status = 'IN_PROGRESS';
        while (status === 'IN_PROGRESS') {
          const { status_code } = await (
            await this.fetch(
              `https://graph.facebook.com/v20.0/${photoId}?access_token=${accessToken}&fields=status_code`
            )
          ).json();
          await timer(3000);
          status = status_code;
        }

        return photoId;
      }) || []
    );

    const arr = [];

    let containerIdGlobal = '';
    let linkGlobal = '';
    if (medias.length === 1) {
      const { id: mediaId } = await (
        await this.fetch(
          `https://graph.facebook.com/v20.0/${id}/media_publish?creation_id=${medias[0]}&access_token=${accessToken}&field=id`,
          {
            method: 'POST',
          }
        )
      ).json();

      containerIdGlobal = mediaId;

      const { permalink } = await (
        await this.fetch(
          `https://graph.facebook.com/v20.0/${mediaId}?fields=permalink&access_token=${accessToken}`
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
          `https://graph.facebook.com/v20.0/${id}/media?caption=${encodeURIComponent(
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
            `https://graph.facebook.com/v20.0/${containerId}?fields=status_code&access_token=${accessToken}`
          )
        ).json();
        await timer(3000);
        status = status_code;
      }

      const { id: mediaId, ...all4 } = await (
        await this.fetch(
          `https://graph.facebook.com/v20.0/${id}/media_publish?creation_id=${containerId}&access_token=${accessToken}&field=id`,
          {
            method: 'POST',
          }
        )
      ).json();

      containerIdGlobal = mediaId;

      const { permalink } = await (
        await this.fetch(
          `https://graph.facebook.com/v20.0/${mediaId}?fields=permalink&access_token=${accessToken}`
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
          `https://graph.facebook.com/v20.0/${containerIdGlobal}/comments?message=${encodeURIComponent(
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

  async analytics(
    id: string,
    accessToken: string,
    date: number
  ): Promise<AnalyticsData[]> {
    const until = dayjs().endOf('day').unix();
    const since = dayjs().subtract(date, 'day').unix();

    const { data, ...all } = await (
      await fetch(
        `https://graph.facebook.com/v20.0/${id}/insights?metric=follower_count,impressions,reach,profile_views&access_token=${accessToken}&period=day&since=${since}&until=${until}`
      )
    ).json();

    return (
      data?.map((d: any) => ({
        label: d.title,
        percentageChange: 5,
        data: d.values.map((v: any) => ({
          total: v.value,
          date: dayjs(v.end_time).format('YYYY-MM-DD'),
        })),
      })) || []
    );
  }
}
