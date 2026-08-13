import {
  AuthTokenDetails,
  PendingCheckResponse,
  PostDetails,
  PostResponse,
  SocialProvider,
} from '@gitroom/nestjs-libraries/integrations/social/social.integrations.interface';
import { makeId } from '@gitroom/nestjs-libraries/services/make.is';
import sharp from 'sharp';
import { lookup } from 'mime-types';
import { readOrFetch } from '@gitroom/helpers/utils/read.or.fetch';
import { hasExtension } from '@gitroom/helpers/utils/has.extension';
import { timer } from '@gitroom/helpers/utils/timer';
import {
  BadBody,
  RefreshToken,
  SocialAbstract,
  ValidityMedia,
} from '@gitroom/nestjs-libraries/integrations/social.abstract';
import { Integration } from '@prisma/client';
import { PostPlug } from '@gitroom/helpers/decorators/post.plug';
import { LinkedinDto } from '@gitroom/nestjs-libraries/dtos/posts/providers-settings/linkedin.dto';
import imageToPDF from 'image-to-pdf';
import { Readable } from 'stream';
import { Rules } from '@gitroom/nestjs-libraries/chat/rules.description.decorator';

// Travels through the workflow history between postPending, checkPostStatus
// and finalizePost - keep it small JSON (media urns and the post content, never
// buffers).
type LinkedinPendingData = {
  authorId: string;
  postType: 'company' | 'personal';
  message: string;
  isPdf: boolean;
  pdfTitle?: string;
  mediaIds: string[];
  // Media whose processing status can be read via GET: videos for every token,
  // images/documents only for organization tokens.
  poll: { urn: string; endpoint: 'videos' | 'images' | 'documents' }[];
  // Check cycles to wait for unpollable media (personal images/documents).
  graceChecks: number;
  // Consecutive status reads that failed or answered without a status:
  // bounded so a broken media endpoint fails with an accurate error instead
  // of burning the whole check budget into a misleading "couldn't confirm"
  // warning (nothing is ever published before the media is ready).
  statusStalls?: number;
  // Arm -> confirm -> publish handshake (same as the Facebook story flow):
  // finalizePost arms without mutating, checkPostStatus witnesses, and only a
  // witnessed attempt runs the create - so a create that dies with an unknown
  // outcome is detected instead of run again (LinkedIn has no idempotency key).
  attempting?: boolean;
  confirmed?: boolean;
};

