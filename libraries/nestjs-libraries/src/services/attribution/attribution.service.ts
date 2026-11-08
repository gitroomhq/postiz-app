import { Injectable } from '@nestjs/common';
import { User } from '@prisma/client';
import { uniq } from 'lodash';
import { AttributionProviderManager } from '@gitroom/nestjs-libraries/services/attribution/attribution.provider.manager';

@Injectable()
export class AttributionService {
  constructor(
    private _attributionProviderManager: AttributionProviderManager
  ) {}

  // URL parameters the app keeps from the landing page until sign-up
  queryParams() {
    return uniq(
      this._attributionProviderManager
        .getProviders()
        .map((p) => p.provider.queryParam)
    );
  }

  // Reports a new account to every configured tool, with the click id the
  // sign-up brought for it. Never throws and never rejects: an attribution
  // outage must not break the sign-up, so callers fire it in the background.
  async lead(
    user: Pick<User, 'id' | 'email' | 'name' | 'lastName'>,
    attribution?: Record<string, string>
  ) {
    try {
      await Promise.all(
        this._attributionProviderManager
          .getProviders()
          .map(async ({ name, provider }) => {
            // comes from the request body as is
            const clickId = attribution?.[provider.queryParam];
            try {
              await provider.lead(
                {
                  id: user.id,
                  // wallet / farcaster accounts have no email
                  email: user.email?.includes('@') ? user.email : '',
                  firstName: user.name || '',
                  lastName: user.lastName || '',
                },
                typeof clickId === 'string' && clickId.length <= 500
                  ? clickId
                  : ''
              );
            } catch (err) {
              console.error(
                `Attribution provider ${name} failed to report user ${user.id}:`,
                err
              );
            }
          })
      );
    } catch (err) {
      console.error(`Attribution failed to report user ${user.id}:`, err);
    }
  }
}
