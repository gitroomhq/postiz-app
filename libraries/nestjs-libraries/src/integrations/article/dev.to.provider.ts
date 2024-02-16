import {ArticleProvider} from "@gitroom/nestjs-libraries/integrations/article/article.integrations.interface";

export class DevToProvider implements ArticleProvider {
    identifier = 'devto';
    name = 'Dev.to';
    async authenticate(token: string) {
        const {name, id, profile_image} = await (await fetch('https://dev.to/api/users/me', {
            headers: {
                'api-key': token
            }
        })).json();

        return {
            id,
            name,
            token,
            picture: profile_image
        }
    }

    async post(token: string, content: string, settings: object) {
        return {
            postId: '123',
            releaseURL: 'https://dev.to'
        }
    }
}