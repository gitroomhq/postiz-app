import { HttpException, HttpStatus } from '@nestjs/common';
export var Sections;
(function (Sections) {
    Sections["CHANNEL"] = "channel";
    Sections["POSTS_PER_MONTH"] = "posts_per_month";
    Sections["VIDEOS_PER_MONTH"] = "videos_per_month";
    Sections["TEAM_MEMBERS"] = "team_members";
    Sections["COMMUNITY_FEATURES"] = "community_features";
    Sections["FEATURED_BY_GITROOM"] = "featured_by_gitroom";
    Sections["AI"] = "ai";
    Sections["IMPORT_FROM_CHANNELS"] = "import_from_channels";
    Sections["ADMIN"] = "admin";
    Sections["WEBHOOKS"] = "webhooks";
})(Sections || (Sections = {}));
export var AuthorizationActions;
(function (AuthorizationActions) {
    AuthorizationActions["Create"] = "create";
    AuthorizationActions["Read"] = "read";
    AuthorizationActions["Update"] = "update";
    AuthorizationActions["Delete"] = "delete";
})(AuthorizationActions || (AuthorizationActions = {}));
export class SubscriptionException extends HttpException {
    constructor(message) {
        super(message, HttpStatus.PAYMENT_REQUIRED);
    }
}
//# sourceMappingURL=permission.exception.class.js.map