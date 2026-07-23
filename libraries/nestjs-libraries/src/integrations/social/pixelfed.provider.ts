import {
  ClientInformation,
  PostDetails,
  PostResponse,
} from '@gitroom/nestjs-libraries/integrations/social/social.integrations.interface';
import { MastodonCompatibleAbstract } from '@gitroom/nestjs-libraries/integrations/social/mastodon-compatible.abstract';
import { makeId } from '@gitroom/nestjs-libraries/services/make.is';
import { Integration } from '@prisma/client';
import { ValidityMedia } from '@gitroom/nestjs-libraries/integrations/social.abstract';
import {
  PIXELFED_DEFAULT_LIMITS,
  parsePixelfedLimits,
  PixelfedLimits,
  validatePixelfedPost,
} from '@gitroom/nestjs-libraries/integrations/social/pixelfed.policy';

type PixelfedInstanceDetails = ClientInformation & {
  pixelfedLimits?: PixelfedLimits;
};

export class PixelfedProvider extends MastodonCompatibleAbstract {
  override maxConcurrentJob = 5;
  override refreshCron = true;
  identifier = 'pixelfed';
  name = 'Pixelfed';
  isBetweenSteps = false;
  scopes = ['read', 'write'];
  editor = 'normal' as const;

  maxLength() {
    return PIXELFED_DEFAULT_LIMITS.maxCharacters;
  }

  async externalUrl(url: string) {
    const [application, instance] = await Promise.all([
      this.registerApplication(url),
      this.requestInstanceJson<unknown>(url, '/api/v1/instance'),
    ]);

    return {
      ...application,
      pixelfedLimits: parsePixelfedLimits(instance),
    };
  }

  async generateAuthUrl(external?: ClientInformation) {
    const state = makeId(6);
    const url = this.generateUrlDynamic(
      external?.instanceUrl!,
      state,
      external?.client_id!
    );

    return {
      url,
      codeVerifier: makeId(10),
      state,
    };
  }

  async authenticate(
    params: {
      code: string;
      codeVerifier: string;
      refresh?: string;
    },
    clientInformation?: ClientInformation
  ) {
    return this.dynamicAuthenticate(
      clientInformation?.client_id!,
      clientInformation?.client_secret!,
      clientInformation?.instanceUrl!,
      params.code
    );
  }

  private async getPixelfedInstanceDetails(
    integration: Integration
  ): Promise<PixelfedInstanceDetails> {
    const details = this.getInstanceDetails(
      integration
    ) as PixelfedInstanceDetails;
    if (!details.pixelfedLimits) {
      const instance = await this.requestInstanceJson<unknown>(
        details.instanceUrl,
        '/api/v1/instance'
      );
      details.pixelfedLimits = parsePixelfedLimits(instance);
    }
    return details;
  }

  async post(
    id: string,
    accessToken: string,
    postDetails: PostDetails[],
    integration: Integration
  ): Promise<PostResponse[]> {
    const details = await this.getPixelfedInstanceDetails(integration);
    const validity = validatePixelfedPost(
      postDetails[0],
      details.pixelfedLimits!,
      true
    );
    if (validity !== true) {
      throw new Error(validity);
    }
    return this.dynamicPost(
      id,
      accessToken,
      details.instanceUrl,
      postDetails,
      details.pixelfedLimits
    );
  }

  async comment(
    id: string,
    postId: string,
    lastCommentId: string | undefined,
    accessToken: string,
    postDetails: PostDetails[],
    integration: Integration
  ): Promise<PostResponse[]> {
    const details = await this.getPixelfedInstanceDetails(integration);
    const validity = validatePixelfedPost(
      postDetails[0],
      details.pixelfedLimits!,
      false
    );
    if (validity !== true) {
      throw new Error(validity);
    }
    return this.dynamicComment(
      id,
      postId,
      lastCommentId,
      accessToken,
      details.instanceUrl,
      postDetails,
      details.pixelfedLimits
    );
  }

  override async checkValidity(
    items: Array<ValidityMedia[]>
  ): Promise<string | true> {
    const [firstPost] = items ?? [];
    if (!firstPost?.length) {
      return 'Pixelfed requires at least one media attachment.';
    }
    if (firstPost.length > PIXELFED_DEFAULT_LIMITS.maxMediaAttachments) {
      return `Pixelfed supports up to ${PIXELFED_DEFAULT_LIMITS.maxMediaAttachments} media attachments by default.`;
    }
    return true;
  }
}
