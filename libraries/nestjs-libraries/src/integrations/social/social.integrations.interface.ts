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
};

export interface ISocialMediaIntegration {
    schedulePost(accessToken: string, postDetails: PostDetails[]): Promise<PostResponse[]>; // Schedules a new post
}

export type PostResponse = {
    postId: string; // The ID of the scheduled post returned by the platform
    status: string; // Status of the operation or initial post status
};

export type PostDetails = {
    message: string;
    scheduledTime: Date; // The time when the post should be published
    media?: MediaContent[]; // Optional array of media content to be attached with the post
    poll?: PollDetails; // Optional poll details
};

export type PollDetails = {
    options: string[]; // Array of poll options
    duration: number; // Duration in hours for which the poll will be active
}

export type MediaContent = {
    type: 'image' | 'video'; // Type of the media content
    url: string; // URL of the media file, if it's already hosted somewhere
    file?: File; // The actual media file to upload, if not hosted
};

export interface SocialProvider extends IAuthenticator, ISocialMediaIntegration {
    identifier: string;
    name: string;
}