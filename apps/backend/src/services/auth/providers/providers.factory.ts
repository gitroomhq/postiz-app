import { Provider } from '@prisma/client';
import { GithubProvider } from '@chaolaolo/backend/services/auth/providers/github.provider';
import { ProvidersInterface } from '@chaolaolo/backend/services/auth/providers.interface';
import { GoogleProvider } from '@chaolaolo/backend/services/auth/providers/google.provider';
import { FarcasterProvider } from '@chaolaolo/backend/services/auth/providers/farcaster.provider';
import { WalletProvider } from '@chaolaolo/backend/services/auth/providers/wallet.provider';
import { OauthProvider } from '@chaolaolo/backend/services/auth/providers/oauth.provider';

export class ProvidersFactory {
  static loadProvider(provider: Provider): ProvidersInterface {
    switch (provider) {
      case Provider.GITHUB:
        return new GithubProvider();
      case Provider.GOOGLE:
        return new GoogleProvider();
      case Provider.FARCASTER:
        return new FarcasterProvider();
      case Provider.WALLET:
        return new WalletProvider();
      case Provider.GENERIC:
        return new OauthProvider();
    }
  }
}
