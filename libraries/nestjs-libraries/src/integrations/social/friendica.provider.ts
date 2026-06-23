import {
  ClientInformation,
  PostDetails,
  PostResponse,
} from '@gitroom/nestjs-libraries/integrations/social/social.integrations.interface';
import { MastodonCompatibleAbstract } from '@gitroom/nestjs-libraries/integrations/social/mastodon-compatible.abstract';
import { makeId } from '@gitroom/nestjs-libraries/services/make.is';
import { Integration } from '@prisma/client';

export class FriendicaProvider extends MastodonCompatibleAbstract {
  override maxConcurrentJob = 5;
  override refreshCron = true;
  identifier = 'friendica';
  name = 'Friendica';
  isBetweenSteps = false;
  scopes = ['read', 'write'];
  editor = 'normal' as const;

  maxLength() {
    return 200000;
  }

  async externalUrl(url: string) {
    return this.registerApplication(url);
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

  async post(
    id: string,
    accessToken: string,
    postDetails: PostDetails[],
    integration: Integration
  ): Promise<PostResponse[]> {
    const { instanceUrl } = this.getInstanceDetails(integration);
    return this.dynamicPost(id, accessToken, instanceUrl, postDetails);
  }

  async comment(
    id: string,
    postId: string,
    lastCommentId: string | undefined,
    accessToken: string,
    postDetails: PostDetails[],
    integration: Integration
  ): Promise<PostResponse[]> {
    const { instanceUrl } = this.getInstanceDetails(integration);
    return this.dynamicComment(
      id,
      postId,
      lastCommentId,
      accessToken,
      instanceUrl,
      postDetails
    );
  }
}
