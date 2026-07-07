import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';

export type PostValidationError = {
  /** Provider identifier, e.g. "x", "linkedin-page". */
  provider: string;
  /** Human readable provider name, e.g. "X", "LinkedIn Page". */
  name: string;
  /** The readable validation error. */
  error: string;
};

export class PostValidationException extends HttpException {
  constructor(message: PostValidationError) {
    super(message, HttpStatus.BAD_REQUEST);
  }
}

@Catch(PostValidationException)
export class PostValidationExceptionFilter implements ExceptionFilter {
  catch(exception: PostValidationException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse();
    const status = exception.getStatus();
    const { provider, name, error } =
      exception.getResponse() as PostValidationError;

    if (request.headers['x-postiz-client'] === 'mobile') {
      response.status(status).json({
        code: 'PROVIDER_VALIDATION_FAILED',
        message: error,
        field: 'provider',
        provider,
        retryable: false,
        details: { name },
      });
      return;
    }

    response.status(status).json({
      statusCode: status,
      provider,
      name,
      message: error,
    });
  }
}
