import {
  AuthTokenDetails,
  PostDetails,
  PostResponse,
  SocialProvider,
} from '@gitroom/nestjs-libraries/integrations/social/social.integrations.interface';
import { makeId } from '@gitroom/nestjs-libraries/services/make.is';
import { PinterestSettingsDto } from '@gitroom/nestjs-libraries/dtos/posts/providers-settings/pinterest.dto';
import axios from 'axios';
import FormData from 'form-data';
import { timer } from '@gitroom/helpers/utils/timer';

export class PinterestProvider implements SocialProvider {
  identifier = 'pinterest';
  name = 'Pinterest';
  isBetweenSteps = false;

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

  async generateAuthUrl(refresh?: string) {
    const state = makeId(6);
    return {
      url: `https://www.pinterest.com/oauth/?client_id=${
        process.env.PINTEREST_CLIENT_ID
      }&redirect_uri=${encodeURIComponent(
        `${process.env.FRONTEND_URL}/integrations/social/pinterest${
          refresh ? `?refresh=${refresh}` : ''
        }`
      )}&response_type=code&scope=${encodeURIComponent(
        'boards:read,boards:write,pins:read,pins:write,user_accounts:read'
      )}&state=${state}`,
      codeVerifier: makeId(10),
      state,
    };
  }

  async authenticate(params: {
    code: string;
    codeVerifier: string;
    refresh: string;
  }) {
    const { access_token, refresh_token, expires_in } = await (
      await fetch('https://api-sandbox.pinterest.com/v5/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${Buffer.from(
            `${process.env.PINTEREST_CLIENT_ID}:${process.env.PINTEREST_CLIENT_SECRET}`
          ).toString('base64')}`,
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code: params.code,
          redirect_uri: `${process.env.FRONTEND_URL}/integrations/social/pinterest`,
        }),
      })
    ).json();

    const { id, profile_image, username } = await (
      await fetch('https://api-sandbox.pinterest.com/v5/user_account', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      })
    ).json();

    return {
      id: id,
      name: username,
      accessToken: access_token,
      refreshToken: refresh_token,
      expiresIn: expires_in,
      picture: profile_image,
      username,
    };
  }

  async boards(accessToken: string) {
    const { items } = await (
      await fetch('https://api-sandbox.pinterest.com/v5/boards', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })
    ).json();

    return (
      items?.map((item: any) => ({
        name: item.name,
        id: item.id,
      })) || []
    );
  }

  async post(
    id: string,
    accessToken: string,
    postDetails: PostDetails<PinterestSettingsDto>[]
  ): Promise<PostResponse[]> {
    let mediaId = '';
    if ((postDetails?.[0]?.media?.[0]?.path?.indexOf('mp4') || -1) > -1) {
      const { upload_url, media_id, upload_parameters } = await (
        await fetch('https://api-sandbox.pinterest.com/v5/media', {
          method: 'POST',
          body: JSON.stringify({
            media_type: 'video',
          }),
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
        })
      ).json();

      const { data, status } = await axios.get(
        postDetails?.[0]?.media?.[0]?.url!,
        {
          responseType: 'stream',
        }
      );

      const formData = Object.keys(upload_parameters)
        .filter((f) => f)
        .reduce((acc, key) => {
          acc.append(key, upload_parameters[key]);
          return acc;
        }, new FormData());

      formData.append('file', data);
      await axios.post(upload_url, formData);

      let statusCode = '';
      while (statusCode !== 'succeeded') {
        console.log('trying');
        const mediafile = await (
          await fetch(
            'https://api-sandbox.pinterest.com/v5/media/' + media_id,
            {
              method: 'GET',
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
            }
          )
        ).json();

        await timer(3000);
        statusCode = mediafile.status;
      }

      mediaId = media_id;
    }

    const mapImages = postDetails?.[0]?.media?.map((m) => ({
      url: m.url,
    }));

    try {
      const {
        id: pId,
        link,
        ...all
      } = await (
        await fetch('https://api-sandbox.pinterest.com/v5/pins', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...(postDetails?.[0]?.settings.link
              ? { link: postDetails?.[0]?.settings.link }
              : {}),
            ...(postDetails?.[0]?.settings.title
              ? { title: postDetails?.[0]?.settings.title }
              : {}),
            ...(postDetails?.[0]?.settings.description
              ? { title: postDetails?.[0]?.settings.description }
              : {}),
            ...(postDetails?.[0]?.settings.dominant_color
              ? { title: postDetails?.[0]?.settings.dominant_color }
              : {}),
            board_id: postDetails?.[0]?.settings.board,
            media_source: mediaId
              ? {
                  source_type: 'video_id',
                  media_id: mediaId,
                }
              : mapImages?.length === 1
              ? {
                  source_type: 'image_url',
                  url: mapImages?.[0]?.url,
                }
              : {
                  source_type: 'multiple_image_urls',
                  items: mapImages,
                },
          }),
        })
      ).json();

      return [
        {
          id,
          postId: pId,
          releaseURL: link,
          status: 'success',
        },
      ];
    } catch (err) {
      console.log(err);
      return [];
    }
  }
}
