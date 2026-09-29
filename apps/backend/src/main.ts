import { initializeSentry } from '@gitroom/nestjs-libraries/sentry/initialize.sentry';
initializeSentry('backend', true);
import compression from 'compression';

import { loadSwagger } from '@gitroom/helpers/swagger/load.swagger';
import { json } from 'express';
import { Runtime } from '@temporalio/worker';
Runtime.install({ shutdownSignals: [] });

process.env.TZ = 'UTC';

import cookieParser from 'cookie-parser';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

import { SubscriptionExceptionFilter } from '@gitroom/backend/services/auth/permissions/subscription.exception';
import { PostValidationExceptionFilter } from '@gitroom/backend/api/routes/posts.validation.exception';
import { HttpExceptionFilter } from '@gitroom/nestjs-libraries/services/exception.filter';
import { ConfigurationChecker } from '@gitroom/helpers/configuration/configuration.checker';
import { startMcp } from '@gitroom/nestjs-libraries/chat/start.mcp';

async function start() {
  const app = await NestFactory.create(AppModule, {
    rawBody: true,
    cors: {
      ...(!process.env.NOT_SECURED ? { credentials: true } : {}),
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'auth',
        'showorg',
        'impersonate',
        'x-postiz-org',
        'x-postiz-include-deleted',
        'x-copilotkit-runtime-client-gql-version',
      ],
      exposedHeaders: [
        'reload',
        'onboarding',
        'activate',
        'x-copilotkit-runtime-client-gql-version',
        ...(process.env.NOT_SECURED ? ['auth', 'showorg', 'impersonate'] : []),
      ],
      origin: [
        process.env.FRONTEND_URL,
        'http://localhost:6274',
        ...(process.env.MAIN_URL ? [process.env.MAIN_URL] : []),
        // postmonster: landing origins (e.g. https://postmonster.xyz) that may
        // call the public access-requests endpoint, from LANDING_ORIGINS
        ...(process.env.LANDING_ORIGINS
          ? process.env.LANDING_ORIGINS.split(',')
              .map((origin) => origin.trim())
              .filter(Boolean)
          : []),
      ],
    },
  });

  await startMcp(app);

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
    })
  );

  app.use(['/copilot/{*splat}', '/posts'], (req: any, res: any, next: any) => {
    json({ limit: '50mb' })(req, res, next);
  });

  app.use(cookieParser());
  app.use(compression());
  app.useGlobalFilters(new SubscriptionExceptionFilter());
  app.useGlobalFilters(new PostValidationExceptionFilter());
  app.useGlobalFilters(new HttpExceptionFilter());

  loadSwagger(app);

  const port = process.env.PORT || 3000;

  // postmonster: on a cold stack pm2 starts us while temporalio/auto-setup is
  // still bringing up Temporal, and the first boot then fails inside
  // app.listen (TemporalRegister). Retry instead of dying instantly, and if
  // it still fails exit non-zero so pm2 restarts us - the previous catch just
  // logged the error and left a live process WITHOUT a listener, which left
  // nginx with "no live upstreams" until the container was restarted.
  const startAttempts = Number(process.env.STARTUP_RETRIES || 36);
  for (let attempt = 1; attempt <= startAttempts; attempt++) {
    try {
      await app.listen(port);
      console.log('Backend started successfully on port ' + port);

      checkConfiguration(); // Do this last, so that users will see obvious issues at the end of the startup log without having to scroll up.

      Logger.log(`?? Backend is running on: http://localhost:${port}`);
      return;
    } catch (e) {
      Logger.error(
        `Backend failed to start on port ${port} (attempt ${attempt}/${startAttempts})`,
        e
      );
      if (attempt < startAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }
  }

  process.exit(1);
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
  } else {
    Logger.log('Configuration check completed without any issues');
  }
}

start();
