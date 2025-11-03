import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { AuthService } from '@gitroom/helpers/auth/auth.service';
import { User } from '@prisma/client';
import { OrganizationService } from '@gitroom/nestjs-libraries/database/prisma/organizations/organization.service';
import { UsersService } from '@gitroom/nestjs-libraries/database/prisma/users/users.service';
import { getCookieUrlFromDomain } from '@gitroom/helpers/subdomain/subdomain.management';
import { HttpForbiddenException } from '@gitroom/nestjs-libraries/services/exception.filter';
import { MastraService } from '@gitroom/nestjs-libraries/chat/mastra.service';

export const removeAuth = (res: Response) => {
  res.cookie('auth', '', {
    domain: getCookieUrlFromDomain(process.env.FRONTEND_URL!),
    ...(!process.env.NOT_SECURED
      ? {
          secure: true,
          httpOnly: true,
          sameSite: 'none',
        }
      : {}),
    expires: new Date(0),
    maxAge: -1,
  });
  res.header('logout', 'true');
};

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  constructor(
    private _organizationService: OrganizationService,
    private _userService: UsersService
  ) {}
  async use(req: Request, res: Response, next: NextFunction) {
    // Check if user already has valid auth cookie first
    const existingAuth = req.headers.auth || req.cookies.auth;

    // TRUSTED REVERSE PROXY SSO
    // Supports any reverse proxy that can set trusted headers (Traefik, Nginx, Caddy, oauth2-proxy, etc.)
    const enableSSO = process.env.ENABLE_SSO === 'true';
    const trustProxy = process.env.SSO_TRUST_PROXY === 'true';
    const ssoMode = process.env.SSO_MODE || 'trusted-headers';

    // Only process SSO if explicitly enabled AND proxy is trusted
    if (enableSSO && trustProxy && ssoMode === 'trusted-headers' && !existingAuth) {
      // Configurable header names (default to Authelia/ForwardAuth standard)
      const emailHeader = (process.env.SSO_HEADER_EMAIL || 'remote-email').toLowerCase();
      const nameHeader = (process.env.SSO_HEADER_NAME || 'remote-name').toLowerCase();
      const userHeader = (process.env.SSO_HEADER_USER || 'remote-user').toLowerCase();
      const groupsHeader = (process.env.SSO_HEADER_GROUPS || 'remote-groups').toLowerCase();

      // Optional shared secret validation
      const sharedSecret = process.env.SSO_SHARED_SECRET;
      const secretHeader = (process.env.SSO_SECRET_HEADER || 'x-sso-secret').toLowerCase();

      // Security: validate shared secret if configured
      if (sharedSecret && req.headers[secretHeader] !== sharedSecret) {
        if (process.env.NODE_ENV !== 'production') {
          console.warn('[SSO] Invalid or missing shared secret header, falling back to normal auth');
        }
        // Fall through to normal auth
      } else {
        // Extract SSO headers
        const ssoEmail = req.headers[emailHeader] as string | undefined;
        const ssoName = req.headers[nameHeader] as string | undefined;
        const ssoUser = req.headers[userHeader] as string | undefined;
        const ssoGroups = req.headers[groupsHeader] as string | undefined;

        if (process.env.NODE_ENV !== 'production') {
          console.log('[SSO] Trusted headers detected:', {
            email: ssoEmail,
            name: ssoName,
            user: ssoUser,
            groups: ssoGroups,
          });
        }

        // Process SSO if we have at least email or username
        if (ssoEmail || ssoUser) {
          const lookupEmail = ssoEmail || `${ssoUser}@sso.local`;

          try {
            let user = await this._userService.getUserByEmail(lookupEmail);

            if (user && user.activated) {
              // Load organization context
              delete user.password;
              const orgHeader = req.cookies.showorg || req.headers.showorg;
              const organizations = (
                await this._organizationService.getOrgsByUserId(user.id)
              ).filter((f) => !f.users[0].disabled);

              // Organization selection strategy
              const orgStrategy = process.env.SSO_DEFAULT_ORG_STRATEGY || 'first-active';
              const forceOrgId = process.env.SSO_FORCE_ORG_ID;

              let selectedOrg;
              if (forceOrgId) {
                selectedOrg = organizations.find((org) => org.id === forceOrgId);
              } else if (orgHeader) {
                selectedOrg = organizations.find((org) => org.id === orgHeader);
              } else if (orgStrategy === 'first-active') {
                selectedOrg = organizations[0];
              }

              if (!organizations || !selectedOrg) {
                if (process.env.NODE_ENV !== 'production') {
                  console.error('[SSO] No organization found for user:', lookupEmail);
                }
                throw new HttpForbiddenException();
              }

              // Ensure org has API key
              if (!selectedOrg.apiKey) {
                await this._organizationService.updateApiKey(selectedOrg.id);
              }

              // Enrich JWT payload with org context
              const jwtPayload = { ...user, orgId: selectedOrg.id };
              const jwt = AuthService.signJWT(jwtPayload);
              const cookieDomain = getCookieUrlFromDomain(process.env.FRONTEND_URL!);

              if (process.env.NODE_ENV !== 'production') {
                console.log('[SSO] Setting auth cookie for user:', lookupEmail, 'org:', selectedOrg.id);
              }

              // Set secure cookie
              res.cookie('auth', jwt, {
                path: '/',
                domain: cookieDomain,
                ...(!process.env.NOT_SECURED
                  ? {
                      secure: true,
                      httpOnly: true,
                      sameSite: 'lax',
                    }
                  : {}),
                maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
              });

              // Set request context
              // @ts-ignore
              req.user = user;
              // @ts-ignore
              req.org = selectedOrg;

              // Standardize authorization header for downstream middleware
              delete req.headers.authorization;
              req.headers.authorization = `Bearer ${jwt}`;
              req.headers.auth = jwt;
              req.cookies.auth = jwt;

              if (process.env.NODE_ENV !== 'production') {
                console.log('[SSO] Request authenticated with org:', selectedOrg.id);
              }

              return next();
            } else {
              if (process.env.NODE_ENV !== 'production') {
                console.log('[SSO] User not found or not activated, continuing to normal auth');
              }
            }
          } catch (err) {
            if (process.env.NODE_ENV !== 'production') {
              console.error('[SSO] Error during SSO processing:', err);
            }
            // Graceful fallback: continue to normal auth flow
          }
        }
      }
    }

    // Standard Postiz authentication flow
    const auth = req.headers.auth || req.cookies.auth;
    if (!auth) {
      throw new HttpForbiddenException();
    }

    try {
      let user = AuthService.verifyJWT(auth) as User | null;
      const orgHeader = req.cookies.showorg || req.headers.showorg;

      if (!user) {
        throw new HttpForbiddenException();
      }

      if (!user.activated) {
        throw new HttpForbiddenException();
      }

      // Handle impersonation (superadmin feature)
      const impersonate = req.cookies.impersonate || req.headers.impersonate;
      if (user?.isSuperAdmin && impersonate) {
        const loadImpersonate = await this._organizationService.getUserOrg(
          impersonate
        );

        if (loadImpersonate) {
          user = loadImpersonate.user;
          user.isSuperAdmin = true;
          delete user.password;

          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-expect-error
          req.user = user;

          // @ts-ignore
          loadImpersonate.organization.users =
            loadImpersonate.organization.users.filter(
              (f) => f.userId === user.id
            );
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-expect-error
          req.org = loadImpersonate.organization;
          next();
          return;
        }
      }

      delete user.password;
      const organization = (
        await this._organizationService.getOrgsByUserId(user.id)
      ).filter((f) => !f.users[0].disabled);
      const setOrg =
        organization.find((org) => org.id === orgHeader) || organization[0];

      if (!organization) {
        throw new HttpForbiddenException();
      }

      if (!setOrg.apiKey) {
        await this._organizationService.updateApiKey(setOrg.id);
      }

      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error
      req.user = user;

      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error
      req.org = setOrg;
    } catch (err) {
      throw new HttpForbiddenException();
    }
    next();
  }
}
