import {ProvidersInterface} from "@gitroom/backend/services/auth/providers.interface";

export class GithubProvider implements ProvidersInterface {
    async getUser(providerToken: string): Promise<{email: string, id: string}> {
        const data = await (await fetch('https://api.github.com/user', {
            headers: {
                Authorization: `token ${providerToken}`
            }
        })).json();
        return {
            email: data.email,
            id: data.id,
        };
    }
}