import {ArticleProvider} from "@gitroom/nestjs-libraries/integrations/article/article.integrations.interface";

export class MediumProvider implements ArticleProvider {
    identifier = 'medium';
    name = 'Medium';

    async authenticate(token: string) {
        const {data: {name, id, imageUrl}} = await (await fetch('https://api.medium.com/v1/me', {
            headers: {
                Authorization: `Bearer ${token}`
            }
        })).json();

        return {
            id,
            name,
            token,
            picture: imageUrl
        }
    }

    async post(token: string, content: string, settings: object) {
        return {
            postId: '123',
            releaseURL: 'https://dev.to'
        }
    }
}