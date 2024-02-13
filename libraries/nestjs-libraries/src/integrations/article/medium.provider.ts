import {ArticleProvider} from "@gitroom/nestjs-libraries/integrations/article/article.integrations.interface";

export class MediumProvider implements ArticleProvider {
    identifier = 'medium';
    name = 'Medium';

    async authenticate(token: string): Promise<{ id: string; name: string; token: string; }> {
        const {data: {name, id}} = await (await fetch('https://api.medium.com/v1/me', {
            headers: {
                Authorization: `Bearer ${token}`
            }
        })).json();

        return {
            id,
            name,
            token
        }
    }

    async publishPost(token: string, content: string): Promise<string> {
        return '';
    }
}