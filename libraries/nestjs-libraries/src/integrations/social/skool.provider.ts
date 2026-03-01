import { makeId } from '@gitroom/nestjs-libraries/services/make.is';
import { SocialAbstract } from '../social.abstract';
import {
  AuthTokenDetails,
  MediaContent,
  PostDetails,
  PostResponse,
  SocialProvider,
} from './social.integrations.interface';
import dayjs from 'dayjs';
import { Integration } from '@prisma/client';
import { Tool } from '@gitroom/nestjs-libraries/integrations/tool.decorator';
import { SkoolDto } from '@gitroom/nestjs-libraries/dtos/posts/providers-settings/skool.dto';
import { AuthService } from '@gitroom/helpers/auth/auth.service';

export class SkoolProvider extends SocialAbstract implements SocialProvider {
  identifier = 'skool';
  name = 'Skool';
  isBetweenSteps = false;
  isChromeExtension = true;
  scopes = [] as string[];
  editor = 'normal' as const;
  dto = SkoolDto;

  extensionCookies = [
    { name: 'client_id', domain: '.skool.com' },
    { name: 'auth_token', domain: '.skool.com' },
  ];

  private getCookies(integration: Integration): {
    client_id: string;
    auth_token: string;
  } {
    return AuthService.verifyJWT(integration.customInstanceDetails!) as {
      client_id: string;
      auth_token: string;
    };
  }

  override handleErrors(
    body: string
  ):
    | { type: 'refresh-token' | 'bad-body' | 'retry'; value: string }
    | undefined {
    if (body.includes('must be admin or level')) {
      return { type: 'bad-body', value: 'You can\'t post to this channel' };
    }
    if (body.includes('cannot post to this label')) {
      return { type: 'bad-body', value: 'Cannot post to this label' };
    }
    return undefined;
  }

  maxLength() {
    return 5000;
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
    try {
      const cookies: Record<string, string> = JSON.parse(
        Buffer.from(params.code, 'base64').toString()
      );

      const missing = this.extensionCookies
        .map((c) => c.name)
        .filter((name) => !cookies[name]);

      if (missing.length > 0) {
        return `Missing required cookies: ${missing.join(', ')}`;
      }

      const data = await (
        await fetch('https://api2.skool.com/self', {
          method: 'GET',
          headers: {
            Cookie: `auth_token=${cookies.auth_token}; client_id=${cookies.client_id}`,
          },
        })
      ).json();

      return {
        refreshToken: '',
        expiresIn: dayjs().add(100, 'year').unix() - dayjs().unix(),
        accessToken: AuthService.signJWT(cookies),
        id: data.id,
        name: data.first_name + ' ' + data.last_name,
        picture: data.metadata.picture_profile || '',
        username: data.name,
      };
    } catch (e) {
      return 'Invalid cookie data';
    }
  }

  @Tool({ description: 'Groups', dataSchema: [] })
  async groups(accessToken: string, params: any, id: string, integration: Integration) {
    try {
      const { client_id, auth_token } = this.getCookies(integration);
      const { groups } = await (
        await fetch(
          `https://api2.skool.com/users/${id}/groups?offset=0&limit=30`,
          {
            headers: {
              Cookie: `auth_token=${auth_token}; client_id=${client_id}`,
            },
          }
        )
      ).json();

      return groups.map((p: any) => ({
        id: String(p.id),
        name: p.metadata.display_name,
      }));
    } catch (err) {
      return [];
    }
  }

  @Tool({ description: 'Label', dataSchema: [] })
  async label(accessToken: string, params: any, id: string, integration: Integration) {
    try {
      const { client_id, auth_token } = this.getCookies(integration);
      const { metadata } = await (
        await this.fetch(`https://api2.skool.com/groups/${params.id}`, {
          headers: {
            Cookie: `auth_token=${auth_token}; client_id=${client_id}`,
          },
        })
      ).json();

      if (!metadata.labels || metadata.labels.length === 0) {
        return [{ id: 'none', name: 'Default Label' }];
      }

      const labels = metadata.labels.split(',');

      if (labels.length === 0) {
        return [{ id: 'none', name: 'Default Label' }];
      }

      const labelInformation = await Promise.all(
        labels.map(async (labelId: string) => {
          return (
            await this.fetch(`https://api2.skool.com/labels/${labelId}`, {
              headers: {
                Cookie: `auth_token=${auth_token}; client_id=${client_id}`,
              },
            })
          ).json();
        })
      );

      return labelInformation.map((p: any) => ({
        id: String(p.id),
        name: p.metadata.display_name,
      }));
    } catch (err) {
      return [];
    }
  }

