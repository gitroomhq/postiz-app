import { ProvidersInterface } from '@gitroom/backend/services/auth/providers.interface';
import { NeynarAPIClient } from '@neynar/nodejs-sdk';

const client = new NeynarAPIClient({
  apiKey: process.env.NEYNAR_SECRET_KEY || '00000000-000-0000-000-000000000000',
});

export class FarcasterProvider implements ProvidersInterface {
  generateLink() {
    return '';
  }

  async getToken(code: string) {
    const data = JSON.parse(Buffer.from(code, 'base64').toString());
    const status = await client.lookupSigner({ signerUuid: data.signer_uuid });
    if (status.status === 'approved') {
      return data.signer_uuid;
    }

    return '';
  }

  async getUser(providerToken: string) {
    const status = await client.lookupSigner({ signerUuid: providerToken });
    if (status.status !== 'approved') {
      return {
        id: '',
        email: '',
      };
    }

    // const { client, oauth2 } = clientAndYoutube();
    // client.setCredentials({ access_token: providerToken });
    // const user = oauth2(client);
    // const { data } = await user.userinfo.get();

    return {
      id: String('farcaster_' + status.fid),
      email: String('farcaster_' + status.fid),
    };
  }
}
