export interface ProvidersInterface {
    getUser(providerToken: string): Promise<{email: string, id: string}> | false;
}