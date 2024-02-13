export interface ArticleIntegrationsInterface {
    authenticate(token: string): Promise<{id: string, name: string, token: string}>;
    publishPost(token: string, content: string): Promise<string>;
}

export interface ArticleProvider extends ArticleIntegrationsInterface {
    identifier: string;
    name: string;
}