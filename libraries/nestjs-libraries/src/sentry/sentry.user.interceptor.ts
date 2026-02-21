import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { Request } from 'express';
import { User } from '@prisma/client';
import { setSentryUserContext } from './sentry.user.context';

/**
 * Interceptor that automatically sets Sentry user context for all requests.
 * This interceptor runs after authentication middleware has set req.user.
 * 
 * Usage Options:
 * 
 * 1. Global interceptor (recommended for APIs with consistent auth):
 *    In your app.module.ts:
 *    ```typescript
 *    import { APP_INTERCEPTOR } from '@nestjs/core';
 *    import { SentryUserInterceptor } from '@gitroom/nestjs-libraries/sentry/sentry.user.interceptor';
 *    
 *    @Module({
 *      providers: [
 *        { provide: APP_INTERCEPTOR, useClass: SentryUserInterceptor },
 *      ],
 *    })
 *    export class AppModule {}
 *    ```
 * 
 * 2. Controller-level (for specific controllers):
 *    ```typescript
 *    @UseInterceptors(SentryUserInterceptor)
 *    @Controller('users')
 *    export class UsersController {}
 *    ```
 * 
 * 3. Method-level (for specific routes):
 *    ```typescript
 *    @UseInterceptors(SentryUserInterceptor)
 *    @Get('profile')
 *    getProfile() {}
 *    ```
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
