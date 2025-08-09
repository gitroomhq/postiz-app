import { APP_FILTER } from "@nestjs/core";
import { SentryGlobalFilter } from "@sentry/nestjs/setup";

export const FILTER = {
  provide: APP_FILTER,
  useClass: SentryGlobalFilter,
};
