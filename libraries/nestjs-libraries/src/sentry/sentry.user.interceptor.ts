import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { Request } from 'express';
import { User } from '@prisma/client';
import { setSentryUserContext } from './sentry.user.context';

/**
 * Interceptor that automatically sets Sentry user context for all requests.
 * This interceptor runs after authentication middleware has set req.user.
 */
@Injectable()
export class SentryUserInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    
    // Get user from request (set by auth middleware)
    const user = (request as any).user as User | undefined;
    
    // Set Sentry user context for this request
    setSentryUserContext(user || null);
    
    return next.handle();
  }
}
