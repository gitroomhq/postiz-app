export interface ProvidersInterface {
    generateLink(): string;
    getToken(code: string): Promise<string>;
    getUser(providerToken: string): Promise<{email: string, id: string}> | false;
}