import {
  AuthTokenDetails,
  PostDetails,
  PostResponse,
  SocialProvider,
} from '@gitroom/nestjs-libraries/integrations/social/social.integrations.interface';
import { makeId } from '@gitroom/nestjs-libraries/services/make.is';
import {
  BadBody,
  RefreshToken,
  SocialAbstract,
  ValidityMedia,
} from '@gitroom/nestjs-libraries/integrations/social.abstract';
import dayjs from 'dayjs';
import { Integration } from '@prisma/client';
import { AuthService } from '@gitroom/helpers/auth/auth.service';
import { LemmySettingsDto } from '@gitroom/nestjs-libraries/dtos/posts/providers-settings/lemmy.dto';
import { getSsrfSafeDispatcher } from '@gitroom/nestjs-libraries/dtos/webhooks/ssrf.safe.dispatcher';
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

  override handleErrors(
    body: string,
    status: number
  ):
    | { type: 'refresh-token' | 'bad-body' | 'retry'; value: string }
    | undefined {
    if (body.includes('rate_limit_error')) {
      return {
        type: 'retry',
        value: 'Lemmy rate limit reached, please try again later',
      };
    }

    if (body.includes('not_logged_in') || body.includes('incorrect_login')) {
      return {
        type: 'refresh-token',
        value: 'Lemmy session is no longer valid, please reconnect the channel',
      };
    }

    if (body.includes('site_ban') || body.includes('"error":"banned"')) {
      return {
        type: 'bad-body',
        value: 'This account is banned on the Lemmy instance',
      };
    }

    if (body.includes('couldnt_find_community')) {
      return {
        type: 'bad-body',
        value:
          'The selected Lemmy community no longer exists, please pick another one',
      };
    }

    if (body.includes('blocked_url')) {
      return {
        type: 'bad-body',
        value: 'The Lemmy instance blocks the URL in this post',
      };
    }

    if (body.includes('"error":"deleted"')) {
      return {
        type: 'bad-body',
        value: 'The selected Lemmy community or post was deleted',
      };
    }

    if (body.includes('"error":"locked"')) {
      return {
        type: 'bad-body',
        value: 'This Lemmy post is locked, comments cannot be added',
      };
    }

    return undefined;
  }

  override async checkValidity(
    items: Array<ValidityMedia[]>
  ): Promise<string | true> {
    const [firstItems] = items ?? [];
    if (
      firstItems?.length &&
      (firstItems?.[0]?.path?.indexOf?.('png') ?? -1) === -1 &&
      (firstItems?.[0]?.path?.indexOf?.('jpg') ?? -1) === -1 &&
      (firstItems?.[0]?.path?.indexOf?.('jpef') ?? -1) === -1 &&
      (firstItems?.[0]?.path?.indexOf?.('gif') ?? -1) === -1
    ) {
      return 'You can set only one picture for a cover';
    }
    return true;
  }

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
      url: state,
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
      // @ts-ignore - undici-only option; blocks SSRF to internal IPs
      dispatcher: getSsrfSafeDispatcher(),
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
          // @ts-ignore - undici-only option; blocks SSRF to internal IPs
          dispatcher: getSsrfSafeDispatcher(),
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

  private async getJwtAndService(integration: Integration): Promise<{ jwt: string; service: string }> {
    const body = JSON.parse(
      AuthService.fixedDecryption(integration.customInstanceDetails!)
    );

    const options = {
      // @ts-ignore - undici-only option; blocks SSRF to internal IPs
      dispatcher: getSsrfSafeDispatcher(),
      body: JSON.stringify({
        username_or_email: body.identifier,
        password: body.password,
      }),
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    };

    let login: Response;
    try {
      login = await this.fetch(body.service + '/api/v3/user/login', options);
    } catch (err) {
      // The request body holds the stored password, so the failure is rebuilt
      // without it before it reaches the Temporal history and the Errors table.
      const json = (err as any).details?.[0]?.json || '{}';
      if (err instanceof BadBody) {
        throw new BadBody(
          this.identifier,
          json,
          {} as BodyInit,
          err.message || 'Unknown Error'
        );
      }
      if (err instanceof RefreshToken) {
        throw new RefreshToken(
          this.identifier,
          json,
          {} as BodyInit,
          err.message || 'Unknown Error'
        );
      }
      throw err;
    }

    const { jwt } = await login.json();

    return { jwt, service: body.service };
  }

  async post(
    id: string,
    accessToken: string,
    postDetails: PostDetails<LemmySettingsDto>[],
    integration: Integration
  ): Promise<PostResponse[]> {
    const [firstPost] = postDetails;
    const { jwt, service } = await this.getJwtAndService(integration);

    const valueArray: PostResponse[] = [];

    for (const lemmy of firstPost.settings.subreddit) {
      const { post_view } = await (
        await this.fetch(service + '/api/v3/post', {
          // @ts-ignore - undici-only option; blocks SSRF to internal IPs
          dispatcher: getSsrfSafeDispatcher(),
          body: JSON.stringify({
            community_id: +lemmy.value.id,
            name: lemmy.value.title,
            body: firstPost.message,
            ...(lemmy.value.url
              ? {
                  url:
                    lemmy.value.url.indexOf('http') === -1
                      ? `https://${lemmy.value.url}`
                      : lemmy.value.url,
                }
              : {}),
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
        releaseURL: service + '/post/' + post_view.post.id,
        id: firstPost.id,
        status: 'published',
      });
    }

    return [
      {
        id: firstPost.id,
        postId: valueArray.map((p) => String(p.postId)).join(','),
        releaseURL: valueArray.map((p) => p.releaseURL).join(','),
        status: 'published',
      },
    ];
  }

  async comment(
    id: string,
    postId: string,
    lastCommentId: string | undefined,
    accessToken: string,
    postDetails: PostDetails<LemmySettingsDto>[],
    integration: Integration
  ): Promise<PostResponse[]> {
    const [commentPost] = postDetails;
    const { jwt, service } = await this.getJwtAndService(integration);

    // postId can be comma-separated if posted to multiple communities
    const postIds = postId.split(',');
    const valueArray: PostResponse[] = [];

    for (const singlePostId of postIds) {
      const { comment_view } = await (
        await this.fetch(service + '/api/v3/comment', {
          // @ts-ignore - undici-only option; blocks SSRF to internal IPs
          dispatcher: getSsrfSafeDispatcher(),
          body: JSON.stringify({
            post_id: +singlePostId,
            content: commentPost.message,
          }),
          method: 'POST',
          headers: {
            Authorization: `Bearer ${jwt}`,
            'Content-Type': 'application/json',
          },
        })
      ).json();

      valueArray.push({
        postId: String(comment_view.comment.id),
        releaseURL: service + '/comment/' + comment_view.comment.id,
        id: commentPost.id,
        status: 'published',
      });
    }

    return [
      {
        id: commentPost.id,
        postId: valueArray.map((p) => p.postId).join(','),
        releaseURL: valueArray.map((p) => p.releaseURL).join(','),
        status: 'published',
      },
    ];
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
    const { jwt, service } = await this.getJwtAndService(integration);

    const { communities } = await (
      await fetch(
        service + `/api/v3/search?type_=Communities&sort=Active&q=${data.word}`,
        {
          // @ts-ignore - undici-only option; blocks SSRF to internal IPs
          dispatcher: getSsrfSafeDispatcher(),
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
