import { Injectable } from '@nestjs/common';
import { UsersService } from '@gitroom/nestjs-libraries/database/prisma/users/users.service';
import { OrganizationService } from '@gitroom/nestjs-libraries/database/prisma/organizations/organization.service';

// AgentOnboard (https://docs.ao.aawej.in/docs/partner-guide) is an identity
// layer for AI agents. An agent presents a short-lived session token in the
// `x-session-token` header; we exchange it for the user's AgentOnboard login
// email via POST /api/verify, then map that email to a Postiz account. The
// feature is opt-in: without AGENTONBOARD_PARTNER_KEY no verification can
// succeed, so the existing public API auth is completely untouched.
@Injectable()
export class AgentOnboardService {
  constructor(
    private _usersService: UsersService,
    private _organizationService: OrganizationService
  ) {}

  // Resolves a session token to the Postiz user + organization it acts on, or
  // null when the token is invalid, the email has no Postiz account, or the
  // user belongs to no (enabled) organization.
  async authenticate(sessionToken: string) {
    const email = await this.getEmailFromSessionToken(sessionToken);
    if (!email) {
      return null;
    }

    const user = await this._usersService.getAgentUserByEmail(email);
    if (!user) {
      return null;
    }

    // Same default-org resolution the human auth path uses (AuthMiddleware):
    // the first enabled organization the user belongs to. The org carries the
    // user's real role (org.users[0].role), so an agent gets exactly the
    // permissions of the account it verifies to.
    const organization = (
      await this._organizationService.getOrgsByUserId(user.id)
    ).find((f) => !f.users[0]?.disabled);

    if (!organization) {
      return null;
    }

    return { user, organization };
  }

  // Exchanges the agent's session token for the AgentOnboard login email.
  // Follows the documented contract:
  //   POST {apiUrl}/api/verify
  //   Authorization: Bearer <partner key>
  //   { "sessionToken": "<session token>" }
  private async getEmailFromSessionToken(sessionToken: string) {
    const partnerKey = process.env.AGENTONBOARD_PARTNER_KEY;
    if (!partnerKey) {
      return null;
    }

    const apiUrl =
      process.env.AGENTONBOARD_API_URL || 'https://api.ao.aawej.in';

    try {
      const response = await fetch(`${apiUrl}/api/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${partnerKey}`,
        },
        body: JSON.stringify({ sessionToken }),
        signal: AbortSignal.timeout(10_000),
      });

      if (!response.ok) {
        return null;
      }

      const body = (await response.json()) as { email?: string };
      return body.email || null;
    } catch {
      return null;
    }
  }
}
