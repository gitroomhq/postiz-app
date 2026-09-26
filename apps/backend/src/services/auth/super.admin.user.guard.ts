import {
  CanActivate,
  ExecutionContext,
  HttpException,
  Injectable,
} from '@nestjs/common';
import { Request } from 'express';
import { User } from '@prisma/client';

// postmonster: platform-level super admin gate for the access admin API
// (PRD 6). AuthMiddleware re-resolves the user from the DB on every request,
// so the flag cannot be forged through a stale JWT.
@Injectable()
export class SuperAdminUserGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest() as Request;
    const user = (request as unknown as { user?: User }).user;

    if (!user?.isSuperAdmin) {
      throw new HttpException('Unauthorized', 403);
    }

    return true;
  }
}
