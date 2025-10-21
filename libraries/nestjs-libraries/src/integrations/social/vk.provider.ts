import {
  AuthTokenDetails,
  PostDetails,
  PostResponse,
  SocialProvider,
} from '@gitroom/nestjs-libraries/integrations/social/social.integrations.interface';
import { makeId } from '@gitroom/nestjs-libraries/services/make.is';
import dayjs from 'dayjs';
import { SocialAbstract } from '@gitroom/nestjs-libraries/integrations/social.abstract';
import { createHash, randomBytes } from 'crypto';
import axios from 'axios';
import FormDataNew from 'form-data';
import mime from 'mime-types';

export class VkProvider extends SocialAbstract implements SocialProvider {
  override maxConcurrentJob = 2; // VK has moderate API limits
  identifier = 'vk';
  name = 'VK';
  isBetweenSteps = false;
  scopes = [
    'vkid.personal_info',
    'email',
    'wall',
    'status',
    'docs',
    'photos',
    'video',
  ];

  editor = 'normal' as const;
  maxLength() {
    return 2048;
  }

  async refreshToken(refresh: string): Promise<AuthTokenDetails> {
    const [oldRefreshToken, device_id] = refresh.split('&&&&');
    const formData = new FormData();
    formData.append('grant_type', 'refresh_token');
    formData.append('refresh_token', oldRefreshToken);
    formData.append('client_id', process.env.VK_ID!);
    formData.append('device_id', device_id);
    formData.append('state', makeId(32));
    formData.append('scope', this.scopes.join(' '));

    const { access_token, refresh_token, expires_in } = await (
      await this.fetch('https://id.vk.com/oauth2/auth', {
        method: 'POST',
        body: formData,
      })
    ).json();

    const newFormData = new FormData();
    newFormData.append('client_id', process.env.VK_ID!);
    newFormData.append('access_token', access_token);

    const {
      user: { user_id, first_name, last_name, avatar },
    } = await (
      await this.fetch('https://id.vk.com/oauth2/user_info', {
        method: 'POST',
        body: newFormData,
      })
    ).json();

    return {
      id: user_id,
      name: first_name + ' ' + last_name,
      accessToken: access_token,
      refreshToken: refresh_token + '&&&&' + device_id,
      expiresIn: dayjs().add(expires_in, 'seconds').unix() - dayjs().unix(),
      picture: avatar || '',
      username: first_name.toLowerCase(),
    };
  }

