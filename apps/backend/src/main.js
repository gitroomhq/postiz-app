import { __awaiter } from "tslib";
import { initializeSentry } from "../../../libraries/nestjs-libraries/src/sentry/initialize.sentry";
initializeSentry('backend', true);
import compression from 'compression';
import { loadSwagger } from "../../../libraries/helpers/src/swagger/load.swagger";
import { json } from 'express';
import { Runtime } from '@temporalio/worker';
Runtime.install({ shutdownSignals: [] });
process.env.TZ = 'UTC';
import cookieParser from 'cookie-parser';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SubscriptionExceptionFilter } from "./services/auth/permissions/subscription.exception";
import { HttpExceptionFilter } from "../../../libraries/nestjs-libraries/src/services/exception.filter";
import { ConfigurationChecker } from "../../../libraries/helpers/src/configuration/configuration.checker";
import { startMcp } from "../../../libraries/nestjs-libraries/src/chat/start.mcp";
function start() {
    return __awaiter(this, void 0, void 0, function* () {
        const app = yield NestFactory.create(AppModule, {
            rawBody: true,
            cors: Object.assign(Object.assign({}, (!process.env.NOT_SECURED ? { credentials: true } : {})), { allowedHeaders: [
                    'Content-Type',
                    'Authorization',
                    'x-copilotkit-runtime-client-gql-version',
                ], exposedHeaders: [
                    'reload',
                    'onboarding',
                    'activate',
                    'x-copilotkit-runtime-client-gql-version',
                    ...(process.env.NOT_SECURED ? ['auth', 'showorg', 'impersonate'] : []),
                ], origin: [
                    process.env.FRONTEND_URL,
                    'http://localhost:6274',
                    ...(process.env.MAIN_URL ? [process.env.MAIN_URL] : []),
                ] }),
        });
        yield startMcp(app);
        app.useGlobalPipes(new ValidationPipe({
            transform: true,
        }));
        app.use(['/copilot/*', '/posts'], (req, res, next) => {
            json({ limit: '50mb' })(req, res, next);
        });
        app.use(cookieParser());
        app.use(compression());
        app.useGlobalFilters(new SubscriptionExceptionFilter());
        app.useGlobalFilters(new HttpExceptionFilter());
        loadSwagger(app);
        const port = process.env.PORT || 3000;
        try {
            yield app.listen(port);
            checkConfiguration(); // Do this last, so that users will see obvious issues at the end of the startup log without having to scroll up.
            Logger.log(`🚀 Backend is running on: http://localhost:${port}`);
        }
        catch (e) {
            Logger.error(`Backend failed to start on port ${port}`, e);
        }
    });
}
function checkConfiguration() {
    const checker = new ConfigurationChecker();
    checker.readEnvFromProcess();
    checker.check();
    if (checker.hasIssues()) {
        for (const issue of checker.getIssues()) {
            Logger.warn(issue, 'Configuration issue');
        }
        Logger.warn('Configuration issues found: ' + checker.getIssuesCount());
    }
    else {
        Logger.log('Configuration check completed without any issues');
    }
}
start();
//# sourceMappingURL=main.js.map