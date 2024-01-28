import {Provider} from "@prisma/client";
import {GithubProvider} from "@gitroom/backend/services/auth/providers/github.provider";
import {ProvidersInterface} from "@gitroom/backend/services/auth/providers.interface";

export class ProvidersFactory {
    static loadProviders(provider: Provider): ProvidersInterface {
        switch (provider) {
            case Provider.GITHUB:
                return new GithubProvider();
        }
    }
}