import {
  AnalyticsData,
  AuthTokenDetails,
  PendingCheckResponse,
  PostDetails,
  PostResponse,
  SocialProvider,
} from '@gitroom/nestjs-libraries/integrations/social/social.integrations.interface';
import { Integration } from '@prisma/client';
import { makeId } from '@gitroom/nestjs-libraries/services/make.is';
import { PinterestSettingsDto } from '@gitroom/nestjs-libraries/dtos/posts/providers-settings/pinterest.dto';
import FormData from 'form-data';
import { timer } from '@gitroom/helpers/utils/timer';
import {
  BadBody,
  RefreshToken,
  SocialAbstract,
  ValidityMedia,
} from '@gitroom/nestjs-libraries/integrations/social.abstract';
import dayjs from 'dayjs';
import { Tool } from '@gitroom/nestjs-libraries/integrations/tool.decorator';
import { Rules } from '@gitroom/nestjs-libraries/chat/rules.description.decorator';
import { hasExtension } from '@gitroom/helpers/utils/has.extension';

// Travels through the workflow history between postPending, checkPostStatus
// and finalizePost - keep it small JSON (the media id and the pin content).
type PinterestPendingData = {
  mediaId: string; // empty for image-only pins (no asynchronous processing)
  message: string;
  settings: {
    link?: string;
    title?: string;
    dominant_color?: string;
    board: string;
  };
  imagePaths: string[];
  coverPath?: string;
  // Arm -> confirm -> publish handshake (same as the Facebook story flow):
  // finalizePost arms without mutating, checkPostStatus witnesses, and only a
  // witnessed attempt runs the create - so a create that dies with an unknown
  // outcome is detected instead of run again (Pinterest has no idempotency
  // key).
  attempting?: boolean;
  confirmed?: boolean;
};

