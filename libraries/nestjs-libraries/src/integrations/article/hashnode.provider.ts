import {ArticleIntegrationsInterface, ArticleProvider} from "@gitroom/nestjs-libraries/integrations/article/article.integrations.interface";

export class HashnodeProvider implements ArticleProvider {
    identifier = 'hashnode';
    name = 'Hashnode';
    async authenticate(token: string) {
        try {
            const {data: {me: {name, id, profilePicture}}} = await (await fetch('https://gql.hashnode.com', {
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
                        id,
                        profilePicture
                      }
                    }
                `
                })
            })).json();

            return {
                id, name, token, picture: profilePicture
            }
        }
        catch (err) {
            return {
                id: '',
                name: '',
                token: '',
                picture: ''
            }
        }
    }

    async post(token: string, content: string, settings: object) {
        return {
            postId: '123',
            releaseURL: 'https://dev.to'
        }
    }
}