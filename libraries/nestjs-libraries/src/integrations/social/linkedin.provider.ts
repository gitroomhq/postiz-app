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
import { SocialAbstract } from '@gitroom/nestjs-libraries/integrations/social.abstract';
import { Integration } from '@prisma/client';
import { PostPlug } from '@gitroom/helpers/decorators/post.plug';
import { LinkedinDto } from '@gitroom/nestjs-libraries/dtos/posts/providers-settings/linkedin.dto';
import imageToPDF from 'image-to-pdf';
import { Readable } from 'stream';

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
  refreshWait = true;
  editor = 'normal' as const;

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
      await this.fetch('https://api.linkedin.com/v2/me', {
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
      await this.fetch('https://api.linkedin.com/v2/userinfo', {
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
      picture,
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
      await this.fetch('https://www.linkedin.com/oauth/v2/accessToken', {
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
      await this.fetch('https://api.linkedin.com/v2/userinfo', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })
    ).json();

    const { vanityName } = await (
      await this.fetch('https://api.linkedin.com/v2/me', {
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
      await this.fetch(
        `https://api.linkedin.com/v2/organizations?q=vanityName&vanityName=${getCompanyVanity[1]}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'X-Restli-Protocol-Version': '2.0.0',
            'LinkedIn-Version': '202501',
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
    picture: any,
    type = 'personal' as 'company' | 'personal'
  ) {
    // Determine the appropriate endpoint based on file type
    const isVideo = fileName.indexOf('mp4') > -1;
    const isPdf = fileName.toLowerCase().indexOf('pdf') > -1;

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
            'LinkedIn-Version': '202501',
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
                    fileSizeBytes: picture.length,
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
    for (let i = 0; i < picture.length; i += 1024 * 1024 * 2) {
      const upload = await this.fetch(sendUrlRequest, {
        method: 'PUT',
        headers: {
          'X-Restli-Protocol-Version': '2.0.0',
          'LinkedIn-Version': '202501',
          Authorization: `Bearer ${accessToken}`,
          ...(isVideo
            ? { 'Content-Type': 'application/octet-stream' }
            : isPdf
            ? { 'Content-Type': 'application/pdf' }
            : {}),
        },
        body: picture.slice(i, i + 1024 * 1024 * 2),
      });

      etags.push(upload.headers.get('etag'));
    }

    if (isVideo) {
      const a = await this.fetch(
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
            'LinkedIn-Version': '202501',
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
    }

    return finalOutput;
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
    // Collect all images from all posts
    const allImages = postDetails.flatMap(
      (post) =>
        post.media?.filter(
          (media) =>
            media.path.toLowerCase().includes('.jpg') ||
            media.path.toLowerCase().includes('.jpeg') ||
            media.path.toLowerCase().includes('.png')
        ) || []
    );

    if (allImages.length === 0) {
      return postDetails;
    }

    // Convert images to buffers and get dimensions
    const imageData = await Promise.all(
      allImages.map(async (media) => {
        const buffer = await readOrFetch(media.path);
        const image = sharp(buffer, {
          animated: lookup(media.path) === 'image/gif',
        });
        const metadata = await image.metadata();

        return {
          buffer,
          width: metadata.width || 0,
          height: metadata.height || 0,
        };
      })
    );

    // Use the dimensions of the first image for the PDF page size
    // You could also use the largest dimensions if you prefer
    const firstImageDimensions = imageData[0];
    const pageSize = [firstImageDimensions.width, firstImageDimensions.height];

    // Convert images to PDF with exact image dimensions
    const pdfStream = imageToPDF(
      imageData.map((data) => data.buffer),
      pageSize
    );

    // Convert stream to buffer
    const pdfBuffer = await this.streamToBuffer(pdfStream);

    // Create a temporary file-like object for the PDF
    const pdfMedia = {
      path: 'carousel.pdf',
      buffer: pdfBuffer,
    };

    // Return modified post details with PDF instead of images
    const modifiedFirstPost = {
      ...firstPost,
      media: [pdfMedia] as any[],
    };

    // Remove media from other posts since we're combining everything into one PDF
    const modifiedRestPosts = postDetails.slice(1).map((post) => ({
      ...post,
      media: [] as any[],
    }));

    return [modifiedFirstPost, ...modifiedRestPosts];
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
  ): Promise<Record<string, string[]>> {
    const mediaUploads = await Promise.all(
      postDetails.flatMap(
        (post) =>
          post.media?.map(async (media) => {
            let mediaBuffer: Buffer;

            // Check if media has a buffer (from PDF conversion)
            if (
              media &&
              typeof media === 'object' &&
              'buffer' in media &&
              Buffer.isBuffer(media.buffer)
            ) {
              mediaBuffer = (media as any).buffer;
            } else {
              mediaBuffer = await this.prepareMediaBuffer(media.path);
            }

            const uploadedMediaId = await this.uploadPicture(
              media.path,
              accessToken,
              personId,
              mediaBuffer,
              type
            );

            return {
              id: uploadedMediaId,
              postId: post.id,
            };
          }) || []
      )
    );

    return mediaUploads.reduce((acc, upload) => {
      if (!upload?.id) return acc;

      acc[upload.postId] = acc[upload.postId] || [];
      acc[upload.postId].push(upload.id);
      return acc;
    }, {} as Record<string, string[]>);
  }

  private async prepareMediaBuffer(mediaUrl: string): Promise<Buffer> {
    const isVideo = mediaUrl.indexOf('mp4') > -1;

    if (isVideo) {
      return Buffer.from(await readOrFetch(mediaUrl));
    }

    return await sharp(await readOrFetch(mediaUrl), {
      animated: lookup(mediaUrl) === 'image/gif',
    })
      .toFormat('jpeg')
      .resize({ width: 1000 })
      .toBuffer();
  }

  private buildPostContent(isPdf: boolean, mediaIds: string[]) {
    if (mediaIds.length === 0) {
      return {};
    }

    if (mediaIds.length === 1) {
      return {
        content: {
          media: {
            ...(isPdf ? { title: 'slides.pdf' } : {}),
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
    isPdf: boolean
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
      ...this.buildPostContent(isPdf, mediaIds),
      lifecycleState: 'PUBLISHED',
      isReshareDisabledByAuthor: false,
    };
  }

  private async createMainPost(
    id: string,
    accessToken: string,
    firstPost: PostDetails,
    mediaIds: string[],
    type: 'company' | 'personal',
    isPdf: boolean
  ): Promise<string> {
    const postPayload = this.createLinkedInPostPayload(
      id,
      type,
      firstPost.message,
      mediaIds,
      isPdf
    );

    const response = await this.fetch('https://api.linkedin.com/rest/posts', {
      method: 'POST',
      headers: {
        'LinkedIn-Version': '202501',
        'X-Restli-Protocol-Version': '2.0.0',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(postPayload),
    });

    if (response.status !== 201 && response.status !== 200) {
      throw new Error('Error posting to LinkedIn');
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
      `https://api.linkedin.com/v2/socialActions/${decodeURIComponent(
        parentPostId
      )}/comments`,
      {
        method: 'POST',
        headers: {
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

  async post(
    id: string,
    accessToken: string,
    postDetails: PostDetails<LinkedinDto>[],
    integration: Integration,
    type = 'personal' as 'company' | 'personal'
  ): Promise<PostResponse[]> {
    let processedPostDetails = postDetails;
    const [firstPost] = postDetails;

    // Check if we should convert images to PDF carousel
    if (firstPost.settings?.post_as_images_carousel) {
      processedPostDetails = await this.convertImagesToPdfCarousel(
        postDetails,
        firstPost
      );
    }

    const [processedFirstPost, ...restPosts] = processedPostDetails;

    // Process and upload media for all posts
    const uploadedMedia = await this.processMediaForPosts(
      processedPostDetails,
      accessToken,
      id,
      type
    );

    // Get media IDs for the main post
    const mainPostMediaIds = (
      uploadedMedia[processedFirstPost.id] || []
    ).filter(Boolean);

    // Create the main LinkedIn post
    const mainPostId = await this.createMainPost(
      id,
      accessToken,
      processedFirstPost,
      mainPostMediaIds,
      type,
      !!firstPost.settings?.post_as_images_carousel
    );

    // Build response array starting with main post
    const responses: PostResponse[] = [
      this.createPostResponse(mainPostId, processedFirstPost.id, true),
    ];

    // Create comment posts for remaining posts
    for (const post of restPosts) {
      const commentPostId = await this.createCommentPost(
        id,
        accessToken,
        post,
        mainPostId,
        type
      );

      responses.push(this.createPostResponse(commentPostId, post.id, false));
    }

    return responses;
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
        'LinkedIn-Version': '202504',
        Authorization: `Bearer ${integration.token}`,
      },
    });
  }

  override async mention(token: string, data: { query: string }) {
    const { elements } = await (
      await this.fetch(
        `https://api.linkedin.com/v2/organizations?q=vanityName&vanityName=${encodeURIComponent(
          data.query
        )}&projection=(elements*(id,localizedName,logoV2(original~:playableStreams)))`,
        {
          headers: {
            'X-Restli-Protocol-Version': '2.0.0',
            'Content-Type': 'application/json',
            'LinkedIn-Version': '202504',
            Authorization: `Bearer ${token}`,
          },
        }
      )
    ).json();

    return elements.map((p: any) => ({
      id: String(p.id),
      label: p.localizedName,
      image: p.logoV2?.['original~']?.elements?.[0]?.identifiers?.[0]?.identifier || '',
    }));
  }

  mentionFormat(idOrHandle: string, name: string) {
    return `@[${name.replace('@', '')}](urn:li:organization:${idOrHandle})`;
  }
}