  async generateAuthUrl() {
    const state = makeId(32);
    const codeVerifier = randomBytes(64).toString('base64url');
    const challenge = Buffer.from(
      createHash('sha256').update(codeVerifier).digest()
    )
      .toString('base64')
      .replace(/=*$/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

    return {
      url:
        'https://id.vk.com/authorize' +
        `?response_type=code` +
        `&client_id=${process.env.VK_ID}` +
        `&code_challenge_method=S256` +
        `&code_challenge=${challenge}` +
        `&redirect_uri=${encodeURIComponent(
          `${
            process?.env.FRONTEND_URL?.indexOf('https') == -1
              ? `https://redirectmeto.com/${process?.env.FRONTEND_URL}`
              : `${process?.env.FRONTEND_URL}`
          }/integrations/social/vk`
        )}` +
        `&state=${state}` +
        `&scope=${encodeURIComponent(this.scopes.join(' '))}`,
      codeVerifier,
      state,
    };
  }

  async authenticate(params: {
    code: string;
    codeVerifier: string;
    refresh?: string;
  }) {
    const [code, device_id] = params.code.split('&&&&');

    const formData = new FormData();
    formData.append('client_id', process.env.VK_ID!);
    formData.append('grant_type', 'authorization_code');
    formData.append('code_verifier', params.codeVerifier);
    formData.append('device_id', device_id);
    formData.append('code', code);
    formData.append(
      'redirect_uri',
      `${
        process?.env.FRONTEND_URL?.indexOf('https') == -1
          ? `https://redirectmeto.com/${process?.env.FRONTEND_URL}`
          : `${process?.env.FRONTEND_URL}`
      }/integrations/social/vk`
    );

    const { access_token, scope, refresh_token, expires_in } = await (
      await this.fetch('https://id.vk.com/oauth2/auth', {
        method: 'POST',
        body: formData,
      })
    ).json();

    const newFormData = new FormData();
    newFormData.append('client_id', process.env.VK_ID!);
    newFormData.append('access_token', access_token);

    const {
      user: { user_id, first_name, last_name, avatar },
    } = await (
      await this.fetch('https://id.vk.com/oauth2/user_info', {
        method: 'POST',
        body: newFormData,
      })
    ).json();

    return {
      id: user_id,
      name: first_name + ' ' + last_name,
      accessToken: access_token,
      refreshToken: refresh_token + '&&&&' + device_id,
      expiresIn: dayjs().add(expires_in, 'seconds').unix() - dayjs().unix(),
      picture: avatar || '',
      username: first_name.toLowerCase(),
    };
  }

  async post(
    userId: string,
    accessToken: string,
    postDetails: PostDetails[]
  ): Promise<PostResponse[]> {
    let replyTo = '';
    const values: PostResponse[] = [];

    const uploading = await Promise.all(
      postDetails.map(async (post) => {
        return await Promise.all(
          (post?.media || []).map(async (media) => {
            const all = await (
              await this.fetch(
                media.path.indexOf('mp4') > -1
                  ? `https://api.vk.com/method/video.save?access_token=${accessToken}&v=5.251`
                  : `https://api.vk.com/method/photos.getWallUploadServer?owner_id=${userId}&access_token=${accessToken}&v=5.251`
              )
            ).json();

            const { data } = await axios.get(media.path!, {
              responseType: 'stream',
            });

            const slash = media.path.split('/').at(-1);

            const formData = new FormDataNew();
            formData.append('photo', data, {
              filename: slash,
              contentType: mime.lookup(slash!) || '',
            });
            const value = (
              await axios.post(all.response.upload_url, formData, {
                headers: {
                  ...formData.getHeaders(),
                },
              })
            ).data;

            if (media.path.indexOf('mp4') > -1) {
              return {
                id: all.response.video_id,
                type: 'video',
              };
            }

            const formSend = new FormData();
            formSend.append('photo', value.photo);
            formSend.append('server', value.server);
            formSend.append('hash', value.hash);

            const { id } = (
              await (
                await fetch(
                  `https://api.vk.com/method/photos.saveWallPhoto?access_token=${accessToken}&v=5.251`,
                  {
                    method: 'POST',
                    body: formSend,
                  }
                )
              ).json()
            ).response[0];

            return {
              id,
              type: 'photo',
            };
          })
        );
      })
    );

    let i = 0;
    for (const post of postDetails) {
      const list = uploading?.[i] || [];

      const body = new FormData();
      body.append('message', post.message);
      if (replyTo) {
        body.append('post_id', replyTo);
      }

      if (list.length) {
        body.append(
          'attachments',
          list.map((p) => `${p.type}${userId}_${p.id}`).join(',')
        );
      }

      const { response, ...all } = await (
        await this.fetch(
          `https://api.vk.com/method/${
            replyTo ? 'wall.createComment' : 'wall.post'
          }?v=5.251&access_token=${accessToken}&client_id=${process.env.VK_ID}`,
          {
            method: 'POST',
            body,
          }
        )
      ).json();

      values.push({
        id: post.id,
        postId: String(response?.post_id || response?.comment_id),
        releaseURL: `https://vk.com/feed?w=wall${userId}_${
          response?.post_id || replyTo
        }`,
        status: 'completed',
      });

      if (!replyTo) {
        replyTo = response.post_id;
      }

      i++;
    }

    return values;
  }
}