@Rules(
  'Pinterest requires at least one media, if posting a video, you must have two attachment, one for video, one for the cover picture, When posting a video, there can be only one, if posting images, there can be maximum 5'
)
export class PinterestProvider
  extends SocialAbstract
  implements SocialProvider
{
  identifier = 'pinterest';
  name = 'Pinterest';
  isBetweenSteps = false;
  scopes = [
    'boards:read',
    'boards:write',
    'pins:read',
    'pins:write',
    'user_accounts:read',
  ];
  override maxConcurrentJob = 3; // Pinterest has more lenient rate limits
  maxLength() {
    return 500;
  }

  dto = PinterestSettingsDto;

  override async checkValidity([firstItem]: Array<ValidityMedia[]>): Promise<
    string | true
  > {
    const isMp4 = firstItem?.find(
      (item) => (item?.path?.indexOf?.('mp4') ?? -1) > -1
    );
    const isPicture = firstItem?.find(
      (item) => (item?.path?.indexOf?.('mp4') ?? -1) === -1
    );
    if ((firstItem?.length ?? 0) === 0) {
      return 'Requires at least one media';
    }
    if ((firstItem?.length ?? 0) > 5) {
      return 'You can only have up to 5 media items';
    }
    if (isMp4 && firstItem?.length !== 2 && !isPicture) {
      return 'If posting a video you have to also include a cover image as second media';
    }
    if (isMp4 && (firstItem?.length ?? 0) > 2) {
      return 'If posting a video you can only have two media items';
    }

    if (
      (firstItem?.length ?? 0) > 1 &&
      firstItem?.every((p) => (p?.path?.indexOf?.('mp4') ?? -1) === -1)
    ) {
      const loadAll = await Promise.all(
        firstItem?.map((p) => this.getImageDimensions(p?.path)) ?? []
      );
      const checkAllTheSameWidthHeight = loadAll?.every((p, i, arr) => {
        return p?.width === arr?.[0]?.width && p?.height === arr?.[0]?.height;
      });
      if (!checkAllTheSameWidthHeight) {
        return 'Requires all images to have the same width and height';
      }
    }
    return true;
  }

  editor = 'normal' as const;

  public override handleErrors(body: string):
    | {
        type: 'refresh-token' | 'bad-body' | 'retry';
        value: string;
      }
    | undefined {
    if (body.indexOf('constraint: maxItems=5') > -1) {
      return {
        type: 'bad-body' as const,
        value: 'You can upload a maximum of 5 images per post on Pinterest.',
      };
    }
    if (body.indexOf('Unable to reach the URL') > -1) {
      return {
        type: 'retry' as const,
        value:
          'Pinterest was unable to reach the URL provided. Please check the link and try again.',
      };
    }
    if (body.indexOf(`does not match '^\\\\\\\\\\\\\\\\d+$'`) > -1) {
      return {
        type: 'bad-body' as const,
        value:
          'The board ID must be a numeric string. Please check the board ID format.',
      };
    }
    if (body.indexOf('Board not found') > -1) {
      return {
        type: 'bad-body' as const,
        value: 'The specified board was not found. Please check the board ID.',
      };
    }
    if (body.indexOf('cover_image_url or cover_image_content_type') > -1) {
      return {
        type: 'bad-body' as const,
        value:
          'When uploading a video, you must add also an image to be used as a cover image.',
      };
    }

    return undefined;
  }

  async refreshToken(refreshToken: string): Promise<AuthTokenDetails> {
    const { access_token, expires_in } = await (
      await fetch('https://api.pinterest.com/v5/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${Buffer.from(
            `${process.env.PINTEREST_CLIENT_ID}:${process.env.PINTEREST_CLIENT_SECRET}`
          ).toString('base64')}`,
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          scope: this.scopes.join(','),
          redirect_uri: `${process.env.FRONTEND_URL}/integrations/social/pinterest`,
        }),
      })
    ).json();

    const { id, profile_image, username } = await (
      await fetch('https://api.pinterest.com/v5/user_account', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      })
    ).json();

    return {
      id: id,
      name: username,
      accessToken: access_token,
      refreshToken: refreshToken,
      expiresIn: expires_in,
      picture: profile_image || '',
      username,
    };
  }

  async generateAuthUrl() {
    const state = makeId(6);
    return {
      url: `https://www.pinterest.com/oauth/?client_id=${
        process.env.PINTEREST_CLIENT_ID
      }&redirect_uri=${encodeURIComponent(
        `${process.env.FRONTEND_URL}/integrations/social/pinterest`
      )}&response_type=code&scope=${encodeURIComponent(
        'boards:read,boards:write,pins:read,pins:write,user_accounts:read'
      )}&state=${state}`,
      codeVerifier: makeId(10),
      state,
    };
  }

  async authenticate(params: {
    code: string;
    codeVerifier: string;
    refresh: string;
  }) {
    const { access_token, refresh_token, expires_in, scope } = await (
      await fetch('https://api.pinterest.com/v5/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${Buffer.from(
            `${process.env.PINTEREST_CLIENT_ID}:${process.env.PINTEREST_CLIENT_SECRET}`
          ).toString('base64')}`,
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code: params.code,
          redirect_uri: `${process.env.FRONTEND_URL}/integrations/social/pinterest`,
        }),
      })
    ).json();

    this.checkScopes(this.scopes, scope);

    const { id, profile_image, username } = await (
      await fetch('https://api.pinterest.com/v5/user_account', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      })
    ).json();

    return {
      id: id,
      name: username,
      accessToken: access_token,
      refreshToken: refresh_token,
      expiresIn: expires_in,
      picture: profile_image,
      username,
    };
  }

  @Tool({ description: 'List of boards', dataSchema: [] })
  async boards(accessToken: string) {
    const { items } = await (
      await fetch('https://api.pinterest.com/v5/boards?page_size=250', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })
    ).json();

    return (
      items?.map((item: any) => ({
        name: item.name,
        id: item.id,
      })) || []
    );
  }

  async postPending(
    id: string,
    accessToken: string,
    postDetails: PostDetails<PinterestSettingsDto>[]
  ): Promise<PostResponse[]> {
    let mediaId = '';
    const findMp4 = postDetails?.[0]?.media?.find((p) =>
      hasExtension(p.path, 'mp4')
    );
    const picture = postDetails?.[0]?.media?.find(
      (p) => !hasExtension(p.path, 'mp4')
    );

    // Upload the video now; the processing wait moves to checkPostStatus and
    // the pin itself is only created by finalizePost, so nothing here is
    // irreversible - a failure leaves only an orphaned media upload.
    if (findMp4) {
      const { upload_url, media_id, upload_parameters } = await (
        await this.fetch('https://api.pinterest.com/v5/media', {
          method: 'POST',
          body: JSON.stringify({
            media_type: 'video',
          }),
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
        })
      ).json();

      const { data } = await this.getSsrfSafeAxios().get(findMp4.path, {
        responseType: 'stream',
      });

      const formData = Object.keys(upload_parameters)
        .filter((f) => f)
        .reduce((acc, key) => {
          acc.append(key, upload_parameters[key]);
          return acc;
        }, new FormData());

      formData.append('file', data);
      await this.getSsrfSafeAxios().post(upload_url, formData);

      mediaId = media_id;
    }

    return [
      {
        id: postDetails?.[0]?.id,
        releaseURL: '',
        postId: '',
        status: 'pending',
        pendingData: {
          mediaId,
          message: postDetails?.[0]?.message,
          settings: {
            link: postDetails?.[0]?.settings.link,
            title: postDetails?.[0]?.settings.title,
            dominant_color: postDetails?.[0]?.settings.dominant_color,
            board: postDetails?.[0]?.settings.board,
          },
          imagePaths: (postDetails?.[0]?.media || []).map((m) => m.path),
          coverPath: picture?.path,
        } as PinterestPendingData,
      },
    ];
  }

  override async checkPostStatus(
    accessToken: string,
    pendingData: PinterestPendingData,
    integration: Integration
  ): Promise<PendingCheckResponse> {
    // A confirmed create attempt died without reporting its result: Pinterest
    // gives no way to ask whether that pin was created, so never run the
    // create again - stop with an explicit warning instead.
    if (pendingData.attempting && pendingData.confirmed) {
      throw new BadBody(
        'pinterest',
        JSON.stringify({}),
        {} as any,
        'Pinterest may have already published this pin, please check your account before posting again to avoid duplicates'
      );
    }

    // witness the armed create so finalizePost knows the attempt is uniquely
    // accounted for before it mutates anything
    const witness = (): PendingCheckResponse =>
      pendingData.attempting && !pendingData.confirmed
        ? {
            status: 'ready',
            pendingData: { ...pendingData, confirmed: true },
          }
        : { status: 'ready', pendingData };

    // Image-only pins have no asynchronous processing step.
    if (!pendingData.mediaId) {
      return witness();
    }

    let mediafile: { status?: string };
    try {
      mediafile = await (
        await this.fetch(
          'https://api.pinterest.com/v5/media/' + pendingData.mediaId,
          {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          },
          '',
          0,
          true
        )
      ).json();
    } catch (err) {
      if (err instanceof RefreshToken) {
        throw err;
      }

      // Transient status-check error: the media may finish processing just
      // fine, keep polling - if Pinterest stays broken the workflow exhausts
      // its checks and warns the user properly.
      return { status: 'pending', pendingData };
    }

    if (mediafile.status === 'failed') {
      throw new BadBody(
        'pinterest',
        JSON.stringify({}),
        {} as any,
        'The file is corrupted and cannot be uploaded'
      );
    }

    if (mediafile.status !== 'succeeded') {
      return { status: 'pending', pendingData };
    }

    return witness();
  }

  override async finalizePost(
    accessToken: string,
    pendingData: PinterestPendingData,
    integration: Integration
  ): Promise<PendingCheckResponse> {
    // Create with an arm -> confirm -> publish handshake: the create only runs
    // after checkPostStatus witnessed the intent, so a run that dies
    // mid-create is detectable and the pin is never published twice.
    if (!pendingData.attempting || !pendingData.confirmed) {
      return {
        status: 'pending',
        pendingData: { ...pendingData, attempting: true, confirmed: false },
      };
    }

    const mapImages = (pendingData.imagePaths || []).map((path) => ({ path }));

    const { id: pId } = await (
      await this.fetch('https://api.pinterest.com/v5/pins', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...(pendingData.settings.link
            ? { link: pendingData.settings.link }
            : {}),
          ...(pendingData.settings.title
            ? { title: pendingData.settings.title }
            : {}),
          description: pendingData.message,
          ...(pendingData.settings.dominant_color
            ? { dominant_color: pendingData.settings.dominant_color }
            : {}),
          board_id: pendingData.settings.board,
          media_source: pendingData.mediaId
            ? {
                source_type: 'video_id',
                media_id: pendingData.mediaId,
                cover_image_url: pendingData.coverPath,
              }
            : mapImages?.length === 1
            ? {
                source_type: 'image_url',
                url: mapImages?.[0]?.path,
              }
            : {
                source_type: 'multiple_image_urls',
                items: mapImages.map((m) => ({
                  url: m.path,
                })),
              },
        }),
      })
    ).json();

    return {
      status: 'completed',
      postId: pId,
      releaseURL: `https://www.pinterest.com/pin/${pId}`,
    };
  }

  // Old blocking behavior, kept for workflow versions before v1.0.6 that still
  // run and don't know how to resolve a `pending` response - they wait for the
  // processing and create the pin inside the activity like before.
  async post(
    id: string,
    accessToken: string,
    postDetails: PostDetails<PinterestSettingsDto>[],
    integration: Integration
  ): Promise<PostResponse[]> {
    const [response] = await this.postPending(id, accessToken, postDetails);

    let pendingData = response.pendingData;
    const started = Date.now();

    // eslint-disable-next-line no-constant-condition
    while (true) {
      // Cap below the 10-minute activity timeout of the old workflows using
      // this method: failing here is safe (the pin is only created once the
      // media is ready), timing the activity out is not - a retried activity
      // would upload and publish again.
      if (Date.now() - started > 8 * 60 * 1000) {
        throw new BadBody(
          'pinterest',
          JSON.stringify({}),
          {} as any,
          'The file took too long to process, please try again'
        );
      }

      const check = await this.checkPostStatus(
        accessToken,
        pendingData,
        integration
      );

      if (check.status === 'pending') {
        pendingData = check.pendingData;
        await timer(20000);
        continue;
      }

      const result =
        check.status === 'ready'
          ? await this.finalizePost(accessToken, check.pendingData, integration)
          : check;

      if (result.status === 'completed') {
        return [
          {
            id: response.id,
            postId: result.postId,
            releaseURL: result.releaseURL,
            status: 'success',
          },
        ];
      }

      // finalize only armed the handshake (nothing to wait for), loop straight
      // into the witnessing check
      pendingData = result.pendingData;
    }
  }

  async analytics(
    id: string,
    accessToken: string,
    date: number
  ): Promise<AnalyticsData[]> {
    const until = dayjs().format('YYYY-MM-DD');
    // Pinterest analytics only cover the last 90 days (89 for a UTC safety margin)
    const since = dayjs()
      .subtract(Math.min(date, 89), 'day')
      .format('YYYY-MM-DD');

    const {
      all: { daily_metrics },
    } = await (
      await fetch(
        `https://api.pinterest.com/v5/user_account/analytics?start_date=${since}&end_date=${until}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      )
    ).json();

    return daily_metrics.reduce(
      (acc: any, item: any) => {
        if (typeof item.metrics.PIN_CLICK_RATE !== 'undefined') {
          acc[0].data.push({
            date: item.date,
            total: item.metrics.PIN_CLICK_RATE,
          });

          acc[1].data.push({
            date: item.date,
            total: item.metrics.IMPRESSION,
          });

          acc[2].data.push({
            date: item.date,
            total: item.metrics.PIN_CLICK,
          });

          acc[3].data.push({
            date: item.date,
            total: item.metrics.ENGAGEMENT,
          });

          acc[4].data.push({
            date: item.date,
            total: item.metrics.SAVE,
          });
        }

        return acc;
      },
      [
        { label: 'Pin click rate', data: [] as any[] },
        { label: 'Impressions', data: [] as any[] },
        { label: 'Pin Clicks', data: [] as any[] },
        { label: 'Engagement', data: [] as any[] },
        { label: 'Saves', data: [] as any[] },
      ]
    );
  }

  async postAnalytics(
    integrationId: string,
    accessToken: string,
    postId: string,
    date: number
  ): Promise<AnalyticsData[]> {
    const today = dayjs().format('YYYY-MM-DD');
    // Pinterest only serves pin analytics for the last 90 days (89 for a UTC safety margin)
    const since = dayjs().subtract(89, 'day').format('YYYY-MM-DD');

    try {
      // Fetch pin analytics from Pinterest API
      const response = await fetch(
        `https://api.pinterest.com/v5/pins/${postId}/analytics?start_date=${since}&end_date=${today}&metric_types=IMPRESSION,PIN_CLICK,OUTBOUND_CLICK,SAVE`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const data = await response.json();

      if (!data || !data.all) {
        return [];
      }

      const result: AnalyticsData[] = [];
      const metrics = data.all;

      if (metrics.lifetime_metrics) {
        const lifetimeMetrics = metrics.lifetime_metrics;

        if (lifetimeMetrics.IMPRESSION !== undefined) {
          result.push({
            label: 'Impressions',
            percentageChange: 0,
            data: [{ total: String(lifetimeMetrics.IMPRESSION), date: today }],
          });
        }

        if (lifetimeMetrics.PIN_CLICK !== undefined) {
          result.push({
            label: 'Pin Clicks',
            percentageChange: 0,
            data: [{ total: String(lifetimeMetrics.PIN_CLICK), date: today }],
          });
        }

        if (lifetimeMetrics.OUTBOUND_CLICK !== undefined) {
          result.push({
            label: 'Outbound Clicks',
            percentageChange: 0,
            data: [
              { total: String(lifetimeMetrics.OUTBOUND_CLICK), date: today },
            ],
          });
        }

        if (lifetimeMetrics.SAVE !== undefined) {
          result.push({
            label: 'Saves',
            percentageChange: 0,
            data: [{ total: String(lifetimeMetrics.SAVE), date: today }],
          });
        }
      }

      return result;
    } catch (err) {
      console.error('Error fetching Pinterest post analytics:', err);
      return [];
    }
  }
}
