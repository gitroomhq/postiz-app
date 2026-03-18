import { __decorate } from "tslib";
import { Module } from '@nestjs/common';
import { PostActivity } from "./activities/post.activity";
import { getTemporalModule } from "../../../libraries/nestjs-libraries/src/temporal/temporal.module";
import { DatabaseModule } from "../../../libraries/nestjs-libraries/src/database/prisma/database.module";
import { AutopostService } from "../../../libraries/nestjs-libraries/src/database/prisma/autopost/autopost.service";
import { EmailActivity } from "./activities/email.activity";
import { IntegrationsActivity } from "./activities/integrations.activity";
const activities = [
    PostActivity,
    AutopostService,
    EmailActivity,
    IntegrationsActivity,
];
let AppModule = class AppModule {
};
AppModule = __decorate([
    Module({
        imports: [
            DatabaseModule,
            getTemporalModule(true, require.resolve('./workflows'), activities),
        ],
        controllers: [],
        providers: [...activities],
        get exports() {
            return [...this.providers, ...this.imports];
        },
    })
], AppModule);
export { AppModule };
//# sourceMappingURL=app.module.js.map