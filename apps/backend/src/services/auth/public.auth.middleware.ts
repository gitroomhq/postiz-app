import { HttpStatus, Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { Organization } from '@prisma/client';
import { OrganizationService } from '@gitroom/nestjs-libraries/database/prisma/organizations/organization.service';
import { OAuthService } from '@gitroom/nestjs-libraries/database/prisma/oauth/oauth.service';
import { HttpForbiddenException } from '@gitroom/nestjs-libraries/services/exception.filter';
import { setSentryUserContext } from '@gitroom/nestjs-libraries/sentry/initialize.sentry';

@Injectable()
export class PublicAuthMiddleware implements NestMiddleware {
  private readonly _logger = new Logger(PublicAuthMiddleware.name);

  constructor(
    private _organizationService: OrganizationService,
    private _oauthService: OAuthService
  ) {}

  private setOrg(req: Request, org: Organization) {
    // @ts-ignore
    req.org = { ...org, users: [{ users: { role: 'SUPERADMIN' } }] };
  }

  async use(req: Request, res: Response, next: NextFunction) {
    const auth = (req.headers.authorization ||
      req.headers.Authorization) as string;
    if (!auth) {
      res.status(HttpStatus.UNAUTHORIZED).json({ msg: 'No API Key found' });
      return;
    }
    try {
      let org: Organization & { subscription?: unknown };
      const isOAuthApp = auth.startsWith('pos_');

      // @ts-ignore
      req.isOAuthApp = isOAuthApp;

      if (isOAuthApp) {
        const authorization = await this._oauthService.getOrgByOAuthToken(auth);
        if (!authorization) {
          res
            .status(HttpStatus.UNAUTHORIZED)
            .json({ msg: 'Invalid OAuth token' });
          return;
        }

        org = authorization.organization;
      } else {
        org = await this._organizationService.getOrgByApiKey(auth);
        if (!org) {
          res
            .status(HttpStatus.UNAUTHORIZED)
            .json({ msg: 'Invalid API key' });
          return;
        }
      }

      if (!!process.env.STRIPE_SECRET_KEY && !org.subscription) {
        res
          .status(HttpStatus.UNAUTHORIZED)
          .json({ msg: 'No subscription found' });
        return;
      }

      this.setOrg(req, org);
      const includeDeleted =
        (req.headers['x-postiz-include-deleted'] as string)?.trim() === 'true';
      // @ts-ignore
      req.authOrgId = org.id;
      // @ts-ignore
      req.includeDeleted = includeDeleted;

      const overrideOrgId = (req.headers['x-postiz-org'] as string)?.trim();

      if (overrideOrgId) {
        if (
          isOAuthApp ||
          !(await this._organizationService.canUseSuperAdminApi(org.id))
        ) {
          res.status(HttpStatus.FORBIDDEN).json({ msg: 'Unauthorized' });
          return;
        }

        const overrideOrg =
          await this._organizationService.getOrgByIdWithSubscription(
            overrideOrgId
          );

        if (!overrideOrg || (overrideOrg.deletedAt && !includeDeleted)) {
          res
            .status(HttpStatus.NOT_FOUND)
            .json({ msg: 'Organization not found' });
          return;
        }

        this.setOrg(req, overrideOrg);

        this._logger.log(
          `Organization override performed by organization ${org.id}: acting as ${overrideOrg.id} on ${req.method} ${req.path}`
        );
      }
    } catch (err) {
      throw new HttpForbiddenException();
    }

    setSentryUserContext({
      // @ts-ignore
      orgId: req.org.id,
      // @ts-ignore
      paymentId: req.org.paymentId,
    });
    next();
  }
}
