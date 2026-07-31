import { AuthService } from "@gitroom/helpers/auth/auth.service";
import { SocialAbstract, ValidityMedia } from "@gitroom/nestjs-libraries/integrations/social.abstract";
import { AuthTokenDetails, ClientInformation, GenerateAuthUrlResponse, PostDetails, PostResponse, SocialProvider } from "@gitroom/nestjs-libraries/integrations/social/social.integrations.interface";
import { makeId } from "@gitroom/nestjs-libraries/services/make.is";
import { Integration } from "@prisma/client";
import axios from "axios";

interface PeerTubeClientToken {
  client_id: string;
  client_secret: string;
}

interface PeerTubeUserToken {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

interface PeerTubeProfile {
  id: number;
  username: string;
  account?: {
    displayName?: string;
    avatar?: { path: string } | null;
  };
  videoChannels?: { id: number; name: string; displayName: string }[];
}

export class PeerTubeProvider extends SocialAbstract implements SocialProvider {
  name = "PeerTube";
  identifier = "peertube";
  editor = "markdown" as const;
  isBetweenSteps = false;
  scopes: string[] = [];

  maxLength() {
    return 10000;   //peertube description max length is 10000 characters
  }

  override async checkValidity(posts: Array<ValidityMedia[]>): Promise<string | true> {
    const hasVideo = posts[0];

    if (!hasVideo || hasVideo.length === 0) {
      return "PeerTube requires a video file"
    }
    if (hasVideo.length > 1) {
      return 'PeerTube only supports one video per post';
    }
    return true;
  }

  async customFields() {
    return [
      {
        key: "instanceUrl",
        label: "PeerTube URL",
        defaultValue: "",
        validation: `/^https?:\\/\\/.+$/`,
        type: "text" as const,
        hint: "Your PeerTube Instance should be a valid URL e.g https://clip.place"
      },
      {
        key: "username",
        label: "Username",
        defaultValue: "",
        validation: `^[a-z0-9._]+$/`,   // regex applied from PeerTube official docs: https://docs.joinpeertube.org/api-rest-reference.html#tag/Session/operation/getOAuthToken 
        type: "text" as const,
        hint: "Username of your Peertube instance",
      },
      {
        key: "password",
        label: "Password",
        defaultValue: "",
        validation: `/^.{6,50}$/`,  // PeerTube accepts min:6chars, max:50chars
        type: "password" as const,
        hint: "Password to your Peertube instance"
      }
    ]
  }

  override handleErrors(
    body: string,
    status?: number
  ):
    |
    {
      type: "refresh-token" | "bad-body" | "retry",
      value: string
    }
    | undefined {
    if (status === 401) {
      return {
        type: "refresh-token",
        value: "Peertube Token expired"
      }
    }

    if (this.hasErrorCode(body, 403)) {
      return {
        type: "bad-body",
        value: "Video didn't pass upload filter"
      }
    }

    if (this.hasErrorCode(body, 408)) {
      return {
        type: "bad-body",
        value: "Upload has timed out!"
      }
    }

    if (status == 413) {
      if (!body) {
        return {
          type: "bad-body",
          value: "Video exceeds the server's upload size limit (rejected by proxy)"
        }
      }

      try {
        const { code } = JSON.parse(body) as { code?: string };

        if (code === 'quota_reached') {
          return {
            type: "bad-body",
            value: "Instance upload allowance reached!"
          }
        }
      } catch {
        // Response wasn't valid JSON
      }

      return {
        type: "bad-body",
        value: "Video file too large"
      }
    }

    if (this.hasErrorCode(body, 415)) {
      return {
        type: "bad-body",
        value: "Video type unsupported"
      }
    }

    if (this.hasErrorCode(body, 422)) {
      return {
        type: "bad-body",
        value: "Video un-readable"
      }
    }

    return undefined;

  }

  private hasErrorCode(body: string, code: number) {
    return new RegExp(`(?:\\b|\\.)${code}\\b`).test(body);
  }

