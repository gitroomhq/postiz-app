import {
  AuthTokenDetails,
  PostDetails,
  PostResponse,
  SocialProvider,
} from '@gitroom/nestjs-libraries/integrations/social/social.integrations.interface';
import { makeId } from '@gitroom/nestjs-libraries/services/make.is';
import { SocialAbstract } from '@gitroom/nestjs-libraries/integrations/social.abstract';
import { BskyAgent, RichText } from '@atproto/api';
import dayjs from 'dayjs';
import { Integration } from '@prisma/client';
import { AuthService } from '@gitroom/helpers/auth/auth.service';
import sharp from 'sharp';

export class BlueskyProvider extends SocialAbstract implements SocialProvider {
  identifier = 'bluesky';
  name = 'Bluesky';
  isBetweenSteps = false;
  scopes = ['write:statuses', 'profile', 'write:media'];

  async customFields() {
    return [
      {
        key: 'service',
        label: 'Service',
        defaultValue: 'https://bsky.social',
        validation: `/^(https?:\\/\\/)?((([a-zA-Z0-9\\-_]{1,256}\\.[a-zA-Z]{2,6})|(([0-9]{1,3}\\.){3}[0-9]{1,3}))(:[0-9]{1,5})?)(\\/[^\\s]*)?$/`,
        type: 'text' as const,
      },
      {
        key: 'identifier',
        label: 'Identifier',
        validation: `/^.{3,}$/`,
        type: 'text' as const,
      },
      {
        key: 'password',
        label: 'Password',
        validation: `/^.{3,}$/`,
        type: 'password' as const,
      },
    ];
  }

  async refreshToken(refreshToken: string): Promise<AuthTokenDetails> {
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

  async generateAuthUrl() {
    const state = makeId(6);
    return {
      url: '',
      codeVerifier: makeId(10),
      state,
    };
  }

  async authenticate(params: {
    code: string;
    codeVerifier: string;
    refresh?: string;
  }) {
    const body = JSON.parse(Buffer.from(params.code, 'base64').toString());

    const agent = new BskyAgent({
      service: body.service,
    });

    const {
      data: { accessJwt, refreshJwt, handle, did },
    } = await agent.login({
      identifier: body.identifier,
      password: body.password,
    });

    const profile = await agent.getProfile({
      actor: did,
    });

    return {
      refreshToken: refreshJwt,
      expiresIn: dayjs().add(100, 'years').unix() - dayjs().unix(),
      accessToken: accessJwt,
      id: did,
      name: profile.data.displayName!,
      picture: profile.data.avatar!,
      username: profile.data.handle!,
    };
  }

  async post(
    id: string,
    accessToken: string,
    postDetails: PostDetails[],
    integration: Integration
  ): Promise<PostResponse[]> {
    const body = JSON.parse(
      AuthService.fixedDecryption(integration.customInstanceDetails!)
    );
    const agent = new BskyAgent({
      service: body.service,
    });

    await agent.login({
      identifier: body.identifier,
      password: body.password,
    });

    let loadCid = '';
    let loadUri = '';
    const cidUrl = [] as { cid: string; url: string, rev: string }[];
    for (const post of postDetails) {
      const images = await Promise.all(
        post.media?.map(async (p) => {
          const a = await fetch(p.url);
          console.log(p.url);
          return await agent.uploadBlob(
            new Blob([
              await sharp(await (await fetch(p.url)).arrayBuffer())
                .resize({ width: 400 })
                .toBuffer(),
            ])
          );
        }) || []
      );

      const rt = new RichText({
        text: post.message,
      })

      await rt.detectFacets(agent)

      // @ts-ignore
      const { cid, uri, commit } = await agent.post({
        text: rt.text,
        facets: rt.facets,
        createdAt: new Date().toISOString(),
        ...(images.length
          ? {
              embed: {
                $type: 'app.bsky.embed.images',
                images: images.map((p) => ({
                  // can be an array up to 4 values
                  alt: 'image', // the alt text
                  image: p.data.blob,
                })),
              },
            }
          : {}),
        ...(loadCid
          ? {
              reply: {
                root: {
                  uri: loadUri,
                  cid: loadCid,
                },
                parent: {
                  uri: loadUri,
                  cid: loadCid,
                },
              },
            }
          : {}),
      });

      loadCid = loadCid || cid;
      loadUri = loadUri || uri;

      cidUrl.push({ cid, url: uri, rev: commit.rev });
    }

    return postDetails.map((p, index) => ({
      id: p.id,
      postId: cidUrl[index].cid,
      status: 'completed',
      releaseURL: `https://bsky.app/profile/${id}/post/${cidUrl[index].url.split('/').pop()}`,
    }));
  }
}
