import {
  AuthTokenDetails,
  PostDetails,
  PostResponse,
  SocialComment,
  SocialCommentPost,
  SocialCommentPostsPage,
  SocialCommentsPage,
  SocialProvider,
} from '@gitroom/nestjs-libraries/integrations/social/social.integrations.interface';
import dayjs from 'dayjs';
import {
  BadBody,
  RefreshToken,
  SocialAbstract,
} from '@gitroom/nestjs-libraries/integrations/social.abstract';
import { Integration } from '@prisma/client';
import { Rules } from '@gitroom/nestjs-libraries/chat/rules.description.decorator';

// TikTok "API for Business" — a DIFFERENT surface from the consumer Login Kit /
// Content Posting API used by tiktok.provider.ts:
//   - host:   business-api.tiktok.com/open_api/v1.3/business/*
//   - auth:   app_id/secret + auth_code flow (NOT client_key/PKCE)
//   - token:  passed as the `Access-Token` header (NOT `Authorization: Bearer`)
//   - id:     business_id (NOT open_id)
// This is the only TikTok surface that exposes organic-post comment moderation
// (list / reply / hide), which is why it needs its own provider rather than
// bolting onto tiktok.provider.ts (whose tokens can't call these endpoints).
const BASE = 'https://business-api.tiktok.com/open_api/v1.3';

