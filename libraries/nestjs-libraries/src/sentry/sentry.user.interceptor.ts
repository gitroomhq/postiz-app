import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { User, Organization } from '@prisma/client';
import { setSentryUserContext } from '@gitroom/nestjs-libraries/sentry/sentry.user.context';

@Injectable()
export class SentryUserInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const user = request.user as User | undefined;
    const org = request.org as Organization | undefined;

    // Set user context if available
    if (user) {
      setSentryUserContext(user, org?.id);
    }

    return next.handle();
  }
}