@Rules(
  'LinkedIn can have maximum one attachment when selecting video, when choosing a carousel on LinkedIn minimum amount of attachment must be two, and only pictures, if uploading a video, LinkedIn can have only one attachment'
)
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
  override maxConcurrentJob = 2;
  refreshWait = true;
  editor = 'normal' as const;
  maxLength() {
    return 3000;
  }

  override async checkValidity(
    posts: Array<ValidityMedia[]>,
    vals: any
  ): Promise<string | true> {
    const [firstPost, ...restPosts] = posts ?? [];

    if (
      this.assetBoolean(vals?.post_as_images_carousel) &&
      ((firstPost?.length ?? 0) < 2 ||
        firstPost?.some((p) => (p?.path?.indexOf?.('mp4') ?? -1) > -1))
    ) {
      return 'Carousel can only be created with 2 or more images and no videos.';
    }

    if (
      (firstPost?.length ?? 0) > 1 &&
      firstPost?.some((p) => (p?.path?.indexOf?.('mp4') ?? -1) > -1)
    ) {
      return 'Can have maximum 1 media when selecting a video.';
    }
    if (restPosts?.some((p) => (p?.length ?? 0) > 0)) {
      return 'Comments can only contain text.';
    }
    return true;
  }

  override handleErrors(
    body: string
  ):
    | { type: 'refresh-token' | 'bad-body' | 'retry'; value: string }
    | undefined {
    if (body.indexOf('Unable to obtain activity') > -1) {
      return {
        type: 'retry',
        value: 'Unable to obtain activity',
      };
    }

    if (body.indexOf('resource is forbidden') > -1 || body.indexOf('Service Unavailable') > -1) {
      return {
        type: 'retry',
        value: 'Resource is forbidden',
      };
    }

    return undefined;
  }

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
      await fetch('https://api.linkedin.com/v2/me', {
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
      expiresIn: expires_in,
      name,
      picture: picture || '',
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
      await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
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
      await fetch('https://api.linkedin.com/v2/userinfo', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })
    ).json();

    const { vanityName } = await (
      await fetch('https://api.linkedin.com/v2/me', {
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
      await fetch(
        `https://api.linkedin.com/v2/organizations?q=vanityName&vanityName=${getCompanyVanity[1]}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'X-Restli-Protocol-Version': '2.0.0',
            'LinkedIn-Version': '202601',
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
    // Either the media bytes (images / converted PDFs) or a `{ path }`
    // descriptor for videos, which are streamed chunk-by-chunk from the source
    // instead of being held in memory.
    picture: Buffer | { path: string },
    type = 'personal' as 'company' | 'personal'
  ): Promise<{
    id: string;
    poll?: { urn: string; endpoint: 'videos' | 'images' | 'documents' };
    grace?: boolean;
  }> {
    // Determine the appropriate endpoint based on file type
    const isVideo = hasExtension(fileName, 'mp4');
    const isPdf = hasExtension(fileName, 'pdf');

    const fileSizeBytes = Buffer.isBuffer(picture)
      ? picture.length
      : await this.mediaSize(picture.path, this.identifier);

    let endpoint: string;
    if (isVideo) {
      endpoint = 'videos';
    } else if (isPdf) {
      endpoint = 'documents';
    } else {
      endpoint = 'images';
    }

    const {
      value: { uploadUrl, image, video, document, uploadInstructions, ...all },
    } = await (
      await this.fetch(
        `https://api.linkedin.com/rest/${endpoint}?action=initializeUpload`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Restli-Protocol-Version': '2.0.0',
            'LinkedIn-Version': '202601',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            initializeUploadRequest: {
              owner:
                type === 'personal'
                  ? `urn:li:person:${personId}`
                  : `urn:li:organization:${personId}`,
              ...(isVideo
                ? {
                    fileSizeBytes,
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
    const finalOutput = video || image || document;

    const etags = [];
    if (isVideo) {
      // Only the Videos API uses multipart chunked uploads. Each 2MB part is
      // PUT separately and the returned etags are passed to finalizeUpload.
      // Each part is read on demand (mediaChunk) so only one 2MB chunk is ever
      // resident in memory instead of the whole video.
      const chunkSize = 1024 * 1024 * 2;
      for (let i = 0; i < fileSizeBytes; i += chunkSize) {
        const body = Buffer.isBuffer(picture)
          ? picture.slice(i, i + chunkSize)
          : await this.mediaChunk(
              picture.path,
              i,
              Math.min(i + chunkSize, fileSizeBytes) - 1,
              this.identifier
            );

        const upload = await this.fetch(
          sendUrlRequest,
          {
            method: 'PUT',
            headers: {
              'X-Restli-Protocol-Version': '2.0.0',
              'LinkedIn-Version': '202601',
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/octet-stream',
            },
            body,
          },
          'linkedin',
          0,
          true
        );

        etags.push(upload.headers.get('etag'));
      }
    } else {
      // Images and documents (PDF carousels) use a single-shot upload URL and
      // must be sent as one PUT of the whole file. Chunking here would send
      // multiple overwriting PUTs to the same URL, leaving LinkedIn with only
      // the final chunk and corrupting anything larger than 2MB.
      await this.fetch(
        sendUrlRequest,
        {
          method: 'PUT',
          headers: {
            'X-Restli-Protocol-Version': '2.0.0',
            'LinkedIn-Version': '202601',
            Authorization: `Bearer ${accessToken}`,
            ...(isPdf ? { 'Content-Type': 'application/pdf' } : {}),
          },
          // Only videos arrive as a { path } descriptor; images and documents
          // are always a Buffer.
          body: picture as Buffer,
        },
        'linkedin',
        0,
        true
      );
    }

    if (isVideo) {
      await this.fetch(
        'https://api.linkedin.com/rest/videos?action=finalizeUpload',
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
            'LinkedIn-Version': '202601',
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
    }

    // Every media type is processed asynchronously after the upload and must
    // reach AVAILABLE before it is attached to a post, otherwise LinkedIn
    // rejects the post with a processing error. The waiting itself happens in
    // checkPostStatus, this method only describes what to wait for: videos can
    // be polled by any token, images and documents only by organization
    // tokens - a w_member_social (personal) token is write-only for those
    // endpoints, so the caller waits a grace period instead of polling.
    if (isVideo) {
      return {
        id: finalOutput,
        poll: { urn: finalOutput, endpoint: 'videos' as const },
      };
    }

    if (type === 'company') {
      return {
        id: finalOutput,
        poll: {
          urn: finalOutput,
          endpoint: (isPdf ? 'documents' : 'images') as 'documents' | 'images',
        },
      };
    }

    return { id: finalOutput, grace: true };
  }

  // Single read of the media processing status, no loops and no timers - the
  // polling loop lives in the post workflow (checkPostStatus).
  // videos: https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/videos-api#get-a-video
  // images: https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/images-api#get-a-single-image
  private async mediaProcessingStatus(
    accessToken: string,
    urn: string,
    endpoint: 'videos' | 'images' | 'documents'
  ): Promise<{ status?: string; processingFailureReason?: string }> {
    // The full response body is returned (not just the two fields) so a
    // processing failure can attach LinkedIn's complete answer to the error.
    return await (
      await this.fetch(
        `https://api.linkedin.com/rest/${endpoint}/${encodeURIComponent(urn)}`,
        {
          method: 'GET',
          headers: {
            'X-Restli-Protocol-Version': '2.0.0',
            'LinkedIn-Version': '202601',
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
        }
      )
    ).json();
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

  private async convertImagesToPdfCarousel(
    postDetails: PostDetails<LinkedinDto>[],
    firstPost: PostDetails<LinkedinDto>
  ): Promise<PostDetails<LinkedinDto>[]> {
    if (!firstPost.media?.length) {
      return postDetails;
    }

    // Fetch all images and get their dimensions
    const images = await Promise.all(
      firstPost.media.map(async (media) => {
        const raw = await readOrFetch(media.path);
        const image = sharp(raw, { animated: false }).toFormat('jpeg');
        const { width, height } = await image.metadata();
        const buffer = await image.toBuffer();
        return { buffer, width: width || 0, height: height || 0 };
      })
    );

    // Find the largest image by area to use as the PDF page size
    const largest = images.reduce((max, img) =>
      img.width * img.height > max.width * max.height ? img : max
    );

    const imageBuffers = images.map((img) => img.buffer);

    // Create a PDF sized to the largest image; it fills the page,
    // smaller images are fitted and centered within the same dimensions
    const pdfStream = imageToPDF(
      imageBuffers,
      [largest.width, largest.height]
    ) as unknown as Readable;
    const pdfBuffer = await this.streamToBuffer(pdfStream);

    // Replace the first post's media with the single PDF
    const [first, ...rest] = postDetails;
    return [
      {
        ...first,
        media: [
          {
            type: 'image' as const,
            path: 'carousel.pdf',
            buffer: pdfBuffer,
          } as any,
        ],
      },
      ...rest,
    ];
  }

  private async streamToBuffer(stream: Readable): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      stream.on('data', (chunk) => chunks.push(chunk));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', reject);
    });
  }

  private async processMediaForPosts(
    postDetails: PostDetails<LinkedinDto>[],
    accessToken: string,
    personId: string,
    type: 'company' | 'personal'
  ): Promise<{
    mediaUploads: Record<string, string[]>;
    poll: { urn: string; endpoint: 'videos' | 'images' | 'documents' }[];
    graceChecks: number;
  }> {
    // Media is uploaded sequentially on purpose: uploading everything with
    // Promise.all holds every file in memory at the same time.
    const mediaUploads: Record<string, string[]> = {};
    const poll: { urn: string; endpoint: 'videos' | 'images' | 'documents' }[] =
      [];
    let graceChecks = 0;
    for (const post of postDetails) {
      for (const media of post.media || []) {
        let mediaBuffer: Buffer | { path: string };

        // Check if media has a buffer (from PDF conversion)
        if (
          media &&
          typeof media === 'object' &&
          'buffer' in media &&
          Buffer.isBuffer(media.buffer)
        ) {
          mediaBuffer = (media as any).buffer;
        } else if (hasExtension(media.path, 'mp4')) {
          // Videos are never buffered: uploadPicture streams them from the
          // source chunk-by-chunk.
          mediaBuffer = { path: media.path };
        } else {
          mediaBuffer = await this.prepareMediaBuffer(media.path);
        }

        const uploaded = await this.uploadPicture(
          media.path,
          accessToken,
          personId,
          mediaBuffer,
          type
        );

        if (!uploaded?.id) {
          continue;
        }

        mediaUploads[post.id] = mediaUploads[post.id] || [];
        mediaUploads[post.id].push(uploaded.id);

        if (uploaded.poll) {
          poll.push(uploaded.poll);
        }

        // Unpollable media (personal images/documents): wait one durable check
        // cycle before attaching it, replacing the old inline timer.
        if (uploaded.grace) {
          graceChecks = 1;
        }
      }
    }

    return { mediaUploads, poll, graceChecks };
  }

  private async prepareMediaBuffer(mediaUrl: string): Promise<Buffer> {
    const isGif = lookup(mediaUrl) === 'image/gif';

    // GIFs pass through untouched (sharp would break animation). Videos never
    // reach this function - they are streamed by uploadPicture instead.
    if (isGif) {
      // Buffer.from keeps the return type a real Buffer regardless of what
      // readOrFetch yields - uploadPicture branches on Buffer.isBuffer.
      return Buffer.from(await readOrFetch(mediaUrl));
    }

    const mime = lookup(mediaUrl);
    // PNG and JPEG (covers both .jpg and .jpeg) keep their original format;
    // anything else (webp, tiff, ...) is converted to jpeg for compatibility.
    const keepFormat = mime === 'image/png' || mime === 'image/jpeg';

    // Always downscale to stay under LinkedIn's 36,152,320-pixel cap: fit within
    // a 6000x6000 box (max 36,000,000 px for any aspect ratio) while preserving
    // the aspect ratio and never enlarging smaller images (downscale-only).
    // NOTE: this guard is required for self-hosted instances running with
    // DISABLE_IMAGE_COMPRESSION=true, where the frontend no longer shrinks
    // uploads and full-size images reach LinkedIn directly. Do not remove it on
    // the assumption that the frontend compression already caps dimensions.
    const pipeline = sharp(await readOrFetch(mediaUrl), { animated: false }).resize({
      width: 6000,
      height: 6000,
      fit: 'inside',
      withoutEnlargement: true,
    });

    return await (keepFormat ? pipeline : pipeline.toFormat('jpeg')).toBuffer();
  }

  private buildPostContent(isPdf: boolean, mediaIds: string[], pdfTitle?: string) {
    if (mediaIds.length === 0) {
      return {};
    }

    if (mediaIds.length === 1) {
      return {
        content: {
          media: {
            ...(isPdf ? { title: pdfTitle || 'slides' } : {}),
            id: mediaIds[0],
          },
        },
      };
    }

    return {
      content: {
        multiImage: {
          images: mediaIds.map((id) => ({ id })),
        },
      },
    };
  }

  private createLinkedInPostPayload(
    id: string,
    type: 'company' | 'personal',
    message: string,
    mediaIds: string[],
    isPdf: boolean,
    pdfTitle?: string
  ) {
    const author =
      type === 'personal' ? `urn:li:person:${id}` : `urn:li:organization:${id}`;

    return {
      author,
      commentary: this.fixText(message),
      visibility: 'PUBLIC',
      distribution: {
        feedDistribution: 'MAIN_FEED',
        targetEntities: [] as string[],
        thirdPartyDistributionChannels: [] as string[],
      },
      ...this.buildPostContent(isPdf, mediaIds, pdfTitle),
      lifecycleState: 'PUBLISHED',
      isReshareDisabledByAuthor: false,
    };
  }

  private async createMainPost(
    authorId: string,
    accessToken: string,
    message: string,
    mediaIds: string[],
    type: 'company' | 'personal',
    isPdf: boolean,
    pdfTitle?: string
  ): Promise<string> {
    const postPayload = this.createLinkedInPostPayload(
      authorId,
      type,
      message,
      mediaIds,
      isPdf,
      pdfTitle
    );

    const response = await this.fetch(`https://api.linkedin.com/rest/posts`, {
      method: 'POST',
      headers: {
        'LinkedIn-Version': '202601',
        'X-Restli-Protocol-Version': '2.0.0',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(postPayload),
    });

    if (response.status !== 201 && response.status !== 200) {
      throw new BadBody(
        this.identifier,
        '{}',
        JSON.stringify(postPayload),
        'Error posting to LinkedIn'
      );
    }

    return response.headers.get('x-restli-id')!;
  }

  private async createCommentPost(
    id: string,
    accessToken: string,
    post: PostDetails,
    parentPostId: string,
    type: 'company' | 'personal'
  ): Promise<string> {
    const actor =
      type === 'personal' ? `urn:li:person:${id}` : `urn:li:organization:${id}`;

    const response = await this.fetch(
      `https://api.linkedin.com/rest/socialActions/${encodeURIComponent(
        parentPostId
      )}/comments`,
      {
        method: 'POST',
        headers: {
        'LinkedIn-Version': '202306',
        'X-Restli-Protocol-Version': '2.0.0',
        'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          actor,
          object: parentPostId,
          message: {
            text: this.fixText(post.message),
          },
        }),
      }
    );

    const { object } = await response.json();
    return object;
  }

  private createPostResponse(
    postId: string,
    originalPostId: string,
    isMainPost: boolean = false
  ): PostResponse {
    const baseUrl = isMainPost
      ? 'https://www.linkedin.com/feed/update/'
      : 'https://www.linkedin.com/embed/feed/update/';

    return {
      status: 'posted',
      postId,
      id: originalPostId,
      releaseURL: `${baseUrl}${postId}`,
    };
  }

  async postPending(
    id: string,
    accessToken: string,
    postDetails: PostDetails<LinkedinDto>[],
    integration: Integration,
    type = 'personal' as 'company' | 'personal'
  ): Promise<PostResponse[]> {
    let processedPostDetails = postDetails;
    const [firstPost] = postDetails;
    const isPdf = this.assetBoolean(firstPost.settings?.post_as_images_carousel);

    // Check if we should convert images to PDF carousel
    if (isPdf) {
      processedPostDetails = await this.convertImagesToPdfCarousel(
        postDetails,
        firstPost
      );
    }

    const [processedFirstPost] = processedPostDetails;

    // Upload the media now; the asynchronous processing wait moves to
    // checkPostStatus and the post itself is only created by finalizePost, so
    // nothing here is irreversible - a failure leaves only orphaned media.
    const { mediaUploads, poll, graceChecks } = await this.processMediaForPosts(
      [processedFirstPost],
      accessToken,
      id,
      type
    );

    return [
      {
        id: processedFirstPost.id,
        releaseURL: '',
        postId: '',
        status: 'pending',
        pendingData: {
          authorId: id,
          postType: type,
          message: processedFirstPost.message,
          isPdf,
          ...(isPdf
            ? { pdfTitle: firstPost.settings?.carousel_name || 'slides' }
            : {}),
          mediaIds: (mediaUploads[processedFirstPost.id] || []).filter(Boolean),
          poll,
          graceChecks,
        } as LinkedinPendingData,
      },
    ];
  }

  override async checkPostStatus(
    accessToken: string,
    pendingData: LinkedinPendingData,
    integration: Integration
  ): Promise<PendingCheckResponse> {
    // A confirmed create attempt died without reporting its result: LinkedIn
    // gives no way to ask whether that post was created, so never run the
    // create again - stop with an explicit warning instead.
    if (pendingData.attempting && pendingData.confirmed) {
      throw new BadBody(
        this.identifier,
        '{}',
        '{}',
        'LinkedIn may have already published this post, please check your account before posting again to avoid duplicates'
      );
    }

    // Check every media that is still processing; keep the ones that have not
    // reached AVAILABLE yet for the next cycle.
    const stillProcessing: LinkedinPendingData['poll'] = [];
    for (const media of pendingData.poll || []) {
      let status: { status?: string; processingFailureReason?: string };
      try {
        status = await this.mediaProcessingStatus(
          accessToken,
          media.urn,
          media.endpoint
        );

        // A 200 without a status field can never reach AVAILABLE: count it
        // like a failed read instead of polling it forever.
        if (!status.status) {
          throw new Error('LinkedIn answered without a media status');
        }
      } catch (err) {
        if (err instanceof RefreshToken) {
          throw err;
        }

        // Persistent failures mean the media will never be confirmed ready:
        // fail with an accurate message - the post is only created after the
        // media is ready, so nothing was published.
        if ((pendingData.statusStalls || 0) >= 10) {
          throw new BadBody(
            this.identifier,
            '{}',
            '{}',
            'LinkedIn kept failing the media status check, nothing was published, please try again'
          );
        }

        // Transient status-check error: the media may finish processing just
        // fine, keep polling.
        return {
          status: 'pending',
          pendingData: {
            ...pendingData,
            statusStalls: (pendingData.statusStalls || 0) + 1,
          },
        };
      }

      if (status.status === 'PROCESSING_FAILED') {
        const label =
          media.endpoint === 'videos'
            ? 'video'
            : media.endpoint === 'documents'
            ? 'document'
            : 'image';
        throw new BadBody(
          this.identifier,
          JSON.stringify(status),
          '{}',
          `LinkedIn ${label} processing failed${
            status.processingFailureReason
              ? `: ${status.processingFailureReason}`
              : ''
          }`
        );
      }

      if (status.status !== 'AVAILABLE') {
        stillProcessing.push(media);
      }
    }

    if (stillProcessing.length) {
      // every media answered with a real status: the endpoint works, reset
      // the stall counter
      return {
        status: 'pending',
        pendingData: { ...pendingData, poll: stillProcessing, statusStalls: 0 },
      };
    }

    // Unpollable media (personal images/documents are write-only endpoints):
    // wait the remaining grace cycles before attaching them to the post.
    if (pendingData.graceChecks > 0) {
      return {
        status: 'pending',
        pendingData: {
          ...pendingData,
          poll: [],
          graceChecks: pendingData.graceChecks - 1,
        },
      };
    }

    // witness the armed create so finalizePost knows the attempt is uniquely
    // accounted for before it mutates anything
    if (pendingData.attempting && !pendingData.confirmed) {
      return {
        status: 'ready',
        pendingData: { ...pendingData, poll: [], confirmed: true },
      };
    }

    return { status: 'ready', pendingData: { ...pendingData, poll: [] } };
  }

  override async finalizePost(
    accessToken: string,
    pendingData: LinkedinPendingData,
    integration: Integration
  ): Promise<PendingCheckResponse> {
    // Create with an arm -> confirm -> publish handshake: the create only runs
    // after checkPostStatus witnessed the intent, so a run that dies
    // mid-create is detectable and the post is never published twice.
    if (!pendingData.attempting || !pendingData.confirmed) {
      return {
        status: 'pending',
        pendingData: { ...pendingData, attempting: true, confirmed: false },
      };
    }

    const mainPostId = await this.createMainPost(
      pendingData.authorId,
      accessToken,
      pendingData.message,
      (pendingData.mediaIds || []).filter(Boolean),
      pendingData.postType,
      pendingData.isPdf,
      pendingData.pdfTitle
    );

    return {
      status: 'completed',
      postId: mainPostId,
      releaseURL: `https://www.linkedin.com/feed/update/${mainPostId}`,
    };
  }

  // Old blocking behavior, kept for workflow versions before v1.0.6 that still
  // run and don't know how to resolve a `pending` response - they wait for the
  // media processing and create the post inside the activity like before.
  async post(
    id: string,
    accessToken: string,
    postDetails: PostDetails<LinkedinDto>[],
    integration: Integration,
    type = 'personal' as 'company' | 'personal'
  ): Promise<PostResponse[]> {
    const [response] = await this.postPending(
      id,
      accessToken,
      postDetails,
      integration,
      type
    );

    let pendingData = response.pendingData;
    const started = Date.now();

    // eslint-disable-next-line no-constant-condition
    while (true) {
      // Cap below the 10-minute activity timeout of the old workflows using
      // this method: failing here is safe (the post is only created once all
      // the media is ready), timing the activity out is not - a retried
      // activity would upload and publish again.
      if (Date.now() - started > 8 * 60 * 1000) {
        throw new BadBody(
          this.identifier,
          '{}',
          '{}',
          'LinkedIn took too long to process the media, please try again'
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
        return [this.createPostResponse(result.postId, response.id, true)];
      }

      // finalize only armed the handshake (nothing to wait for), loop straight
      // into the witnessing check
      pendingData = result.pendingData;
    }
  }

  async comment(
    id: string,
    postId: string,
    lastCommentId: string | undefined,
    accessToken: string,
    postDetails: PostDetails<LinkedinDto>[],
    integration: Integration,
    type = 'personal' as 'company' | 'personal'
  ): Promise<PostResponse[]> {
    const [commentPost] = postDetails;

    const commentPostId = await this.createCommentPost(
      id,
      accessToken,
      commentPost,
      postId,
      type
    );

    return [this.createPostResponse(commentPostId, commentPost.id, false)];
  }

  @PostPlug({
    identifier: 'linkedin-add-comment',
    title: 'Add comments by a different account',
    description: 'Add accounts to comment on your post',
    pickIntegration: ['linkedin', 'linkedin-page'],
    fields: [
      {
        name: 'comment',
        description: 'The comment to add to the post',
        type: 'textarea',
        placeholder: 'Enter your comment here',
      },
    ],
  })
  async addComment(
    integration: Integration,
    originalIntegration: Integration,
    postId: string,
    information: any,
    isPersonal = true
  ) {
    return this.comment(
      integration.internalId,
      postId,
      undefined,
      integration.token,
      [
        {
          id: makeId(10),
          message: information.comment,
          media: [],
          settings: {
            post_as_images_carousel: false,
          },
        },
      ],
      integration,
      isPersonal ? 'personal' : 'company'
    );
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
    await this.fetch(`https://api.linkedin.com/rest/posts`, {
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
        'LinkedIn-Version': '202601',
        Authorization: `Bearer ${integration.token}`,
      },
    });
  }

  override async mention(token: string, data: { query: string }) {
    const { elements } = await (
      await fetch(
        `https://api.linkedin.com/v2/organizations?q=vanityName&vanityName=${encodeURIComponent(
          data.query
        )}&projection=(elements*(id,localizedName,logoV2(original~:playableStreams)))`,
        {
          headers: {
            'X-Restli-Protocol-Version': '2.0.0',
            'Content-Type': 'application/json',
            'LinkedIn-Version': '202601',
            Authorization: `Bearer ${token}`,
          },
        }
      )
    ).json();

    return elements.map((p: any) => ({
      id: String(p.id),
      label: p.localizedName,
      image:
        p.logoV2?.['original~']?.elements?.[0]?.identifiers?.[0]?.identifier ||
        '',
    }));
  }

  mentionFormat(idOrHandle: string, name: string) {
    return `@[${name.replace('@', '')}](urn:li:organization:${idOrHandle})`;
  }
}