@Rules(
  'TikTok Business is a comment-management only channel, it cannot publish posts'
)
export class TiktokBusinessProvider
  extends SocialAbstract
  implements SocialProvider
{
  identifier = 'tiktok-business';
  name = 'Tiktok\n(Business)';
  isBetweenSteps = false;
  toolTip =
    'Connect a TikTok Business account to manage comments and replies on its posts (this channel does not publish).';
  // TikTok API for Business permissions are fixed on the app in the developer
  // portal, they are not requested through the authorize URL, so this stays empty.
  scopes = [] as string[];
  editor = 'normal' as const;

  maxLength() {
    // TikTok caps comment replies at 150 characters.
    return 150;
  }

  // This channel exists only to manage comments/replies on a TikTok Business
  // account — it does not publish. Block scheduling at the composer validation
  // layer; post() is a hard backstop if anything reaches the publish path.
  override async checkValidity(): Promise<string | true> {
    return 'TikTok Business channels manage comments and replies only — they cannot publish posts.';
  }

  override handleErrors(body: string):
    | { type: 'refresh-token' | 'bad-body'; value: string }
    | undefined {
    if (
      body.indexOf('access_token') > -1 &&
      (body.indexOf('invalid') > -1 ||
        body.indexOf('empty') > -1 ||
        body.indexOf('expired') > -1)
    ) {
      return {
        type: 'refresh-token' as const,
        value:
          'TikTok Business access token is invalid, please reconnect your account',
      };
    }
    return undefined;
  }

  async post(
    _id: string,
    _accessToken: string,
    _postDetails: PostDetails[],
    _integration: Integration
  ): Promise<PostResponse[]> {
    throw new BadBody(
      'tiktok-business',
      '{}',
      Buffer.from('{}'),
      'TikTok Business channels cannot publish posts, they are used to manage comments and replies only.'
    );
  }

  // ---------------------------------------------------------------------------
  // OAuth (TikTok API for Business)
  // ---------------------------------------------------------------------------
  private redirectUri() {
    return `${
      process?.env?.FRONTEND_URL?.indexOf('https') === -1
        ? 'https://redirectmeto.com/'
        : ''
    }${process?.env?.FRONTEND_URL}/integrations/social/tiktok-business`;
  }

  async generateAuthUrl() {
    const state = Math.random().toString(36).substring(2);
    return {
      // Business portal returns the code back as `auth_code` (mapped to `code`
      // for this provider in continue.integration.tsx).
      url:
        'https://business-api.tiktok.com/portal/auth' +
        `?app_id=${process.env.TIKTOK_BUSINESS_APP_ID}` +
        `&state=${state}` +
        `&redirect_uri=${encodeURIComponent(this.redirectUri())}`,
      codeVerifier: state,
      state,
    };
  }

  async authenticate(params: {
    code: string;
    codeVerifier: string;
    refresh?: string;
  }) {
    // Organic Business-Account (TikTok Account) access uses the tt_user token
    // flow — NOT the plain /oauth2/access_token/ advertiser flow, which returns
    // advertiser_ids and cannot call the /business/* comment endpoints.
    return this.exchange('/tt_user/oauth2/token/', {
      app_id: process.env.TIKTOK_BUSINESS_APP_ID!,
      secret: process.env.TIKTOK_BUSINESS_APP_SECRET!,
      auth_code: params.code,
      grant_type: 'authorization_code',
      business: 'tt_user',
    });
  }

  async refreshToken(refreshToken: string): Promise<AuthTokenDetails> {
    return this.exchange('/tt_user/oauth2/refresh_token/', {
      app_id: process.env.TIKTOK_BUSINESS_APP_ID!,
      secret: process.env.TIKTOK_BUSINESS_APP_SECRET!,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
      business: 'tt_user',
    });
  }

  private async exchange(
    path: string,
    body: Record<string, string>
  ): Promise<AuthTokenDetails> {
    const res = await (
      await fetch(`${BASE}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
    ).json();

    const data = res?.data || {};
    const accessToken = data.access_token;
    if (!accessToken) {
      throw new BadBody(
        'tiktok-business',
        JSON.stringify(res),
        Buffer.from(JSON.stringify(res || {})),
        res?.message || 'Could not authenticate the TikTok Business account'
      );
    }

    // The tt_user token flow returns the account id as open_id (a.k.a.
    // creator_id); it is the value the /business/* endpoints expect in their
    // `business_id` parameter. ponytail: [VERIFY] exact field name against the
    // JS-gated portal — fall through the documented aliases defensively.
    const businessId = String(
      data.open_id || data.creator_id || data.business_id || ''
    );

    // ponytail: [VERIFY] the /business/get/ field names below.
    const profile: any = businessId
      ? await this.call<any>('/business/get/', accessToken, {
          query: {
            business_id: businessId,
            fields: ['username', 'display_name', 'profile_image'],
          },
        }).catch(() => ({}))
      : {};

    return {
      id: businessId,
      name:
        profile.display_name ||
        profile.username ||
        data.display_name ||
        'TikTok Business',
      accessToken,
      refreshToken: data.refresh_token || '',
      // The tt_user creator token is valid ~24h with a 1-year refresh token
      // (confirmed via TikTok's official SDK AuthenticationApi docs), so trust
      // the response expiry and otherwise default to 23h — the daily refresh
      // uses the stored refresh token, and a real 401 still forces a refresh
      // via the RefreshToken path in call().
      expiresIn: data.expires_in
        ? Number(data.expires_in)
        : dayjs().add(23, 'hours').unix() - dayjs().unix(),
      picture: profile.profile_image || '',
      username: profile.username || data.username || '',
    };
  }

  // ---------------------------------------------------------------------------
  // Comments
  // ---------------------------------------------------------------------------
  async fetchCommentPosts(
    id: string,
    accessToken: string,
    _integration: Integration,
    limit = 25,
    cursor?: string
  ): Promise<SocialCommentPostsPage> {
    const safeLimit = Math.min(Math.max(Number(limit) || 25, 1), 100);
    // ponytail: [VERIFY] /business/video/list/ param + response field names.
    const data = await this.call<any>('/business/video/list/', accessToken, {
      query: {
        business_id: id,
        // `fields` IS required on video/list and must include item_id. Count
        // fields are `likes`/`comments` (not like_count/comment_count).
        fields: [
          'item_id',
          'create_time',
          'caption',
          'share_url',
          'likes',
          'comments',
        ],
        max_count: safeLimit,
        cursor,
      },
    });

    const posts: SocialCommentPost[] = (data?.videos || []).map((v: any) => ({
      id: String(v.item_id),
      releaseId: String(v.item_id),
      releaseURL: v.share_url,
      content: v.caption || 'TikTok video',
      publishDate: v.create_time
        ? dayjs.unix(Number(v.create_time)).toISOString()
        : '',
      commentCount: Number(v.comments ?? v.comment_count ?? 0),
      likeCount: Number(v.likes ?? v.like_count ?? 0),
    }));

    return {
      posts,
      total: posts.length,
      page: 0,
      limit: safeLimit,
      hasMore: !!data?.has_more,
      next: data?.has_more ? String(data?.cursor) : undefined,
    };
  }

  async fetchComments(
    id: string,
    accessToken: string,
    postId: string,
    _integration: Integration,
    cursor?: string
  ): Promise<SocialCommentsPage> {
    // ponytail: [VERIFY] /business/comment/list/ param + response field names.
    // `fields` is not accepted on comment/list — the endpoint returns the full
    // comment object (comment_id, text, username, display_name, likes, replies,
    // create_time, status) by default.
    const data = await this.call<any>('/business/comment/list/', accessToken, {
      query: {
        business_id: id,
        video_id: postId,
        max_count: 50,
        cursor,
      },
    });

    const raw: any[] = data?.comments || [];

    // TikTok serves replies through a separate endpoint, so fetch one level of
    // replies for the comments on this page (mirrors Facebook's nesting).
    // ponytail: N+1 requests per page (~50 comments); batch if it gets heavy.
    const comments: SocialComment[] = await Promise.all(
      raw.map(async (c) => {
        const base = this.normalizeComment(c);
        // Reply count is `replies` on the organic surface (not reply_count).
        if (Number(c.replies ?? c.reply_count ?? 0) > 0) {
          base.replies = await this.fetchReplies(
            id,
            accessToken,
            postId,
            base.id
          );
        }
        return base;
      })
    );

    return {
      comments,
      next: data?.has_more ? String(data?.cursor) : undefined,
    };
  }

  private async fetchReplies(
    id: string,
    accessToken: string,
    postId: string,
    commentId: string
  ): Promise<SocialComment[]> {
    // ponytail: [VERIFY] /business/comment/reply/list/ field names.
    const data = await this.call<any>(
      '/business/comment/reply/list/',
      accessToken,
      {
        query: {
          business_id: id,
          video_id: postId,
          comment_id: commentId,
          max_count: 50,
        },
      }
    ).catch(() => ({ comments: [] }));

    return (data?.comments || []).map((c: any) => this.normalizeComment(c));
  }

  async replyToComment(
    id: string,
    postId: string,
    commentId: string,
    accessToken: string,
    message: string,
    _integration: Integration
  ): Promise<{ id: string }> {
    // ponytail: [VERIFY] /business/comment/reply/create/ body + response shape.
    const data = await this.call<any>(
      '/business/comment/reply/create/',
      accessToken,
      {
        method: 'POST',
        body: {
          business_id: id,
          video_id: postId,
          comment_id: commentId,
          text: message,
        },
      }
    );

    return { id: String(data?.comment_id ?? '') };
  }

  async hideComment(
    id: string,
    postId: string,
    commentId: string,
    accessToken: string,
    hidden: boolean,
    _integration: Integration
  ): Promise<{ id: string; hidden: boolean }> {
    // Organic hide/unhide is /business/comment/hide/ with a single comment_id
    // and a HIDE/UNHIDE action. (The comment_ids[] + /comment/status/update/
    // variant belongs to the separate advertiser/ads API keyed by advertiser_id.)
    await this.call<any>('/business/comment/hide/', accessToken, {
      method: 'POST',
      body: {
        business_id: id,
        video_id: postId,
        comment_id: commentId,
        action: hidden ? 'HIDE' : 'UNHIDE',
      },
    });

    return { id: String(commentId), hidden };
  }

  private normalizeComment(c: any): SocialComment {
    const status = c.status ? String(c.status).toUpperCase() : undefined;
    return {
      id: String(c.comment_id ?? c.id),
      text: c.text || '',
      username: c.username || c.display_name,
      timestamp: c.create_time
        ? dayjs.unix(Number(c.create_time)).toISOString()
        : undefined,
      likeCount: Number(c.likes ?? c.like_count ?? 0),
      hidden: status ? status !== 'PUBLIC' : undefined,
    };
  }

  // ---------------------------------------------------------------------------
  // Business API call helper. TikTok for Business answers HTTP 200 with a `code`
  // field (0 === success), so success can't be inferred from the HTTP status —
  // we inspect `code` and route auth failures to a refresh/reconnect.
  // ---------------------------------------------------------------------------
  private async call<T = any>(
    path: string,
    accessToken: string,
    options: {
      method?: 'GET' | 'POST';
      query?: Record<string, unknown>;
      body?: unknown;
    } = {}
  ): Promise<T> {
    const method = options.method || 'GET';

    const qs = options.query
      ? '?' +
        new URLSearchParams(
          Object.entries(options.query).reduce((acc, [k, v]) => {
            if (v === undefined || v === null || v === '') return acc;
            acc[k] = Array.isArray(v) ? JSON.stringify(v) : String(v);
            return acc;
          }, {} as Record<string, string>)
        ).toString()
      : '';

    const response = await this.fetch(
      `${BASE}${path}${qs}`,
      {
        method,
        headers: {
          'Access-Token': accessToken,
          'Content-Type': 'application/json',
        },
        ...(options.body ? { body: JSON.stringify(options.body) } : {}),
      },
      'tiktok-business'
    );

    const json = await response.json();

    // TikTok Business documents integer codes; coerce defensively in case a
    // surface returns a string code (which would otherwise invert the checks).
    const code = Number(json?.code ?? 0);
    if (code !== 0) {
      // Access-token problems -> RefreshToken so the service retries after a
      // token refresh (and ultimately prompts a reconnect if that fails).
      if ([40001, 40100, 40104, 40105, 40110].includes(code)) {
        throw new RefreshToken(
          'tiktok-business',
          JSON.stringify(json),
          Buffer.from(JSON.stringify(json)),
          json.message || 'TikTok Business access token invalid'
        );
      }
      throw new BadBody(
        'tiktok-business',
        JSON.stringify(json),
        Buffer.from(JSON.stringify(json)),
        json.message || 'TikTok Business API error'
      );
    }

    return json.data as T;
  }
}
