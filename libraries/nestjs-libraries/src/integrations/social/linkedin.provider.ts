import {
  AuthTokenDetails,
  PostDetails,
  PostResponse,
  SocialProvider,
} from '@gitroom/nestjs-libraries/integrations/social/social.integrations.interface';
import { makeId } from '@gitroom/nestjs-libraries/services/make.is';
import sharp from 'sharp';
import { lookup } from 'mime-types';
import { readOrFetch } from '@gitroom/helpers/utils/read.or.fetch';
import { SocialAbstract } from '@gitroom/nestjs-libraries/integrations/social.abstract';
import { Integration } from '@prisma/client';
import { PostPlug } from '@gitroom/helpers/decorators/post.plug';

export class LinkedinProvider extends SocialAbstract implements SocialProvider {
  identifier = 'linkedin';
  name = 'LinkedIn';
  oneTimeToken = true;

  isBetweenSteps = false;
  scopes = [
    'openid',
    'profile',
    'w_member_social',
    'r_basicprofile',
    'rw_organization_admin',
    'w_organization_social',
    'r_organization_social',
  ];
  refreshWait = true;

  async refreshToken(refresh_token: string): Promise<AuthTokenDetails> {
    const {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in,
    } = await (
      await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token,
          client_id: process.env.LINKEDIN_CLIENT_ID!,
          client_secret: process.env.LINKEDIN_CLIENT_SECRET!,
        }),
      })
    ).json();

    const { vanityName } = await (
      await this.fetch('https://api.linkedin.com/v2/me', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })
    ).json();

    const {
      name,
      sub: id,
      picture,
    } = await (
      await this.fetch('https://api.linkedin.com/v2/userinfo', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })
    ).json();

    return {
      id,
      accessToken,
      refreshToken,
      expiresIn: expires_in,
      name,
      picture,
      username: vanityName,
    };
  }

  async generateAuthUrl() {
    const state = makeId(6);
    const codeVerifier = makeId(30);
    const url = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${
      process.env.LINKEDIN_CLIENT_ID
    }&prompt=none&redirect_uri=${encodeURIComponent(
      `${process.env.FRONTEND_URL}/integrations/social/linkedin`
    )}&state=${state}&scope=${encodeURIComponent(this.scopes.join(' '))}`;
    return {
      url,
      codeVerifier,
      state,
    };
  }

  async authenticate(params: {
    code: string;
    codeVerifier: string;
    refresh?: string;
  }) {
    const body = new URLSearchParams();
    body.append('grant_type', 'authorization_code');
    body.append('code', params.code);
    body.append(
      'redirect_uri',
      `${process.env.FRONTEND_URL}/integrations/social/linkedin${
        params.refresh ? `?refresh=${params.refresh}` : ''
      }`
    );
    body.append('client_id', process.env.LINKEDIN_CLIENT_ID!);
    body.append('client_secret', process.env.LINKEDIN_CLIENT_SECRET!);

    const {
      access_token: accessToken,
      expires_in: expiresIn,
      refresh_token: refreshToken,
      scope,
    } = await (
      await this.fetch('https://www.linkedin.com/oauth/v2/accessToken', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body,
      })
    ).json();

    this.checkScopes(this.scopes, scope);

    const {
      name,
      sub: id,
      picture,
    } = await (
      await this.fetch('https://api.linkedin.com/v2/userinfo', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })
    ).json();

    const { vanityName } = await (
      await this.fetch('https://api.linkedin.com/v2/me', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })
    ).json();

    return {
      id,
      accessToken,
      refreshToken,
      expiresIn,
      name,
      picture,
      username: vanityName,
    };
  }

  async company(token: string, data: { url: string }) {
    const { url } = data;
    const getCompanyVanity = url.match(
      /^https?:\/\/(?:www\.)?linkedin\.com\/company\/([^/]+)\/?$/
    );
    if (!getCompanyVanity || !getCompanyVanity?.length) {
      throw new Error('Invalid LinkedIn company URL');
    }

    const { elements } = await (
      await this.fetch(
        `https://api.linkedin.com/v2/organizations?q=vanityName&vanityName=${getCompanyVanity[1]}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'X-Restli-Protocol-Version': '2.0.0',
            'LinkedIn-Version': '202501',
            Authorization: `Bearer ${token}`,
          },
        }
      )
    ).json();

    return {
      options: elements.map((e: { localizedName: string; id: string }) => ({
        label: e.localizedName,
        value: `@[${e.localizedName}](urn:li:organization:${e.id})`,
      }))?.[0],
    };
  }

  protected async uploadPicture(
    fileName: string,
    accessToken: string,
    personId: string,
    picture: any,
    type = 'personal' as 'company' | 'personal'
  ) {
    const {
      value: { uploadUrl, image, video, uploadInstructions, ...all },
    } = await (
      await this.fetch(
        `https://api.linkedin.com/v2/${
          fileName.indexOf('mp4') > -1 ? 'videos' : 'images'
        }?action=initializeUpload`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Restli-Protocol-Version': '2.0.0',
            'LinkedIn-Version': '202501',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            initializeUploadRequest: {
              owner:
                type === 'personal'
                  ? `urn:li:person:${personId}`
                  : `urn:li:organization:${personId}`,
              ...(fileName.indexOf('mp4') > -1
                ? {
                    fileSizeBytes: picture.length,
                    uploadCaptions: false,
                    uploadThumbnail: false,
                  }
                : {}),
            },
          }),
        }
      )
    ).json();

    const sendUrlRequest = uploadInstructions?.[0]?.uploadUrl || uploadUrl;
    const finalOutput = video || image;

    const etags = [];
    for (let i = 0; i < picture.length; i += 1024 * 1024 * 2) {
      const upload = await this.fetch(sendUrlRequest, {
        method: 'PUT',
        headers: {
          'X-Restli-Protocol-Version': '2.0.0',
          'LinkedIn-Version': '202501',
          Authorization: `Bearer ${accessToken}`,
          ...(fileName.indexOf('mp4') > -1
            ? { 'Content-Type': 'application/octet-stream' }
            : {}),
        },
        body: picture.slice(i, i + 1024 * 1024 * 2),
      });

      etags.push(upload.headers.get('etag'));
    }

    if (fileName.indexOf('mp4') > -1) {
      const a = await this.fetch(
        'https://api.linkedin.com/v2/videos?action=finalizeUpload',
        {
          method: 'POST',
          body: JSON.stringify({
            finalizeUploadRequest: {
              video,
              uploadToken: '',
              uploadedPartIds: etags,
            },
          }),
          headers: {
            'X-Restli-Protocol-Version': '2.0.0',
            'LinkedIn-Version': '202501',
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
    }

    return finalOutput;
  }

  protected fixText(text: string) {
    const pattern = /@\[.+?]\(urn:li:organization.+?\)/g;
    const matches = text.match(pattern) || [];
    const splitAll = text.split(pattern);
    const splitTextReformat = splitAll.map((p) => {
      return p
        .replace(/\\/g, '\\\\')
        .replace(/</g, '\\<')
        .replace(/>/g, '\\>')
        .replace(/#/g, '\\#')
        .replace(/~/g, '\\~')
        .replace(/_/g, '\\_')
        .replace(/\|/g, '\\|')
        .replace(/\[/g, '\\[')
        .replace(/]/g, '\\]')
        .replace(/\*/g, '\\*')
        .replace(/\(/g, '\\(')
        .replace(/\)/g, '\\)')
        .replace(/\{/g, '\\{')
        .replace(/}/g, '\\}')
        .replace(/@/g, '\\@');
    });

    const connectAll = splitTextReformat.reduce((all, current) => {
      const match = matches.shift();
      all.push(current);
      if (match) {
        all.push(match);
      }
      return all;
    }, [] as string[]);

    return connectAll.join('');
  }

  async post(
    id: string,
    accessToken: string,
    postDetails: PostDetails[],
    integration: Integration,
    type = 'personal' as 'company' | 'personal'
  ): Promise<PostResponse[]> {
    const [firstPost, ...restPosts] = postDetails;

    const uploadAll = (
      await Promise.all(
        postDetails.flatMap((p) =>
          p?.media?.flatMap(async (m) => {
            return {
              id: await this.uploadPicture(
                m.url,
                accessToken,
                id,
                m.url.indexOf('mp4') > -1
                  ? Buffer.from(await readOrFetch(m.url))
                  : await sharp(await readOrFetch(m.url), {
                      animated: lookup(m.url) === 'image/gif',
                    })
                      .toFormat('jpeg')
                      .resize({
                        width: 1000,
                      })
                      .toBuffer(),
                type
              ),
              postId: p.id,
            };
          })
        )
      )
    ).reduce((acc, val) => {
      if (!val?.id) {
        return acc;
      }
      acc[val.postId] = acc[val.postId] || [];
      acc[val.postId].push(val.id);

      return acc;
    }, {} as Record<string, string[]>);

    const media_ids = (uploadAll[firstPost.id] || []).filter((f) => f);

    const data = await this.fetch('https://api.linkedin.com/v2/posts', {
      method: 'POST',
      headers: {
        'X-Restli-Protocol-Version': '2.0.0',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        author:
          type === 'personal'
            ? `urn:li:person:${id}`
            : `urn:li:organization:${id}`,
        commentary: this.fixText(firstPost.message),
        visibility: 'PUBLIC',
        distribution: {
          feedDistribution: 'MAIN_FEED',
          targetEntities: [],
          thirdPartyDistributionChannels: [],
        },
        ...(media_ids.length > 0
          ? {
              content: {
                ...(media_ids.length === 0
                  ? {}
                  : media_ids.length === 1
                  ? {
                      media: {
                        id: media_ids[0],
                      },
                    }
                  : {
                      multiImage: {
                        images: media_ids.map((id) => ({
                          id,
                        })),
                      },
                    }),
              },
            }
          : {}),
        lifecycleState: 'PUBLISHED',
        isReshareDisabledByAuthor: false,
      }),
    });

    if (data.status !== 201 && data.status !== 200) {
      throw new Error('Error posting to LinkedIn');
    }

    const topPostId = data.headers.get('x-restli-id')!;

    const ids = [
      {
        status: 'posted',
        postId: topPostId,
        id: firstPost.id,
        releaseURL: `https://www.linkedin.com/feed/update/${topPostId}`,
      },
    ];
    for (const post of restPosts) {
      const { object } = await (
        await this.fetch(
          `https://api.linkedin.com/v2/socialActions/${decodeURIComponent(
            topPostId
          )}/comments`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
              actor:
                type === 'personal'
                  ? `urn:li:person:${id}`
                  : `urn:li:organization:${id}`,
              object: topPostId,
              message: {
                text: this.fixText(post.message),
              },
            }),
          }
        )
      ).json();

      ids.push({
        status: 'posted',
        postId: object,
        id: post.id,
        releaseURL: `https://www.linkedin.com/embed/feed/update/${object}`,
      });
    }

    return ids;
  }

  @PostPlug({
    identifier: 'linkedin-repost-post-users',
    title: 'Add Re-posters',
    description: 'Add accounts to repost your post',
    pickIntegration: ['linkedin', 'linkedin-page'],
    fields: [],
  })
  async repostPostUsers(
    integration: Integration,
    originalIntegration: Integration,
    postId: string,
    information: any,
    isPersonal = true
  ) {
    try {
      await this.fetch(`https://api.linkedin.com/v2/posts`, {
        body: JSON.stringify({
          author:
            (isPersonal ? 'urn:li:person:' : `urn:li:organization:`) +
            `${integration.internalId}`,
          commentary: '',
          visibility: 'PUBLIC',
          distribution: {
            feedDistribution: 'MAIN_FEED',
            targetEntities: [],
            thirdPartyDistributionChannels: [],
          },
          lifecycleState: 'PUBLISHED',
          isReshareDisabledByAuthor: false,
          reshareContext: {
            parent: postId,
          },
        }),
        method: 'POST',
        headers: {
          'X-Restli-Protocol-Version': '2.0.0',
          'Content-Type': 'application/json',
          'LinkedIn-Version': '202501',
          Authorization: `Bearer ${integration.token}`,
        },
      });
    } catch (err) {
      return;
    }
  }
}
