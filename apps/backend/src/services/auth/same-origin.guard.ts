import {
  CanActivate,
  ExecutionContext,
  HttpException,
  Injectable,
} from '@nestjs/common';
import { isSameFrontendOrigin } from '@gitroom/helpers/auth/same-origin';

@Injectable()
export class SameOriginGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<{
      headers: { origin?: string; referer?: string };
    }>();
    if (!isSameFrontendOrigin(req.headers)) {
      throw new HttpException('Invalid origin', 403);
    }
    return true;
  }
}
