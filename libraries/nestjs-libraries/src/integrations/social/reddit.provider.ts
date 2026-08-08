import {
  AuthTokenDetails,
  PendingCheckResponse,
  PostDetails,
  PostResponse,
  SocialProvider,
} from '@gitroom/nestjs-libraries/integrations/social/social.integrations.interface';
import { makeId } from '@gitroom/nestjs-libraries/services/make.is';
import { RedditSettingsDto } from '@gitroom/nestjs-libraries/dtos/posts/providers-settings/reddit.dto';
import { timer } from '@gitroom/helpers/utils/timer';
import {
  BadBody,
  RefreshToken,
  SocialAbstract,
  ValidityMedia,
} from '@gitroom/nestjs-libraries/integrations/social.abstract';
import { lookup } from 'mime-types';
import FormDataUpload from 'form-data';
import { Tool } from '@gitroom/nestjs-libraries/integrations/tool.decorator';
import { Integration } from '@prisma/client';
import { hasExtension } from '@gitroom/helpers/utils/has.extension';

// Travels through the workflow history between postPending, checkPostStatus
// and finalizePost. The cursor makes every subreddit submit its own
// finalizePost call, and `armed` is the submit-in-flight handshake: set by
// checkPostStatus BEFORE finalizePost runs (the workflow commits it first), so
// an interrupted submit is detected by the next check instead of re-run.
type RedditPendingData = {
  subreddits: RedditSettingsDto['subreddit'];
  message: string;
  mediaPath?: string;
  mediaThumbnail?: string;
  cursor: number;
  results: { postId: string; releaseURL: string }[];
  armed?: {
    sr: string;
    title: string;
    // When this attempt was armed: bounds the listing lookup (so an older
    // post with the same title is never mistaken for this one) and the
    // resubmit guard (a timed-out finalize may still be running for up to
    // the 10-minute activity ceiling).
    armedAt: number;
    // Media submissions appear in the listing minutes after the submit
    // (Reddit creates them asynchronously), so their recovery lookups get a
    // longer grace before concluding the submit never landed.
    media: boolean;
    // true once Reddit accepted the submit (media posts answer with only a
    // websocket url) - the id is then recovered from the submitted listing,
    // and the submit must NEVER run again.
    submitted: boolean;
    lookups: number;
  };
};

export class RedditProvider extends SocialAbstract implements SocialProvider {
  override maxConcurrentJob = 1; // Reddit has strict rate limits (1 request per second)
  identifier = 'reddit';
  name = 'Reddit';
  isBetweenSteps = false;
  scopes = ['read', 'identity', 'submit', 'flair'];
  editor = 'normal' as const;
  dto = RedditSettingsDto;

  maxLength() {
    return 10000;
  }

  override async checkValidity(
    posts: Array<ValidityMedia[]>,
    settings: any
  ): Promise<string | true> {
    if (
      settings?.subreddit?.some(
        (p: any) => p?.value?.type === 'media' && posts?.[0]?.length !== 1
      )
    ) {
      return 'When posting a media post, you must attached exactly one media file.';
    }

    if (
      posts?.some((p) =>
        p?.some((a) => !a?.thumbnail && (a?.path?.indexOf?.('mp4') ?? -1) > -1)
      )
    ) {
      return 'You must attach a thumbnail to your video post.';
    }

    return true;
  }

