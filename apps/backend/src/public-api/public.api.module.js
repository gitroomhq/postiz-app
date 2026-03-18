import { __decorate } from "tslib";
import { Module } from '@nestjs/common';
import { AuthService } from "../services/auth/auth.service";
import { StripeService } from "../../../../libraries/nestjs-libraries/src/services/stripe.service";
import { PoliciesGuard } from "../services/auth/permissions/permissions.guard";
import { PermissionsService } from "../services/auth/permissions/permissions.service";
import { IntegrationManager } from "../../../../libraries/nestjs-libraries/src/integrations/integration.manager";
import { UploadModule } from "../../../../libraries/nestjs-libraries/src/upload/upload.module";
import { OpenaiService } from "../../../../libraries/nestjs-libraries/src/openai/openai.service";
import { ExtractContentService } from "../../../../libraries/nestjs-libraries/src/openai/extract.content.service";
import { CodesService } from "../../../../libraries/nestjs-libraries/src/services/codes.service";
import { PublicIntegrationsController } from "./routes/v1/public.integrations.controller";
import { PublicAuthMiddleware } from "../services/auth/public.auth.middleware";
const authenticatedController = [PublicIntegrationsController];
let PublicApiModule = class PublicApiModule {
    configure(consumer) {
        consumer.apply(PublicAuthMiddleware).forRoutes(...authenticatedController);
    }
};
PublicApiModule = __decorate([
    Module({
        imports: [UploadModule],
        controllers: [...authenticatedController],
        providers: [
            AuthService,
            StripeService,
            OpenaiService,
            ExtractContentService,
            PoliciesGuard,
            PermissionsService,
            CodesService,
            IntegrationManager,
        ],
        get exports() {
            return [...this.imports, ...this.providers];
        },
    })
], PublicApiModule);
export { PublicApiModule };
//# sourceMappingURL=public.api.module.js.map