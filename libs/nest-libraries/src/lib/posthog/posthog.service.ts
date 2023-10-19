import { Injectable } from '@nestjs/common';
import { PostHog } from 'posthog-node';

const client = new PostHog(
    process.env.POSTHOG_API_KEY!
)

@Injectable()
export class PosthogService {

    async trackEvent(distinctId: string, eventName: string, properties?: {}): Promise<void> {
        await client.capture({
            distinctId: distinctId,
            event: eventName,
            properties: properties,
        })
    }

}

