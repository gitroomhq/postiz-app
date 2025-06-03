import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
} from '@nestjs/common';
import { Response } from 'express';
import { removeAuth } from '@gitroom/backend/services/auth/auth.middleware';

export class HttpForbiddenException extends HttpException {
  constructor() {
    super('Forbidden', 403);
  }
}

@Catch(HttpForbiddenException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpForbiddenException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    removeAuth(response);

    return response.status(401).send();
  }
}
