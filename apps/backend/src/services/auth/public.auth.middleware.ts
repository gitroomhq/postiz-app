import { HttpStatus, Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { OrganizationService } from '@gitroom/nestjs-libraries/database/prisma/organizations/organization.service';
import { OAuthService } from '@gitroom/nestjs-libraries/database/prisma/oauth/oauth.service';
import { AgentOnboardService } from '@gitroom/nestjs-libraries/agentonboard/agentonboard.service';
import { HttpForbiddenException } from '@gitroom/nestjs-libraries/services/exception.filter';

@Injectable()
export class PublicAuthMiddleware implements NestMiddleware {
  constructor(
    private _organizationService: OrganizationService,
    private _oauthService: OAuthService,
    private _agentOnboardService: AgentOnboardService
  ) {}
  async use(req: Request, res: Response, next: NextFunction) {
    const sessionToken = req.headers['x-session-token'] as string;
    const auth = (req.headers.authorization ||
      req.headers.Authorization) as string;

    // AgentOnboard session-token auth: an AI agent acts on behalf of a user
    // whose AgentOnboard login email matches a Postiz account. Opt-in — it is
    // only reachable when AGENTONBOARD_PARTNER_KEY is configured, and it never
    // changes the behavior of the API-key / OAuth token paths below.
    if (sessionToken) {
      try {
        const agent =
          await this._agentOnboardService.authenticate(sessionToken);
        if (!agent) {
          res
            .status(HttpStatus.UNAUTHORIZED)
            .json({ msg: 'Invalid session token' });
          return;
        }

        if (!!process.env.STRIPE_SECRET_KEY && !agent.organization.subscription) {
          res
            .status(HttpStatus.UNAUTHORIZED)
            .json({ msg: 'No subscription found' });
          return;
        }

        // The org carries the user's real role (org.users[0].role), so the
        // agent gets exactly the permissions of the account it verifies to.
        // @ts-ignore
        req.org = agent.organization;
        next();
        return;
      } catch (err) {
        throw new HttpForbiddenException();
      }
    }

    if (!auth) {
      res.status(HttpStatus.UNAUTHORIZED).json({ msg: 'No API Key found' });
      return;
    }
    try {
      if (auth.startsWith('pos_')) {
        const authorization = await this._oauthService.getOrgByOAuthToken(auth);
        if (!authorization) {
          res
            .status(HttpStatus.UNAUTHORIZED)
            .json({ msg: 'Invalid OAuth token' });
          return;
        }

        const org = authorization.organization;
        if (!!process.env.STRIPE_SECRET_KEY && !org.subscription) {
          res
            .status(HttpStatus.UNAUTHORIZED)
            .json({ msg: 'No subscription found' });
          return;
        }

        // @ts-ignore
        req.org = { ...org, users: [{ users: { role: 'SUPERADMIN' } }] };
      } else {
        const org = await this._organizationService.getOrgByApiKey(auth);
        if (!org) {
          res
            .status(HttpStatus.UNAUTHORIZED)
            .json({ msg: 'Invalid API key' });
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
      }
    } catch (err) {
      throw new HttpForbiddenException();
    }
    next();
  }
}
