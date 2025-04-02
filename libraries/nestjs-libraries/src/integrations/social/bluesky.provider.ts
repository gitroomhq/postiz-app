import {
  AuthTokenDetails,
  PostDetails,
  PostResponse,
  SocialProvider,
} from '@gitroom/nestjs-libraries/integrations/social/social.integrations.interface';
import { makeId } from '@gitroom/nestjs-libraries/services/make.is';
import {
  RefreshToken,
  SocialAbstract,
} from '@gitroom/nestjs-libraries/integrations/social.abstract';
import { BskyAgent, RichText } from '@atproto/api';
import dayjs from 'dayjs';
import { Integration } from '@prisma/client';
import { AuthService } from '@gitroom/helpers/auth/auth.service';
import sharp from 'sharp';
import { Plug } from '@gitroom/helpers/decorators/plug.decorator';
import { timer } from '@gitroom/helpers/utils/timer';
import axios from 'axios';

async function reduceImageBySize(url: string, maxSizeKB = 976) {
  try {
    // Fetch the image from the URL
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    let imageBuffer = Buffer.from(response.data);

    // Use sharp to get the metadata of the image
    const metadata = await sharp(imageBuffer).metadata();
    let width = metadata.width!;
    let height = metadata.height!;

    // Resize iteratively until the size is below the threshold
    while (imageBuffer.length / 1024 > maxSizeKB) {
      width = Math.floor(width * 0.9); // Reduce dimensions by 10%
      height = Math.floor(height * 0.9);

      // Resize the image
      const resizedBuffer = await sharp(imageBuffer)
        .resize({ width, height })
        .toBuffer();

      imageBuffer = resizedBuffer;

      if (width < 10 || height < 10) break; // Prevent overly small dimensions
    }

    return imageBuffer;
  } catch (error) {
    console.error('Error processing image:', error);
    throw error;
  }
}

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
        validation: `/^.+$/`,
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

    try {
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
    } catch (e) {
      return 'Invalid credentials';
    }
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

    try {
      await agent.login({
        identifier: body.identifier,
        password: body.password,
      });
    } catch (err) {
      throw new RefreshToken('bluesky', JSON.stringify(err), {} as BodyInit);
    }

    let loadCid = '';
    let loadUri = '';
    const cidUrl = [] as { cid: string; url: string; rev: string }[];
    for (const post of postDetails) {
      const images = await Promise.all(
        post.media
          ?.filter((p) => p.url.indexOf('mp4') === -1)
          .map(async (p) => {
            return await agent.uploadBlob(
              new Blob([await reduceImageBySize(p.url)])
            );
          }) || []
      );

      const rt = new RichText({
        text: post.message,
      });

      await rt.detectFacets(agent);

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
                  // alt: 'image', // the alt text - commented this out for now until there is a way to set this from within Postiz
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
      postId: cidUrl[index].url,
      status: 'completed',
      releaseURL: `https://bsky.app/profile/${id}/post/${cidUrl[index].url
        .split('/')
        .pop()}`,
    }));
  }

  @Plug({
    identifier: 'bluesky-autoRepostPost',
    title: 'Auto Repost Posts',
    description:
      'When a post reached a certain number of likes, repost it to increase engagement (1 week old posts)',
    runEveryMilliseconds: 21600000,
    totalRuns: 3,
    fields: [
      {
        name: 'likesAmount',
        type: 'number',
        placeholder: 'Amount of likes',
        description: 'The amount of likes to trigger the repost',
        validation: /^\d+$/,
      },
    ],
  })
  async autoRepostPost(
    integration: Integration,
    id: string,
    fields: { likesAmount: string }
  ) {
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

    const getThread = await agent.getPostThread({
      uri: id,
      depth: 0,
    });

    // @ts-ignore
    if (getThread.data.thread.post?.likeCount >= +fields.likesAmount) {
      await timer(2000);
      await agent.repost(
        // @ts-ignore
        getThread.data.thread.post?.uri,
        // @ts-ignore
        getThread.data.thread.post?.cid
      );
      return true;
    }

    return true;
  }

  @Plug({
    identifier: 'bluesky-autoPlugPost',
    title: 'Auto plug post',
    description:
      'When a post reached a certain number of likes, add another post to it so you followers get a notification about your promotion',
    runEveryMilliseconds: 21600000,
    totalRuns: 3,
    fields: [
      {
        name: 'likesAmount',
        type: 'number',
        placeholder: 'Amount of likes',
        description: 'The amount of likes to trigger the repost',
        validation: /^\d+$/,
      },
      {
        name: 'post',
        type: 'richtext',
        placeholder: 'Post to plug',
        description: 'Message content to plug',
        validation: /^[\s\S]{3,}$/g,
      },
    ],
  })
  async autoPlugPost(
    integration: Integration,
    id: string,
    fields: { likesAmount: string; post: string }
  ) {
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

    const getThread = await agent.getPostThread({
      uri: id,
      depth: 0,
    });

    // @ts-ignore
    if (getThread.data.thread.post?.likeCount >= +fields.likesAmount) {
      await timer(2000);
      const rt = new RichText({
        text: fields.post,
      });

      await agent.post({
        text: rt.text,
        facets: rt.facets,
        createdAt: new Date().toISOString(),
        reply: {
          root: {
            // @ts-ignore
            uri: getThread.data.thread.post?.uri,
            // @ts-ignore
            cid: getThread.data.thread.post?.cid,
          },
          parent: {
            // @ts-ignore
            uri: getThread.data.thread.post?.uri,
            // @ts-ignore
            cid: getThread.data.thread.post?.cid,
          },
        },
      });
      return true;
    }

    return true;
  }
}
