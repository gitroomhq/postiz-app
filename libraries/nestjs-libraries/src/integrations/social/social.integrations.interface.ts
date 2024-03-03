export interface IAuthenticator {
    authenticate(params: {code: string, codeVerifier: string}): Promise<AuthTokenDetails>;
    refreshToken(refreshToken: string): Promise<AuthTokenDetails>;
    generateAuthUrl(): Promise<GenerateAuthUrlResponse>;
}

export type GenerateAuthUrlResponse = {
    url: string,
    codeVerifier: string,
    state: string
}

export type AuthTokenDetails = {
    id: string;
    name: string;
    accessToken: string; // The obtained access token
    refreshToken?: string; // The refresh token, if applicable
    expiresIn?: number; // The duration in seconds for which the access token is valid
    picture?: string;
};

export interface ISocialMediaIntegration {
    post(id: string, accessToken: string, postDetails: PostDetails[]): Promise<PostResponse[]>; // Schedules a new post
}

export type PostResponse = {
    id: string; // The db internal id of the post
    postId: string; // The ID of the scheduled post returned by the platform
    releaseURL: string; // The URL of the post on the platform
    status: string; // Status of the operation or initial post status
};

export type PostDetails<T = any> = {
    id: string;
    message: string;
    settings: T;
    media?: MediaContent[];
    poll?: PollDetails;
};

export type PollDetails = {
    options: string[]; // Array of poll options
    duration: number; // Duration in hours for which the poll will be active
}

export type MediaContent = {
    type: 'image' | 'video'; // Type of the media content
    url: string; // URL of the media file, if it's already hosted somewhere
    path: string;
};

export interface SocialProvider extends IAuthenticator, ISocialMediaIntegration {
    identifier: string;
    name: string;
}