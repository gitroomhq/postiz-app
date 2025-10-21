import {
  AuthTokenDetails,
  PostDetails,
  PostResponse,
  SocialProvider,
} from '@gitroom/nestjs-libraries/integrations/social/social.integrations.interface';
import { makeId } from '@gitroom/nestjs-libraries/services/make.is';
import { SocialAbstract } from '@gitroom/nestjs-libraries/integrations/social.abstract';
import dayjs from 'dayjs';
import { Integration } from '@prisma/client';
import { AuthService } from '@gitroom/helpers/auth/auth.service';
import { LemmySettingsDto } from '@gitroom/nestjs-libraries/dtos/posts/providers-settings/lemmy.dto';
import { groupBy } from 'lodash';
import { Tool } from '@gitroom/nestjs-libraries/integrations/tool.decorator';

export class LemmyProvider extends SocialAbstract implements SocialProvider {
  override maxConcurrentJob = 3; // Lemmy instances typically have moderate limits
  identifier = 'lemmy';
  name = 'Lemmy';
  isBetweenSteps = false;
  scopes = [] as string[];
  editor = 'normal' as const;
  maxLength() {
    return 10000;
  }
  dto = LemmySettingsDto;

  async customFields() {
    return [
      {
        key: 'service',
        label: 'Service',
        defaultValue: 'https://lemmy.world',
        validation: `/^https?:\\/\\/(www\\.)?[-a-zA-Z0-9@:%._\\+~#=]{1,256}\\.[a-zA-Z0-9()]{1,6}\\b([-a-zA-Z0-9()@:%_\\+.~#?&//=]*)$/`,
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

    const load = await fetch(body.service + '/api/v3/user/login', {
      body: JSON.stringify({
        username_or_email: body.identifier,
        password: body.password,
      }),
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (load.status === 401) {
      return 'Invalid credentials';
    }

    const { jwt } = await load.json();

    try {
      const user = await (
        await fetch(body.service + `/api/v3/user?username=${body.identifier}`, {
          headers: {
            Authorization: `Bearer ${jwt}`,
          },
        })
      ).json();

      return {
        refreshToken: jwt!,
        expiresIn: dayjs().add(100, 'years').unix() - dayjs().unix(),
        accessToken: jwt!,
        id: String(user.person_view.person.id),
        name:
          user.person_view.person.display_name ||
          user.person_view.person.name ||
          '',
        picture: user?.person_view?.person?.avatar || '',
        username: body.identifier || '',
      };
    } catch (e) {
      console.log(e);
      return 'Invalid credentials';
    }
  }

  async post(
    id: string,
    accessToken: string,
    postDetails: PostDetails<LemmySettingsDto>[],
    integration: Integration
  ): Promise<PostResponse[]> {
    const [firstPost, ...restPosts] = postDetails;

    const body = JSON.parse(
      AuthService.fixedDecryption(integration.customInstanceDetails!)
    );

    const { jwt } = await (
      await fetch(body.service + '/api/v3/user/login', {
        body: JSON.stringify({
          username_or_email: body.identifier,
          password: body.password,
        }),
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })
    ).json();

    const valueArray: PostResponse[] = [];

    for (const lemmy of firstPost.settings.subreddit) {
      const { post_view, ...all } = await (
        await fetch(body.service + '/api/v3/post', {
          body: JSON.stringify({
            community_id: +lemmy.value.id,
            name: lemmy.value.title,
            body: firstPost.message,
            ...(lemmy.value.url ? { url: lemmy.value.url } : {}),
            ...(firstPost.media?.length
              ? { custom_thumbnail: firstPost.media[0].path }
              : {}),
            nsfw: false,
          }),
          method: 'POST',
          headers: {
            Authorization: `Bearer ${jwt}`,
            'Content-Type': 'application/json',
          },
        })
      ).json();

      valueArray.push({
        postId: post_view.post.id,
        releaseURL: body.service + '/post/' + post_view.post.id,
        id: firstPost.id,
        status: 'published',
      });

      for (const comment of restPosts) {
        const { comment_view } = await (
          await fetch(body.service + '/api/v3/comment', {
            body: JSON.stringify({
              post_id: post_view.post.id,
              content: comment.message,
            }),
            method: 'POST',
            headers: {
              Authorization: `Bearer ${jwt}`,
              'Content-Type': 'application/json',
            },
          })
        ).json();

        valueArray.push({
          postId: comment_view.post.id,
          releaseURL: body.service + '/comment/' + comment_view.comment.id,
          id: comment.id,
          status: 'published',
        });
      }
    }

    return Object.values(groupBy(valueArray, (p) => p.id)).map((p) => ({
      id: p[0].id,
      postId: p.map((p) => String(p.postId)).join(','),
      releaseURL: p.map((p) => p.releaseURL).join(','),
      status: 'published',
    }));
  }

  @Tool({
    description: 'Search for Lemmy communities by keyword',
    dataSchema: [
      {
        key: 'word',
        type: 'string',
        description: 'Keyword to search for',
      },
    ],
  })
  async subreddits(
    accessToken: string,
    data: any,
    id: string,
    integration: Integration
  ) {
    const body = JSON.parse(
      AuthService.fixedDecryption(integration.customInstanceDetails!)
    );

    const { jwt } = await (
      await fetch(body.service + '/api/v3/user/login', {
        body: JSON.stringify({
          username_or_email: body.identifier,
          password: body.password,
        }),
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })
    ).json();

    const { communities } = await (
      await fetch(
        body.service +
          `/api/v3/search?type_=Communities&sort=Active&q=${data.word}`,
        {
          headers: {
            Authorization: `Bearer ${jwt}`,
          },
        }
      )
    ).json();

    return communities.map((p: any) => ({
      title: p.community.title,
      name: p.community.title,
      id: p.community.id,
    }));
  }
}
