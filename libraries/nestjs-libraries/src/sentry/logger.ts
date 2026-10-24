import * as Sentry from '@sentry/nestjs';

export const { logger } = Sentry;

export const errorType = (err: unknown) => {
  if (err instanceof Error) {
    return err.name || 'Error';
  }

  return typeof err;
};

export const errorMessage = (err: unknown) => {
  if (err instanceof Error) {
    return err.message;
  }

  if (typeof err === 'string') {
    return err;
  }

  return String(err ?? '');
};