  async generateAuthUrl(clientInformation?: ClientInformation): Promise<GenerateAuthUrlResponse> {
    const state = makeId(6);

    return {
      url: state,
      codeVerifier: makeId(10),
      state,
    }
  }

  async authenticate(
    params: {
      code: string;
      codeVerifier: string;
      refresh?: string;
    },
    clientInformation?: ClientInformation   // is empty because no externalUrl for Peertube
  ): Promise<AuthTokenDetails | string> {

    //decode base-64 encoded json blob
    const originalData = JSON.parse(Buffer.from(params.code, 'base64').toString());

    //get instanceUrl, username and password
    const { instanceUrl, username, password } = originalData;

    if (!instanceUrl || !username || !password) {
      return "Missing PeerTube instanceUrl, username or password";
    }

    const normalizedUrl = this.normalizeUrl(instanceUrl);

    let clientToken: PeerTubeClientToken;
    try {
      clientToken = await this.requestClientToken(normalizedUrl);
    } catch {
      return 'Could not reach the PeerTube instance';
    }

    let userToken: PeerTubeUserToken;
    try {
      userToken = await this.requestUserToken(
        normalizedUrl,
        new URLSearchParams({
          client_id: clientToken.client_id,
          client_secret: clientToken.client_secret,
          grant_type: 'password',
          username,
          password,
        })
      );
    } catch {
      return 'Invalid PeerTube username or password';
    }

    const profile = await this.requestUserProfile(
      normalizedUrl,
      userToken.access_token
    );

    return {
      id: String(profile.id),
      name: profile.account?.displayName || profile.username,
      username: profile.username,
      accessToken: userToken.access_token,
      refreshToken: `${normalizedUrl}::${userToken.refresh_token}`,
      expiresIn: userToken.expires_in,
      picture: profile.account?.avatar?.path
        ? `${normalizedUrl}${profile.account.avatar.path}`
        : '',
      additionalSettings: [
        {
          title: 'PeerTube Channels',
          description: 'Channels available on this instance (auto-detected)',
          type: 'text',
          value: JSON.stringify(
            (profile.videoChannels || []).map((c) => ({
              id: c.id,
              name: c.displayName || c.name,
            }))
          ),
        },
      ],
    };
  }

  async refreshToken(refreshToken: string): Promise<AuthTokenDetails> {
    const [instanceUrl, actualRefreshToken] = refreshToken.split("::");

    if (!instanceUrl || !actualRefreshToken) {
      throw new Error('Malformed PeerTube refresh token');
    }

    const clientToken = await this.requestClientToken(instanceUrl);

    const tokens = await this.requestUserToken(
      instanceUrl,
      new URLSearchParams({
        client_id: clientToken.client_id,
        client_secret: clientToken.client_secret,
        grant_type: 'refresh_token',
        refresh_token: actualRefreshToken,
      })
    );

    const profile = await this.requestUserProfile(
      instanceUrl,
      tokens.access_token
    );

    return {
      id: String(profile.id),
      name: profile.account?.displayName || profile.username,
      username: profile.username,
      accessToken: tokens.access_token,
      refreshToken: `${instanceUrl}::${tokens.refresh_token}`,
      expiresIn: tokens.expires_in,
      picture: profile.account?.avatar?.path
        ? `${instanceUrl}${profile.account.avatar.path}`
        : '',
      additionalSettings: [
        {
          title: 'PeerTube Channels',
          description: 'Channels available on this instance (auto-detected)',
          type: 'text',
          value: JSON.stringify(
            (profile.videoChannels || []).map((c) => ({
              id: c.id,
              name: c.displayName || c.name,
            }))
          ),
        },
      ],
    };
  }

