import { ThrottlerGuard } from '@nestjs/throttler';
import { ExecutionContext, Injectable } from '@nestjs/common';
import { Request } from 'express';

/**
 * Routes that accept a file. They are rate limited for a different reason than
 * the posting endpoint: not to ration a paid resource, but because each request
 * can carry up to the maximum upload size, and an authenticated account with no
 * limit at all could hold a server's worth of disk and bandwidth open.
 */
const UPLOAD_ROUTES = [
  '/media/upload-server',
  '/media/upload-simple',
  '/public/v1/upload',
];

const isUpload = (url: string) => UPLOAD_ROUTES.some((r) => url.includes(r));

@Injectable()
export class ThrottlerBehindProxyGuard extends ThrottlerGuard {
  public override async canActivate(
    context: ExecutionContext
  ): Promise<boolean> {
    const { url, method } = context.switchToHttp().getRequest<Request>();
    if (
      method === 'POST' &&
      (url.includes('/public/v1/posts') || isUpload(url))
    ) {
      return super.canActivate(context);
    }

    return true;
  }

  protected override async getTracker(
    req: Record<string, any>
  ): Promise<string> {
    // Separate counters per concern, so a burst of uploads cannot exhaust the
    // allowance for publishing posts, or the other way round.
    const bucket = isUpload(req.url)
      ? 'uploads'
      : req.url.indexOf('/posts') > -1
      ? 'posts'
      : 'other';

    return req.org.id + '_' + bucket;
  }
}
