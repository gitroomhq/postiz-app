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

export class LinkedinProvider implements SocialProvider {
  identifier = 'linkedin';
  name = 'LinkedIn';
  async refreshToken(refresh_token: string): Promise<AuthTokenDetails> {
    const { access_token: accessToken, refresh_token: refreshToken } = await (
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

    const {
      name,
      sub: id,
      picture,
    } = await (
      await fetch('https://api.linkedin.com/v2/userinfo', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })
    ).json();

    return {
      id,
      accessToken,
      refreshToken,
      name,
      picture,
    };
  }

  async generateAuthUrl() {
    const state = makeId(6);
    const codeVerifier = makeId(30);
    const url = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${
      process.env.LINKEDIN_CLIENT_ID
    }&redirect_uri=${encodeURIComponent(
      `${process.env.FRONTEND_URL}/integrations/social/linkedin`
    )}&state=${state}&scope=${encodeURIComponent(
      'openid profile w_member_social'
    )}`;
    return {
      url,
      codeVerifier,
      state,
    };
  }

  async authenticate(params: { code: string; codeVerifier: string }) {
    const body = new URLSearchParams();
    body.append('grant_type', 'authorization_code');
    body.append('code', params.code);
    body.append(
      'redirect_uri',
      `${process.env.FRONTEND_URL}/integrations/social/linkedin`
    );
    body.append('client_id', process.env.LINKEDIN_CLIENT_ID!);
    body.append('client_secret', process.env.LINKEDIN_CLIENT_SECRET!);

    const {
      access_token: accessToken,
      expires_in: expiresIn,
      refresh_token: refreshToken,
    } = await (
      await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body,
      })
    ).json();

    const {
      name,
      sub: id,
      picture,
    } = await (
      await fetch('https://api.linkedin.com/v2/userinfo', {
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
    };
  }

  private async uploadPicture(
    accessToken: string,
    personId: string,
    picture: any
  ) {
    const {
      value: { uploadUrl, image },
    } = await (
      await fetch(
        'https://api.linkedin.com/rest/images?action=initializeUpload',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Restli-Protocol-Version': '2.0.0',
            'LinkedIn-Version': '202402',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            initializeUploadRequest: {
              owner: `urn:li:person:${personId}`,
            },
          }),
        }
      )
    ).json();

    await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'X-Restli-Protocol-Version': '2.0.0',
        'LinkedIn-Version': '202402',
        Authorization: `Bearer ${accessToken}`,
      },
      body: picture,
    });

    return image;
  }

  async post(
    id: string,
    accessToken: string,
    postDetails: PostDetails[]
  ): Promise<PostResponse[]> {
    const [firstPost, ...restPosts] = postDetails;

    const uploadAll = (
      await Promise.all(
        postDetails.flatMap((p) =>
          p?.media?.flatMap(async (m) => {
            return {
              id: await this.uploadPicture(
                accessToken,
                id,
                await sharp(await readOrFetch(m.path), {
                  animated: lookup(m.path) === 'image/gif',
                })
                  .resize({
                    width: 1000,
                  })
                  .toBuffer()
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

    const data = await fetch('https://api.linkedin.com/v2/posts', {
      method: 'POST',
      headers: {
        'X-Restli-Protocol-Version': '2.0.0',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        author: `urn:li:person:${id}`,
        commentary: firstPost.message,
        visibility: 'PUBLIC',
        distribution: {
          feedDistribution: 'MAIN_FEED',
          targetEntities: [],
          thirdPartyDistributionChannels: [],
        },
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
        lifecycleState: 'PUBLISHED',
        isReshareDisabledByAuthor: false,
      }),
    });

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
        await fetch(
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
              actor: `urn:li:person:${id}`,
              object: topPostId,
              message: {
                text: post.message,
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
}
