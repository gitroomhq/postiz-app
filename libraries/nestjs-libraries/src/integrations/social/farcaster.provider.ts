import {
  AuthTokenDetails,
  PostDetails,
  PostResponse,
  SocialProvider,
} from '@gitroom/nestjs-libraries/integrations/social/social.integrations.interface';
import { makeId } from '@gitroom/nestjs-libraries/services/make.is';
import dayjs from 'dayjs';
import { SocialAbstract } from '@gitroom/nestjs-libraries/integrations/social.abstract';
import { NeynarAPIClient } from '@neynar/nodejs-sdk';
import { Integration } from '@prisma/client';
import { AuthService } from '@gitroom/helpers/auth/auth.service';
import { groupBy } from 'lodash';
import { FarcasterDto } from '@gitroom/nestjs-libraries/dtos/posts/providers-settings/farcaster.dto';
import { Tool } from '@gitroom/nestjs-libraries/integrations/tool.decorator';
import { Rules } from '@gitroom/nestjs-libraries/chat/rules.description.decorator';

const client = new NeynarAPIClient({
  apiKey: process.env.NEYNAR_SECRET_KEY || '00000000-000-0000-000-000000000000',
});

@Rules(
  'Farcaster/Warpcast can only accept pictures'
)
export class FarcasterProvider
  extends SocialAbstract
  implements SocialProvider
{
  identifier = 'wrapcast';
  name = 'Warpcast';
  isBetweenSteps = false;
  isWeb3 = true;
  scopes = [] as string[];
  override maxConcurrentJob = 3; // Farcaster has moderate limits
  editor = 'normal' as const;
  maxLength() {
    return 800;
  }
  dto = FarcasterDto;

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

  async generateAuthUrl() {
    const state = makeId(17);
    return {
      url: `${process.env.NEYNAR_CLIENT_ID}||${state}` || '',
      codeVerifier: makeId(10),
      state,
    };
  }

  async authenticate(params: {
    code: string;
    codeVerifier: string;
    refresh?: string;
  }) {
    const data = JSON.parse(Buffer.from(params.code, 'base64').toString());
    return {
      id: String(data.fid),
      name: data.display_name,
      accessToken: data.signer_uuid,
      refreshToken: '',
      expiresIn: dayjs().add(200, 'year').unix() - dayjs().unix(),
      picture: data?.pfp_url || '',
      username: data.username,
    };
  }

  async post(
    id: string,
    accessToken: string,
    postDetails: PostDetails<FarcasterDto>[]
  ): Promise<PostResponse[]> {
    const ids = [];
    const subreddit =
      !postDetails?.[0]?.settings?.subreddit ||
      postDetails?.[0]?.settings?.subreddit.length === 0
        ? [undefined]
        : postDetails?.[0]?.settings?.subreddit;

    for (const channel of subreddit) {
      let idHash = '';
      for (const post of postDetails) {
        const data = await client.publishCast({
          embeds:
            post?.media?.map((media) => ({
              url: media.path,
            })) || [],
          signerUuid: accessToken,
          text: post.message,
          ...(idHash ? { parent: idHash } : {}),
          ...(channel?.value?.id ? { channelId: channel?.value?.id } : {}),
        });
        idHash = data.cast.hash;

        ids.push({
          // @ts-ignore
          releaseURL: `https://warpcast.com/${data.cast.author.username}/${idHash}`,
          status: 'success',
          id: post.id,
          postId: data.cast.hash,
          // @ts-ignore
          author: data.cast.author.username,
        });
      }
    }

    const list = Object.values(groupBy(ids, (p) => p.id)).map((p) => ({
      id: p[0].id,
      postId: p.map((p) => String(p.postId)).join(','),
      releaseURL: p.map((p) => p.releaseURL).join(','),
      status: 'published',
    }));

    return list;
  }

  @Tool({
    description: 'Search channels',
    dataSchema: [{ key: 'word', type: 'string', description: 'Search word' }],
  })
  async subreddits(
    accessToken: string,
    data: any,
    id: string,
    integration: Integration
  ) {
    const search = await client.searchChannels({
      q: data.word,
      limit: 10,
    });

    return search.channels.map((p) => {
      return {
        title: p.name,
        name: p.name,
        id: p.id,
      };
    });
  }
}
