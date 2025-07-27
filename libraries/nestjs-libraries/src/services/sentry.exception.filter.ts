import { ExceptionFilter, Catch, ArgumentsHost, HttpException, Logger } from '@nestjs/common';
import { Request, Response } from 'express';
import { SentryNestJSService } from '@gitroom/helpers/sentry';

@Catch()
export class SentryExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(SentryExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = 500;
    let message = 'Internal server error';

    // Determine if it's an HTTP exception
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      message = typeof exceptionResponse === 'string' ? exceptionResponse : 
                (exceptionResponse as any)?.message || message;
    }

    // Only log as ERROR for actual errors, not expected 404s
    const shouldLogAsError = status >= 500 || (status >= 400 && this.shouldLogError(exception, request));
    
    if (shouldLogAsError) {
      this.logger.error(`${request.method} ${request.url}`, exception);
    } else if (status >= 400) {
      this.logger.warn(`${request.method} ${request.url} - ${status} ${message}`);
    }

    // Send to Sentry (only for server errors or critical issues)
    if (status >= 500 || (status >= 400 && this.shouldReportError(exception, request))) {
      SentryNestJSService.captureException(exception, {
        extra: {
          url: request.url,
          method: request.method,
          headers: this.sanitizeHeaders(request.headers),
          body: this.sanitizeBody(request.body),
          query: request.query,
          params: request.params,
          userAgent: request.get('User-Agent'),
          ip: request.ip,
          status,
        },
        tags: {
          endpoint: `${request.method} ${request.route?.path || request.url}`,
          statusCode: status.toString(),
        },
      });
    }

    // Send error response to client
    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message,
      ...(process.env.NODE_ENV === 'development' && { 
        stack: exception instanceof Error ? exception.stack : undefined 
      }),
    });
  }

  private shouldLogError(exception: unknown, request: Request): boolean {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      
      // Always log authentication/authorization errors
      if (status === 401 || status === 403) {
        return true;
      }
      
      // Don't log common monitoring/health check endpoints as errors
      if (status === 404) {
        const monitoringPatterns = ['/health', '/ping', '/status', '/monitor', '/metrics', '/favicon.ico'];
        if (monitoringPatterns.some(pattern => request.url.includes(pattern))) {
          return false;
        }
        
        // Log other 404s as warnings only
        return false;
      }
      
      // Log rate limiting
      if (status === 429) {
        return true;
      }
      
      // Log validation errors only if they seem suspicious
      if (status === 400) {
        return false; // Log as warning instead
      }
    }
    
    return true; // Log other errors normally
  }

  private shouldReportError(exception: unknown, request: Request): boolean {
    // Don't report validation errors (400) unless they seem suspicious
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      
      // Report authentication/authorization errors
      if (status === 401 || status === 403) {
        return true;
      }
      
      // Report not found errors only if they seem like potential attacks
      if (status === 404) {
        const suspiciousPatterns = ['.php', '.asp', '.jsp', 'wp-admin', 'admin.php', 'config.'];
        return suspiciousPatterns.some(pattern => request.url.includes(pattern));
      }
      
      // Report rate limiting
      if (status === 429) {
        return true;
      }
    }
    
    return false;
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

  private sanitizeBody(body: any): any {
    if (!body || typeof body !== 'object') {
      return body;
    }

    const sanitized = { ...body };
    
    // Remove sensitive fields
    const sensitiveFields = [
      'password', 'token', 'secret', 'key', 'auth', 'credential',
      'accessToken', 'refreshToken', 'apiKey', 'privateKey'
    ];
    
    sensitiveFields.forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    });
    
    return sanitized;
  }
}
