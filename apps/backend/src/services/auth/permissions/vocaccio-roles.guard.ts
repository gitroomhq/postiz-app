import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { VocaccioRole } from '@prisma/client';
import { VOCACCIO_ROLES_KEY } from './vocaccio-roles.decorator';

@Injectable()
export class VocaccioRolesGuard implements CanActivate {
  constructor(private _reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this._reflector.getAllAndOverride<VocaccioRole[]>(
      VOCACCIO_ROLES_KEY,
      [context.getHandler(), context.getClass()]
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    // req.org is populated by AuthMiddleware; users[0] is the current user's membership
    const vocaccioRole: VocaccioRole | undefined = request?.org?.users?.[0]?.vocaccioRole;

    if (!vocaccioRole || !requiredRoles.includes(vocaccioRole)) {
      throw new ForbiddenException('Insufficient role');
    }

    return true;
  }
}
