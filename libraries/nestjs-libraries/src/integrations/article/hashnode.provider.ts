import {ArticleIntegrationsInterface, ArticleProvider} from "@gitroom/nestjs-libraries/integrations/article/article.integrations.interface";

export class HashnodeProvider implements ArticleProvider {
    identifier = 'hashnode';
    name = 'Hashnode';
    async authenticate(token: string): Promise<{ id: string; name: string; token: string; }> {
        try {
            const {data: {me: {name, id}}} = await (await fetch('https://gql.hashnode.com', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `${token}`
                },
                body: JSON.stringify({
                    query: `
                    query {
                      me {
                        name,
                        id
                      }
                    }
                `
                })
            })).json();

            return {
                id, name, token
            }
        }
        catch (err) {
            return {
                id: '',
                name: '',
                token: ''
            }
        }
    }

    async publishPost(token: string, content: string): Promise<string> {
        return '';
    }
}