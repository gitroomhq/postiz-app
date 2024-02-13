import {ArticleProvider} from "@gitroom/nestjs-libraries/integrations/article/article.integrations.interface";

export class DevToProvider implements ArticleProvider {
    identifier = 'devto';
    name = 'Dev.to';
    async authenticate(token: string): Promise<{ id: string; name: string; token: string; }> {
        const {name, id} = await (await fetch('https://dev.to/api/users/me', {
            headers: {
                'api-key': token
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