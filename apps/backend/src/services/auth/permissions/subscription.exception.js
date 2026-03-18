import { __decorate } from "tslib";
import { Catch, } from '@nestjs/common';
import { Sections, SubscriptionException } from "./permission.exception.class";
let SubscriptionExceptionFilter = class SubscriptionExceptionFilter {
    catch(exception, host) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        const status = exception.getStatus();
        const error = exception.getResponse();
        const message = getErrorMessage(error);
        response.status(status).json({
            statusCode: status,
            message,
            url: process.env.FRONTEND_URL + '/billing',
        });
    }
};
SubscriptionExceptionFilter = __decorate([
    Catch(SubscriptionException)
], SubscriptionExceptionFilter);
export { SubscriptionExceptionFilter };
const getErrorMessage = (error) => {
    switch (error.section) {
        case Sections.POSTS_PER_MONTH:
            switch (error.action) {
                default:
                    return 'You have reached the maximum number of posts for your subscription. Please upgrade your subscription to add more posts.';
            }
        case Sections.CHANNEL:
            switch (error.action) {
                default:
                    return 'You have reached the maximum number of channels for your subscription. Please upgrade your subscription to add more channels.';
            }
        case Sections.WEBHOOKS:
            switch (error.action) {
                default:
                    return 'You have reached the maximum number of webhooks for your subscription. Please upgrade your subscription to add more webhooks.';
            }
        case Sections.VIDEOS_PER_MONTH:
            switch (error.action) {
                default:
                    return 'You have reached the maximum number of generated videos for your subscription. Please upgrade your subscription to generate more videos.';
            }
    }
};
//# sourceMappingURL=subscription.exception.js.map