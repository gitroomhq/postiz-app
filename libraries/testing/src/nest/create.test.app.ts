import {
  Global,
  INestApplication,
  Module,
  ModuleMetadata,
  Type,
  ValidationPipe,
} from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test, TestingModuleBuilder } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import { json } from 'express';
import { SubscriptionExceptionFilter } from '@gitroom/backend/services/auth/permissions/subscription.exception';
import { PostValidationExceptionFilter } from '@gitroom/backend/api/routes/posts.validation.exception';
import { HttpExceptionFilter } from '@gitroom/nestjs-libraries/services/exception.filter';
import { PoliciesGuard } from '@gitroom/backend/services/auth/permissions/permissions.guard';
import { PermissionsService } from '@gitroom/backend/services/auth/permissions/permissions.service';
import { TemporalService } from 'nestjs-temporal-core';

/**
 * DatabaseModule providers inject TemporalService, which in production comes
 * from getTemporalModule() and opens a gRPC connection. Exported from a @Global
 * module because DatabaseModule declares no imports of its own.
 */
export const temporalServiceStub = {
  startWorkflow: async () => ({ workflowId: 'stub', firstExecutionRunId: 'stub' }),
  signalWithStart: async () => ({ workflowId: 'stub' }),
  getClient: () => ({}),
  getRawClient: () => ({
    workflow: {
      start: async () => ({ workflowId: 'stub' }),
      list: () => [],
      getHandle: () => ({ terminate: async () => {}, describe: async () => ({}) }),
    },
  }),
  get client() {
    return this.getRawClient();
  },
};

@Global()
@Module({
  providers: [{ provide: TemporalService, useValue: temporalServiceStub }],
  exports: [TemporalService],
})
class TestTemporalModule {}

export type TestAppOptions = ModuleMetadata & {
  /** Register PoliciesGuard as an APP_GUARD. Defaults to true. */
  policies?: boolean;
  /** Middleware applied before the routes, e.g. to populate req.user/req.org. */
  middleware?: Array<(req: any, res: any, next: any) => void>;
  /** e.g. (builder) => builder.overrideProvider(PostsService).useValue(mock) */
  configure?: (builder: TestingModuleBuilder) => TestingModuleBuilder;
};

/**
 * Build a Nest application with the globals main.ts applies outside the module
 * graph. Without them a SubscriptionException renders as a bare 402 rather than
 * the { statusCode, message, url } body the frontend parses, and an
 * HttpForbiddenException as a 403 rather than a 401 with the cookie cleared.
 *
 * AppModule itself is deliberately not booted: it pulls in Sentry, Temporal, a
 * Redis-backed throttler, Mastra and the video module. Known gaps versus
 * main.ts: `rawBody` and the CORS block are not reproduced.
 */
export async function createTestApp(options: TestAppOptions): Promise<{
  app: INestApplication;
  get: <T>(token: Type<T> | string) => T;
}> {
  let builder = Test.createTestingModule({
    imports: [TestTemporalModule, ...(options.imports ?? [])],
    controllers: options.controllers ?? [],
    providers: [
      ...(options.providers ?? []),
      // PermissionsService lives outside DatabaseModule but is what the guard
      // resolves against, so the two are registered together.
      ...(options.policies === false
        ? []
        : [PermissionsService, { provide: APP_GUARD, useClass: PoliciesGuard }]),
    ],
  });

  if (options.configure) {
    builder = options.configure(builder);
  }

  const moduleRef = await builder.compile();
  const app = moduleRef.createNestApplication({ rawBody: true });

  // Mirrors apps/backend/src/main.ts, in the same order.
  app.useGlobalPipes(new ValidationPipe({ transform: true }));
  // The wrapper is not cosmetic, and main.ts has it for the same reason:
  // express.json() returns a function literally named `jsonParser`, and Nest
  // skips registering its own global body parser when a middleware of that
  // name is already on the stack. Passing json() directly here therefore left
  // every route outside /posts with an unparsed body - which reads as
  // "All posts must have an integration id" on /public/v1/posts.
  app.use(['/copilot/{*splat}', '/posts'], (req: any, res: any, next: any) => {
    json({ limit: '50mb' })(req, res, next);
  });
  app.use(cookieParser());
  app.use(compression());

  for (const middleware of options.middleware ?? []) {
    app.use(middleware);
  }

  app.useGlobalFilters(new SubscriptionExceptionFilter());
  app.useGlobalFilters(new PostValidationExceptionFilter());
  app.useGlobalFilters(new HttpExceptionFilter());

  await app.init();

  return {
    app,
    get: (token) => moduleRef.get(token as never, { strict: false }),
  };
}