  private async uploadMediaToSkool(
    media: MediaContent[],
    userId: string,
    cookies: { client_id: string; auth_token: string }
  ): Promise<string> {
    if (!media || media.length === 0) return '';

    const fileIds: string[] = [];

    for (const item of media) {
      const fileResponse = await fetch(item.path);
      const fileBuffer = await fileResponse.arrayBuffer();
      const contentType =
        fileResponse.headers.get('content-type') || 'application/octet-stream';
      const fileName = item.path.split('/').pop() || 'file';

      const createFileResponse = await (
        await this.fetch('https://api2.skool.com/files', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Cookie: `auth_token=${cookies.auth_token}; client_id=${cookies.client_id}`,
          },
          body: JSON.stringify({
            file_name: fileName,
            content_type: contentType,
            content_length: fileBuffer.byteLength,
            content_disposition: '',
            ref: '',
            owner_id: userId,
            large_thumbnail: false,
          }),
        }, 'create file record')
      ).json();

      await fetch(createFileResponse.write_url, {
        method: 'PUT',
        headers: {
          'Content-Type': createFileResponse.content_type,
          'x-amz-acl': createFileResponse.acl,
        },
        body: fileBuffer,
      });

      fileIds.push(createFileResponse.file.id);
    }

    return fileIds.join(',');
  }

  async post(
    id: string,
    accessToken: string,
    postDetails: PostDetails[],
    integration: Integration
  ): Promise<PostResponse[]> {
    const { client_id, auth_token } = this.getCookies(integration);
    const [post] = postDetails;

    const attachments = await this.uploadMediaToSkool(
      post.media || [],
      id,
      { client_id, auth_token }
    );

    const { id: postId, name } = await (
      await this.fetch('https://api2.skool.com/posts?follow=true', {
        method: 'POST',
        headers: {
          Cookie: `auth_token=${auth_token}; client_id=${client_id}`,
        },
        body: JSON.stringify({
          post_type: 'generic',
          group_id: post.settings.group,
          metadata: {
            title: post.settings.title,
            content: post.message,
            attachments,
            ...(post.settings.label && post.settings.label !== 'none'
              ? { labels: post.settings.label }
              : {}),
            action: 0,
            video_ids: '',
          },
        }),
      })
    ).json();

    return [
      {
        id: String(postId),
        postId,
        releaseURL: `https://www.skool.com/${post.settings.group}/${name}`,
        status: 'success',
      },
    ];
  }

  async comment(
    id: string,
    postId: string,
    lastCommentId: string | undefined,
    accessToken: string,
    postDetails: PostDetails[],
    integration: Integration
  ): Promise<PostResponse[]> {
    const { client_id, auth_token } = this.getCookies(integration);
    const [post] = postDetails;

    const attachments = await this.uploadMediaToSkool(
      post.media || [],
      id,
      { client_id, auth_token }
    );

    const { id: postIdFinal, name } = await (
      await this.fetch('https://api2.skool.com/posts?follow=true', {
        method: 'POST',
        headers: {
          Cookie: `auth_token=${auth_token}; client_id=${client_id}`,
        },
        body: JSON.stringify({
          post_type: 'comment',
          group_id: post.settings.group,
          root_id: postId,
          parent_id: lastCommentId || postId,
          metadata: {
            title: '',
            content: post.message,
            attachments,
            action: 0,
            video_ids: '',
          },
        }),
      })
    ).json();

    return [
      {
        id: String(id),
        postId: postIdFinal,
        releaseURL: `https://www.skool.com/${post.settings.group}/${name}`,
        status: 'success',
      },
    ];
  }
}
