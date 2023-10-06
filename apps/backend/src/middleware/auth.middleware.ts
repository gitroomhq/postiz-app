import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { AuthService } from '@clickvote/backend/src/shared/auth/auth.service';
import { UsersService } from '@clickvote/backend/src/packages/users/users.service';
import { OrgService } from '@clickvote/backend/src/packages/org/org.service';
import { EnvironmentService } from '@clickvote/backend/src/packages/environment/environment.service';
import { UserFromRequest } from '@clickvote/interfaces';

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  constructor(
    private readonly _authService: AuthService,
    private readonly _userService: UsersService,
    private readonly _orgService: OrgService,
    private readonly _envService: EnvironmentService
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const auth = this._authService.validate(req.cookies.auth as string);
    const viewOrg = req?.cookies?.org;
    const viewEnv = req?.cookies?.env;

    if (!auth) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const user = await this._userService.getById(auth.id);

    if (!user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const findOrg = viewOrg
      ? // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        user.org.find((o) => o._id.toString() === viewOrg)
      : null;

    const finalOrg = findOrg ? findOrg : user.org[0];

    const environments = await this._envService.getEnvironmentsByOrgId(
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      finalOrg._id.toString()
    );

    const findEnv = viewEnv
      ? environments?.find((o) => o._id.toString() === viewEnv)
      : null;

    const currentEnv = findEnv ? findEnv : environments[0];

    const map = {
      id: user.id,
      email: user.email,
      currentEnv: {
        id: currentEnv._id.toString(),
        name: currentEnv.name,
        public_key: currentEnv.apiKey
      },
      env: environments.map((e) => ({
        name: e.name,
        id: e._id.toString(),
      })),
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      org: user.org.map((p) => ({ id: p._id.toString(), name: p.name })),
      currentOrg: {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        id: finalOrg._id.toString(),
        name: finalOrg.name,
      },
    } satisfies UserFromRequest;

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    req.user = map;

    next();
  }
}

