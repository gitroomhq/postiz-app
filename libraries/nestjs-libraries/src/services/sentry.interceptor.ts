import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { SentryNestJSService } from '@gitroom/helpers/sentry';
import { Request } from 'express';

@Injectable()
export class SentryInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const startTime = Date.now();
    
    // Set request context
    const endpoint = `${request.method} ${request.route?.path || request.url}`;
    SentryNestJSService.setTag('endpoint', endpoint);
    SentryNestJSService.setContext('request', {
      url: request.url,
      method: request.method,
      headers: this.sanitizeHeaders(request.headers),
      query: request.query,
      params: request.params,
      userAgent: request.get('User-Agent'),
      ip: request.ip,
    });

    // Set user context if available
    if ((request as any).user) {
      SentryNestJSService.setUser({
        id: (request as any).user.id,
        email: (request as any).user.email,
        username: (request as any).user.username,
        organizationId: (request as any).user.organizationId,
      });
    }

    // Start performance transaction
    const transaction = SentryNestJSService.startTransaction(endpoint, 'http.server');

    return next.handle().pipe(
      tap((response) => {
        const duration = Date.now() - startTime;
        
        // Add breadcrumb for successful request (just for context, not an event)
        SentryNestJSService.addBreadcrumb(
          `${endpoint} completed successfully`,
          'http.request',
          {
            duration,
            statusCode: context.switchToHttp().getResponse().statusCode,
          }
        );

        // Track slow requests as warnings (performance issues)
        if (duration > 5000) { // 5 seconds threshold
          SentryNestJSService.captureMessage(
            `Slow request: ${endpoint}`,
            'warning',
            {
              extra: {
                duration,
                url: request.url,
                method: request.method,
              },
              tags: {
                event: 'slow_request',
                endpoint,
              },
            }
          );
        }

        // Finish transaction
        if (transaction) {
          transaction.setStatus({ code: 1 }); // OK status
          transaction.end();
        }
      }),
      catchError((error) => {
        const duration = Date.now() - startTime;
        
        // Add breadcrumb for failed request
        SentryNestJSService.addBreadcrumb(
          `${endpoint} failed`,
          'http.request',
          {
            duration,
            error: error.message,
          }
        );

        // Finish transaction with error
        if (transaction) {
          transaction.setStatus({ code: 2 }); // ERROR status
          transaction.end();
        }

        throw error;
      })
    );
  }

  private sanitizeHeaders(headers: any): any {
    const sanitized = { ...headers };
    
    // Remove sensitive headers
    delete sanitized.authorization;
    delete sanitized.cookie;
    delete sanitized['x-api-key'];
    delete sanitized['x-auth-token'];
    
    return sanitized;
  }
}