  async post(
    id: string,
    accessToken: string,
    postDetails: PostDetails[],
    integration: Integration
  ): Promise<PostResponse[]> {
    // PeerTube doesn't provide an `externalUrl` and use CustomFields for authentication, so during authentication we pass the
    // `customField` as: AuthService.fixedEncryption(Buffer.from(body.code, 'base64').toString()). to _integrationService.createOrUpdateIntegration()
    // `_integrationService.createOrUpdateIntegration()` upserts this into the database
    // as `CustomInstanceDetails`.

    // Since `instanceUrl`, `username`, and `password` from CustomField was
    // `fixedEncrypted`, we can retrieve them by using `fixedDecryption` because
    // We need the decrypted `instanceUrl` when creating a post.

    const { instanceUrl } = JSON.parse(AuthService.fixedDecryption(integration.customInstanceDetails));

    const results: PostResponse[] = [];
    for (const post of postDetails) {
      const media = post.media?.[0];
      const thumbnailPath = post.settings?.thumbnail?.path;

      if (!media) {
        throw new Error('PeerTube requires a video file to post');
      }

      const videoResponse = await axios.get(media.path, {
        responseType: 'arraybuffer',
      });

      // Getting thumbnail if user uploaded it
      let thumbnailResponse;
      if (thumbnailPath) {
        thumbnailResponse = await axios.get(thumbnailPath, {
          responseType: 'arraybuffer',
        })
      }

      const videoBuffer = Buffer.from(videoResponse.data);
      const thumbnailBuffer = thumbnailResponse ? Buffer.from(thumbnailResponse.data) : undefined;

      // Request Body Schema as per PeerTube API reference -> https://docs.joinpeertube.org/api-rest-reference.html#tag/Video-Upload
      const form = new FormData();
      form.append(
        'videofile',
        new Blob([videoBuffer]),
        media.path.split('/').pop() || 'video.mp4'
      );
      form.append('name', (post.settings?.title).slice(0, 120));
      form.append('description', post.message);
      form.append('channelId', (post.settings?.channelId));
      form.append('privacy', (post.settings?.privacy || 1)); // 1 = public, 2 = unlisted and 3 = private
      if (thumbnailBuffer) {
        form.append
          ('thumbnailfile',
            new Blob([thumbnailBuffer], { type: 'image/jpeg' }),
            //outputs file name
            (post.settings?.thumbnail?.path.split('/').pop() || 'thumbnail.jpeg'));
      }
      form.append('nsfw', post.settings?.nsfw);
      if (post.settings?.tags?.length) {
        //PeerTube only allows upto 5 tags
        if (post.settings?.tags?.length > 5) {
          post.settings?.tags?.splice(5);
        }
        post.settings.tags.forEach((tag: string, index: number) => {
          form.append(`tags[${index}]`, tag);
        });
      }

      const uploadResponse = await this.fetch(
        `${instanceUrl}/api/v1/videos/upload`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}` },
          body: form as any,
        },
        this.identifier
      );

      const { video } = await uploadResponse.json();

      results.push({
        id: post.id,
        postId: video.uuid,
        releaseURL: `${instanceUrl}/w/${video.shortUUID}`,
        status: 'published',
      });
    }

    return results;
  }

  // removes trailing slashes eg. https://clip.place/ -> https://clip.place or https://clip.place// -> https://clip.place
  // extra trailing slashes(//) can cause errors in subsequent request using instanceUrls
  private normalizeUrl(url: string): string {
    return url.replace(/\/+$/, '');
  }

  private async requestClientToken(
    instanceUrl: string
  ): Promise<PeerTubeClientToken> {
    const response = await this.fetch(
      `${instanceUrl}/api/v1/oauth-clients/local`,
      {},
      this.identifier
    );
    return response.json();
  }

  private async requestUserToken(
    instanceUrl: string,
    body: URLSearchParams
  ): Promise<PeerTubeUserToken> {
    const response = await this.fetch(
      `${instanceUrl}/api/v1/users/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      },
      this.identifier
    );
    return response.json();
  }

  private async requestUserProfile(
    instanceUrl: string,
    accessToken: string
  ): Promise<PeerTubeProfile> {
    const response = await this.fetch(
      `${instanceUrl}/api/v1/users/me`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
      this.identifier
    );
    return response.json();
  }
}
