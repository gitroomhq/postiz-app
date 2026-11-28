import { LinkedinProvider } from '@gitroom/nestjs-libraries/integrations/social/linkedin.provider';
import { LinkedinPageProvider } from '@gitroom/nestjs-libraries/integrations/social/linkedin.page.provider';

/**
 * A LinkedIn app with only the self-serve products enabled
 * ("Sign In with LinkedIn using OpenID Connect" + "Share on LinkedIn")
 * can only ever grant three scopes: `openid`, `profile` and
 * `w_member_social`. The organization scopes require LinkedIn's
 * review-gated Community Management API product, which cannot even
 * coexist with those two products on the same app, and `r_basicprofile`
 * is deprecated.
 *
 * If the personal provider asks LinkedIn for more than the self-serve
 * set, LinkedIn answers `unauthorized_scope_error`, and a token issued
 * without the extra scopes is rejected by `checkScopes` - so a personal
 * profile can never be connected with a standard self-hosted app.
 */
describe('LinkedIn providers OAuth scopes', () => {
  const selfServeScopes = ['openid', 'profile', 'w_member_social'];
  const gatedOrDeprecatedScopes = [
    'r_basicprofile',
    'rw_organization_admin',
    'w_organization_social',
    'r_organization_social',
  ];

  describe('personal profile provider (identifier: linkedin)', () => {
    const provider = new LinkedinProvider();

    it('requests only the scopes a self-serve LinkedIn app can grant', () => {
      expect(provider.scopes).toEqual(selfServeScopes);
    });

    it('does not request any organization or deprecated scope', () => {
      for (const scope of gatedOrDeprecatedScopes) {
        expect(provider.scopes).not.toContain(scope);
      }
    });

    it('builds an authorization URL asking only for the self-serve scopes', async () => {
      const { url } = await provider.generateAuthUrl();
      const scopeParam = new URL(url).searchParams.get('scope');
      expect(scopeParam).toBe(selfServeScopes.join(' '));
    });

    it('accepts a token that carries only the self-serve scopes', () => {
      expect(() =>
        provider.checkScopes(provider.scopes, selfServeScopes.join(' '))
      ).not.toThrow();
    });
  });

  describe('page provider (identifier: linkedin-page)', () => {
    const provider = new LinkedinPageProvider();

    it('keeps the full scope set, including the organization scopes', () => {
      expect(provider.scopes).toEqual([
        'openid',
        'profile',
        'w_member_social',
        'r_basicprofile',
        'rw_organization_admin',
        'w_organization_social',
        'r_organization_social',
      ]);
    });
  });
});
