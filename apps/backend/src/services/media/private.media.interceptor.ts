import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { mergeMap } from 'rxjs/operators';
import { MediaService } from '@gitroom/nestjs-libraries/database/prisma/media/media.service';
import { privateMediaEnabled } from '@gitroom/nestjs-libraries/upload/private.media';

@Injectable()
export class PrivateMediaInterceptor implements NestInterceptor {
  constructor(private readonly media: MediaService) {}

  async intercept(context: ExecutionContext, next: CallHandler) {
    if (!privateMediaEnabled() || context.getType() !== 'http')
      return next.handle();
    const http = context.switchToHttp();
    const request = http.getRequest();
    if (!request.org?.id) return next.handle();
    request.body = await this.media.privateMedia.canonicalize(
      request.org.id,
      request.body,
    );
    http.getResponse().setHeader('Cache-Control', 'private, no-store');
    return next
      .handle()
      .pipe(
        mergeMap((value) =>
          this.media.privateMedia.response(
            request.org.id, value, typeof request.isOAuthApp === 'boolean'
          ),
        ),
      );
  }
}