  async refreshToken(refreshToken: string): Promise<AuthTokenDetails> {
    const { access_token: accessToken, expires_in: expiresIn } = await (
      await this.fetch('https://www.reddit.com/api/v1/access_token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${Buffer.from(
            `${process.env.REDDIT_CLIENT_ID}:${process.env.REDDIT_CLIENT_SECRET}`
          ).toString('base64')}`,
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
        }),
      })
    ).json();

    const { name, id, icon_img } = await (
      await this.fetch('https://oauth.reddit.com/api/v1/me', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })
    ).json();

    return {
      id,
      name,
      accessToken,
      refreshToken: refreshToken,
      expiresIn,
      picture: icon_img?.split?.('?')?.[0] || '',
      username: name,
    };
  }

  async generateAuthUrl() {
    const state = makeId(6);
    const codeVerifier = makeId(30);
    const url = `https://www.reddit.com/api/v1/authorize?client_id=${
      process.env.REDDIT_CLIENT_ID
    }&response_type=code&state=${state}&redirect_uri=${encodeURIComponent(
      `${process.env.FRONTEND_URL}/integrations/social/reddit`
    )}&duration=permanent&scope=${encodeURIComponent(this.scopes.join(' '))}`;
    return {
      url,
      codeVerifier,
      state,
    };
  }

  async authenticate(params: { code: string; codeVerifier: string }) {
    const {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: expiresIn,
      scope,
    } = await (
      await this.fetch('https://www.reddit.com/api/v1/access_token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${Buffer.from(
            `${process.env.REDDIT_CLIENT_ID}:${process.env.REDDIT_CLIENT_SECRET}`
          ).toString('base64')}`,
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code: params.code,
          redirect_uri: `${process.env.FRONTEND_URL}/integrations/social/reddit`,
        }),
      })
    ).json();

    this.checkScopes(this.scopes, scope);

    const { name, id, icon_img } = await (
      await this.fetch('https://oauth.reddit.com/api/v1/me', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })
    ).json();

    return {
      id,
      name,
      accessToken,
      refreshToken,
      expiresIn,
      picture: icon_img?.split?.('?')?.[0] || '',
      username: name,
    };
  }

  private async uploadFileToReddit(accessToken: string, path: string) {
    const mimeType = lookup(path);
    const formData = new FormData();
    formData.append('filepath', path.split('/').pop());
    formData.append('mimetype', mimeType || 'application/octet-stream');

    const {
      args: { action, fields },
    } = await (
      await this.fetch(
        'https://oauth.reddit.com/api/media/asset',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          body: formData,
        },
        'reddit',
        0,
        true
      )
    ).json();

    // Stream the file into Reddit's S3 form instead of buffering it in memory.
    // S3 requires the exact part length, which comes from a HEAD request.
    const fileSize = await this.mediaSize(path, this.identifier);
    const stream = await this.mediaStream(path, this.identifier);

    const upload = (fields as { name: string; value: string }[]).reduce(
      (acc, value) => {
        acc.append(value.name, value.value);
        return acc;
      },
      new FormDataUpload()
    );

    upload.append('file', stream, {
      filename: path.split('/').pop(),
      contentType: (mimeType as string) || 'application/octet-stream',
      knownLength: fileSize,
    });

    const d = await this.getSsrfSafeAxios().post('https:' + action, upload, {
      headers: upload.getHeaders(),
    });

    // S3 only echoes a <Location> body when the POST succeeds with 201; guard
    // the parse so an empty/unexpected body fails with a clear error instead
    // of a TypeError.
    const location = [
      ...String(d.data || '').matchAll(/<Location>(.*?)<\/Location>/g),
    ][0]?.[1];
    if (!location) {
      throw new BadBody(
        this.identifier,
        String(d.data || '{}'),
        Buffer.from('{}'),
        'Reddit media upload did not return a location'
      );
    }

    return location;
  }

  // Read-only recovery of a submission: the submit endpoint answers media
  // posts with only a websocket url, and an interrupted activity may have
  // submitted without us seeing the response - the user's newest submissions
  // answer both cases without ever re-submitting.
  private async findSubmittedPost(
    accessToken: string,
    username: string,
    sr: string,
    title: string,
    armedAt: number
  ): Promise<{ id: string; url: string } | undefined> {
    const { data } = await (
      await this.fetch(
        `https://oauth.reddit.com/user/${username}/submitted?limit=25&sort=new`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
        'reddit',
        0,
        true
      )
    ).json();

    // Only submissions created after this attempt was armed (with a minute of
    // clock slack): an older post with the same title in the same subreddit -
    // an earlier schedule, a template repost - must never be mistaken for
    // this one. Fall back to a one-hour window for pendingData that predates
    // the armedAt field.
    const cutoff = armedAt ? armedAt - 60 * 1000 : Date.now() - 60 * 60 * 1000;

    const found = (data?.children || []).find(
      (c: any) =>
        (c?.data?.subreddit || '').toLowerCase() === sr &&
        (!title || (c?.data?.title || '') === title) &&
        (c?.data?.created_utc || 0) * 1000 > cutoff
    );

    if (!found?.data?.id) {
      return undefined;
    }

    return {
      id: found.data.id,
      url: found.data.permalink
        ? `https://www.reddit.com${found.data.permalink}`
        : `https://www.reddit.com/r/${sr}`,
    };
  }

  private completedResponse(
    results: RedditPendingData['results']
  ): PendingCheckResponse {
    return {
      status: 'completed',
      postId: results
        .map((p) => p.postId)
        .filter(Boolean)
        .join(','),
      releaseURL: results
        .map((p) => p.releaseURL)
        .filter(Boolean)
        .join(','),
    };
  }

  async postPending(
    id: string,
    accessToken: string,
    postDetails: PostDetails<RedditSettingsDto>[]
  ): Promise<PostResponse[]> {
    const [post] = postDetails;

    // Nothing is submitted here: finalizePost publishes ONE subreddit per call
    // (advancing the cursor between calls), so a crashed activity can never
    // replay the whole loop - the old code restarted from the first subreddit
    // and duplicated every already-published one.
    return [
      {
        id: post.id,
        releaseURL: '',
        postId: '',
        status: 'pending',
        pendingData: {
          subreddits: post.settings.subreddit,
          message: post.message,
          mediaPath: post.media?.[0]?.path,
          mediaThumbnail: post.media?.[0]?.thumbnail,
          cursor: 0,
          results: [],
        } as RedditPendingData,
      },
    ];
  }

  override async checkPostStatus(
    accessToken: string,
    pendingData: RedditPendingData,
    integration: Integration
  ): Promise<PendingCheckResponse> {
    const data = { ...pendingData };

    // A previous finalizePost may have died mid-submit (or submitted a media
    // post that only answers over a websocket): ask Reddit what actually
    // happened before authorizing anything else.
    if (data.armed) {
      let found: { id: string; url: string } | undefined;

      // Legacy rows may have no username stored: the listing can never be
      // read, so fall straight through to the grace budget below.
      if (integration.profile) {
        try {
          found = await this.findSubmittedPost(
            accessToken,
            integration.profile,
            data.armed.sr,
            data.armed.title,
            data.armed.armedAt
          );
        } catch (err) {
          if (err instanceof RefreshToken) {
            throw err;
          }

          // A failed lookup still consumes the grace budget below: a
          // permanently broken listing must never wedge the post into
          // pending until the whole check budget burns down.
        }
      }

      if (found) {
        data.results = [
          ...data.results,
          { postId: found.id, releaseURL: found.url },
        ];
        data.cursor += 1;
        data.armed = undefined;
      } else if (data.armed.submitted) {
        // Reddit accepted this submit; media posts are created asynchronously
        // and can lag in the listing for minutes. Keep looking for the real
        // id (comments and webhooks need it), then accept without one rather
        // than ever re-submitting (which would duplicate the post).
        if (data.armed.lookups < 9) {
          data.armed = { ...data.armed, lookups: data.armed.lookups + 1 };
          return { status: 'pending', pendingData: data };
        }

        data.results = [
          ...data.results,
          {
            postId: '',
            releaseURL: `https://www.reddit.com/r/${data.armed.sr}`,
          },
        ];
        data.cursor += 1;
        data.armed = undefined;
      } else if (
        data.armed.media &&
        (Date.now() - data.armed.armedAt < 10 * 60 * 1000 ||
          data.armed.lookups < 9)
      ) {
        // A media finalize that timed out may STILL be running on a worker
        // (activities are not cancelled) for up to its 10-minute
        // startToCloseTimeout, and its accepted submit can appear in the
        // listing minutes later - never authorize a resubmit inside that
        // window. The wall-clock window alone is not enough: a real timeout
        // consumes it entirely before control returns, so the lookups floor
        // guarantees several minutes of listing checks AFTER the failure
        // regardless of how long the dead activity ran.
        data.armed = { ...data.armed, lookups: data.armed.lookups + 1 };
        return { status: 'pending', pendingData: data };
      } else if (!data.armed.media && data.armed.lookups < 1) {
        // Self/link posts appear in the listing instantly: one grace miss
        // covers listing lag.
        data.armed = { ...data.armed, lookups: data.armed.lookups + 1 };
        return { status: 'pending', pendingData: data };
      } else {
        // Armed but no accepted response was ever seen and the in-flight
        // window has passed: conclude the submit never landed and let
        // finalizePost run it again.
        data.armed = undefined;
      }
    }

    if (data.cursor >= (data.subreddits?.length || 0)) {
      return this.completedResponse(data.results);
    }

    // Arm the next subreddit BEFORE finalizePost submits it: the workflow
    // commits this state first, so if finalize dies mid-submit the next check
    // finds the armed marker and asks Reddit instead of resubmitting blindly.
    const value = data.subreddits[data.cursor].value;
    data.armed = {
      sr: value.subreddit.replace('/r/', '').toLowerCase(),
      title: value.title || '',
      armedAt: Date.now(),
      media: value.type === 'media',
      submitted: false,
      lookups: 0,
    };

    return { status: 'ready', pendingData: data };
  }

  override async finalizePost(
    accessToken: string,
    pendingData: RedditPendingData,
    integration: Integration
  ): Promise<PendingCheckResponse> {
    const data = { ...pendingData };
    const entry = data.subreddits?.[data.cursor];

    if (!entry || !data.armed) {
      // Nothing armed for this cursor: let the check re-derive the state.
      return { status: 'pending', pendingData: data };
    }

    const value = entry.value;
    const kind =
      value.type === 'media'
        ? hasExtension(data.mediaPath || '', 'mp4')
          ? 'video'
          : 'image'
        : value.type;

    const postData = {
      api_type: 'json',
      title: value.title || '',
      kind:
        ['link', 'self', 'image', 'video', 'videogif'].indexOf(kind) > -1
          ? kind
          : 'self',
      ...(value.flair ? { flair_id: value.flair.id } : {}),
      ...(value.type === 'link'
        ? {
            url: value.url,
          }
        : {}),
      ...(value.type === 'media'
        ? {
            url: await this.uploadFileToReddit(accessToken, data.mediaPath!),
            ...(hasExtension(data.mediaPath || '', 'mp4')
              ? {
                  video_poster_url: await this.uploadFileToReddit(
                    accessToken,
                    data.mediaThumbnail!
                  ),
                }
              : {}),
          }
        : {}),
      text: data.message,
      sr: value.subreddit.replace('/r/', '').toLowerCase(),
    };

    const all = await (
      await this.fetch('https://oauth.reddit.com/api/submit', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(postData),
      })
    ).json();

    // Reddit rejects submissions with a 200 and an errors array: surface the
    // real reason instead of failing later with an unknown outcome.
    if (all?.json?.errors?.length) {
      throw new BadBody(
        this.identifier,
        JSON.stringify(all),
        Buffer.from('{}'),
        `Reddit rejected the post to r/${postData.sr}: ${all.json.errors
          .map((e: any[]) => e?.[1] || e?.[0] || '')
          .join(', ')}`
      );
    }

    // Self/link posts answer with the created post directly.
    if (all?.json?.data?.id) {
      data.results = [
        ...data.results,
        {
          postId: all.json.data.id,
          releaseURL:
            all.json.data.url || `https://www.reddit.com/r/${postData.sr}`,
        },
      ];
      data.cursor += 1;
      data.armed = undefined;

      if (data.cursor >= data.subreddits.length) {
        return this.completedResponse(data.results);
      }

      return { status: 'pending', pendingData: data };
    }

    // Media posts only answer with a websocket url: mark the submit as
    // accepted, the next check recovers the post id from the submitted
    // listing - a held-open websocket has no place inside an activity.
    data.armed = { ...data.armed, submitted: true };
    return { status: 'pending', pendingData: data };
  }

  // Old blocking behavior, kept for workflow versions before v1.0.6 that still
  // run and don't know how to resolve a `pending` response - they submit every
  // subreddit inside the activity like before.
  async post(
    id: string,
    accessToken: string,
    postDetails: PostDetails<RedditSettingsDto>[],
    integration: Integration
  ): Promise<PostResponse[]> {
    const [response] = await this.postPending(id, accessToken, postDetails);

    let pendingData = response.pendingData;
    const started = Date.now();

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const check = await this.checkPostStatus(
        accessToken,
        pendingData,
        integration
      );

      if (check.status === 'ready') {
        const finalize = await this.finalizePost(
          accessToken,
          check.pendingData,
          integration
        );

        if (finalize.status === 'completed') {
          return [
            {
              id: response.id,
              postId: finalize.postId,
              releaseURL: finalize.releaseURL,
              status: 'published',
            },
          ];
        }

        pendingData = finalize.pendingData;
      } else if (check.status === 'completed') {
        return [
          {
            id: response.id,
            postId: check.postId,
            releaseURL: check.releaseURL,
            status: 'published',
          },
        ];
      } else {
        pendingData = check.pendingData;
      }

      // Cap below the 10-minute activity timeout of the old workflows using
      // this method: some subreddits may already be live at this point, so
      // timing the activity out (which retries and re-submits) is far worse
      // than failing here - the old websocket wait could hang forever.
      if (Date.now() - started > 8 * 60 * 1000) {
        throw new BadBody(
          this.identifier,
          '{}',
          Buffer.from('{}'),
          'Reddit took too long to answer, please check your account before posting again'
        );
      }

      // Keeps the old 5-second spacing between subreddit submissions.
      await timer(5000);
    }
  }

  async comment(
    id: string,
    postId: string,
    lastCommentId: string | undefined,
    accessToken: string,
    postDetails: PostDetails<RedditSettingsDto>[],
    integration: Integration
  ): Promise<PostResponse[]> {
    const [commentPost] = postDetails;

    // Reddit uses thing_id format like t3_xxx for posts
    const thingId = postId.startsWith('t3_') ? postId : `t3_${postId}`;

    const {
      json: {
        data: {
          things: [
            {
              data: { id: commentId, permalink },
            },
          ],
        },
      },
    } = await (
      await this.fetch('https://oauth.reddit.com/api/comment', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          text: commentPost.message,
          thing_id: thingId,
          api_type: 'json',
        }),
      })
    ).json();

    return [
      {
        postId: commentId,
        releaseURL: 'https://www.reddit.com' + permalink,
        id: commentPost.id,
        status: 'published',
      },
    ];
  }

  @Tool({
    description: 'Get list of subreddits with information',
    dataSchema: [
      {
        key: 'word',
        type: 'string',
        description: 'Search subreddit by string',
      },
    ],
  })
  async subreddits(accessToken: string, data: any) {
    const {
      data: { children },
    } = await (
      await this.fetch(
        `https://oauth.reddit.com/subreddits/search?show=public&q=${data.word}&sort=activity&show_users=false&limit=10`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
        'reddit',
        0,
        false
      )
    ).json();

    return children
      .filter(
        ({ data }: { data: any }) =>
          data.subreddit_type === 'public' && data.submission_type !== 'image'
      )
      .map(({ data: { title, url, id } }: any) => ({
        title,
        name: url,
        id,
      }));
  }

  private getPermissions(submissionType: string, allow_images: string) {
    const permissions = [];
    if (['any', 'self'].indexOf(submissionType) > -1) {
      permissions.push('self');
    }

    if (['any', 'link'].indexOf(submissionType) > -1) {
      permissions.push('link');
    }

    if (allow_images) {
      permissions.push('media');
    }

    return permissions;
  }

  @Tool({
    description: 'Get list of flairs and restrictions for a subreddit',
    dataSchema: [
      {
        key: 'subreddit',
        type: 'string',
        description:
          'Search flairs and restrictions by subreddit key should be "/r/[name]"',
      },
    ],
  })
  async restrictions(accessToken: string, data: { subreddit: string }) {
    const {
      data: { submission_type, allow_images, ...all2 },
    } = await (
      await this.fetch(
        `https://oauth.reddit.com/${data.subreddit}/about`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
        'reddit',
        0,
        false
      )
    ).json();

    const { is_flair_required, ...all } = await (
      await this.fetch(
        `https://oauth.reddit.com/api/v1/${
          data.subreddit.split('/r/')[1]
        }/post_requirements`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
        'reddit',
        0,
        false
      )
    ).json();

    // eslint-disable-next-line no-async-promise-executor
    const newData = await new Promise<{ id: string; name: string }[]>(
      async (res) => {
        try {
          const flair = await (
            await this.fetch(
              `https://oauth.reddit.com/${data.subreddit}/api/link_flair_v2`,
              {
                method: 'GET',
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                  'Content-Type': 'application/x-www-form-urlencoded',
                },
              },
              'reddit',
              0,
              false
            )
          ).json();

          res(flair);
        } catch (err) {
          return res([]);
        }
      }
    );

    return {
      subreddit: data.subreddit,
      allow: this.getPermissions(submission_type, allow_images),
      is_flair_required: is_flair_required && newData.length > 0,
      flairs:
        newData?.map?.((p: any) => ({
          id: p.id,
          name: p.text,
        })) || [],
    };
  }
}
