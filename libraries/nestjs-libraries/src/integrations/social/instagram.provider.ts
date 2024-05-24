import {
  AuthTokenDetails,
  PostDetails,
  PostResponse,
  SocialProvider,
} from '@gitroom/nestjs-libraries/integrations/social/social.integrations.interface';
import { makeId } from '@gitroom/nestjs-libraries/services/make.is';
import { timer } from '@gitroom/helpers/utils/timer';

export class InstagramProvider implements SocialProvider {
  identifier = 'instagram';
  name = 'Instagram';
  isBetweenSteps = true;

  async refreshToken(refresh_token: string): Promise<AuthTokenDetails> {
    const { access_token, expires_in, ...all } = await (
      await fetch(
        'https://graph.facebook.com/v20.0/oauth/access_token' +
          '?grant_type=fb_exchange_token' +
          `&client_id=${process.env.FACEBOOK_APP_ID}` +
          `&client_secret=${process.env.FACEBOOK_APP_SECRET}` +
          `&fb_exchange_token=${refresh_token}`
      )
    ).json();

    const {
      data: {
        id,
        name,
        picture: {
          data: { url },
        },
      },
    } = await (
      await fetch(
        `https://graph.facebook.com/v20.0/me/accounts?fields=id,username,name,picture&access_token=${access_token}`
      )
    ).json();

    const {
      instagram_business_account: { id: instagramId },
    } = await (
      await fetch(
        `https://graph.facebook.com/v20.0/${id}?fields=instagram_business_account&access_token=${access_token}`
      )
    ).json();

    return {
      id: instagramId,
      name,
      accessToken: access_token,
      refreshToken: access_token,
      expiresIn: expires_in,
      picture: url,
      username: '',
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
        `&scope=${encodeURIComponent(
          'instagram_basic,pages_show_list,pages_read_engagement,business_management,instagram_content_publish,instagram_manage_comments'
        )}`,
      codeVerifier: makeId(10),
      state,
    };
  }

  async authenticate(params: { code: string; codeVerifier: string }) {
    const getAccessToken = await (
      await fetch(
        'https://graph.facebook.com/v20.0/oauth/access_token' +
          `?client_id=${process.env.FACEBOOK_APP_ID}` +
          `&redirect_uri=${encodeURIComponent(
            `${process.env.FRONTEND_URL}/integrations/social/instagram`
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

    const {
      id,
      name,
      picture: {
        data: { url },
      },
    } = await (
      await fetch(
        `https://graph.facebook.com/v20.0/me?fields=id,name,picture&access_token=${access_token}`
      )
    ).json();

    return {
      id,
      name,
      accessToken: access_token,
      refreshToken: access_token,
      expiresIn: expires_in,
      picture: url,
      username: '',
    };
  }

  async pages(accessToken: string) {
    const { data } = await (
      await fetch(
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
              await fetch(
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
    const { access_token } = await (
      await fetch(
        `https://graph.facebook.com/v20.0/${data.pageId}?fields=access_token,name,picture.type(large)&access_token=${accessToken}`
      )
    ).json();

    const { id, name, profile_picture_url } = await (
      await fetch(
        `https://graph.facebook.com/v20.0/${data.id}?fields=name,profile_picture_url&access_token=${accessToken}`
      )
    ).json();

    return {
      id,
      name,
      picture: profile_picture_url,
      access_token,
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
          firstPost.media?.length === 1 ? `&caption=${firstPost.message}` : ``;
        const isCarousel =
          (firstPost?.media?.length || 0) > 1 ? `&is_carousel_item=true` : ``;
        const mediaType =
          m.path.indexOf('.mp4') > -1
            ? firstPost?.media?.length === 1
              ? `video_url=${m.url}&media_type=REELS`
              : `video_url=${m.url}&media_type=VIDEO`
            : `image_url=${m.url}`;
        const { id: photoId } = await (
          await fetch(
            `https://graph.facebook.com/v20.0/${id}/media?${mediaType}${caption}${isCarousel}&access_token=${accessToken}`,
            {
              method: 'POST',
            }
          )
        ).json();

        let status = 'IN_PROGRESS';
        while (status === 'IN_PROGRESS') {
          const { status_code } = await (
            await fetch(
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
      const { id: mediaId, ...all } = await (
        await fetch(
          `https://graph.facebook.com/v20.0/${id}/media_publish?creation_id=${medias[0]}&access_token=${accessToken}&field=id`,
          {
            method: 'POST',
          }
        )
      ).json();

      console.log(all);

      containerIdGlobal = mediaId;

      const { permalink } = await (
        await fetch(
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
        await fetch(
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
          await fetch(
            `https://graph.facebook.com/v20.0/${containerId}?fields=status_code&access_token=${accessToken}`
          )
        ).json();
        await timer(3000);
        status = status_code;
      }

      const { id: mediaId, ...all4 } = await (
        await fetch(
          `https://graph.facebook.com/v20.0/${id}/media_publish?creation_id=${containerId}&access_token=${accessToken}&field=id`,
          {
            method: 'POST',
          }
        )
      ).json();

      containerIdGlobal = mediaId;

      const { permalink } = await (
        await fetch(
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
      const { id: commentId, ...all } = await (
        await fetch(
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
}
