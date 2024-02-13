export interface PricingInterface {
    [key: string]: {
        pricing: {
            monthly: number;
            yearly: number;
        },
        friends: boolean;
        crossPosting: boolean;
        repository: number;
        ai: boolean;
        integrations: number;
        totalPosts: number;
        medias: number;
        influencers: boolean;
    }
}
export const pricing: PricingInterface = {
    FREE: {
        pricing: {
            monthly: 0,
            yearly: 0,
        },
        friends: false,
        crossPosting: false,
        repository: 1,
        ai: false,
        integrations: 2,
        totalPosts: 20,
        medias: 2,
        influencers: false,
    },
    BASIC: {
        pricing: {
            monthly: 50,
            yearly: 500,
        },
        friends: false,
        crossPosting: true,
        repository: 2,
        ai: false,
        integrations: 4,
        totalPosts: 100,
        medias: 5,
        influencers: true,
    },
    PRO: {
        pricing: {
            monthly: 100,
            yearly: 1000,
        },
        friends: true,
        crossPosting: true,
        repository: 4,
        ai: true,
        integrations: 10,
        totalPosts: 300,
        medias: 10,
        influencers: true,
    }
}
