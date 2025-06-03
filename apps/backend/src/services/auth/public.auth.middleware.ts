import { HttpStatus, Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { OrganizationService } from '@gitroom/nestjs-libraries/database/prisma/organizations/organization.service';
import { HttpForbiddenException } from '@gitroom/nestjs-libraries/services/exception.filter';

@Injectable()
export class PublicAuthMiddleware implements NestMiddleware {
  constructor(private _organizationService: OrganizationService) {}
  async use(req: Request, res: Response, next: NextFunction) {
    const auth = (req.headers.authorization ||
      req.headers.Authorization) as string;
    if (!auth) {
      res.status(HttpStatus.UNAUTHORIZED).json({ msg: 'No API Key found' });
      return;
    }
    try {
      const org = await this._organizationService.getOrgByApiKey(auth);
      if (!org) {
        res.status(HttpStatus.UNAUTHORIZED).json({ msg: 'Invalid API key' });
        return;
      }

      if (!!process.env.STRIPE_SECRET_KEY && !org.subscription) {
        res
          .status(HttpStatus.UNAUTHORIZED)
          .json({ msg: 'No subscription found' });
        return;
      }

      // @ts-ignore
      req.org = { ...org, users: [{ users: { role: 'SUPERADMIN' } }] };
    } catch (err) {
      throw new HttpForbiddenException();
    }
    next();
  }
}
