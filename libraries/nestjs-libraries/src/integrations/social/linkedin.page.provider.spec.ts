jest.mock('./linkedin.provider', () => ({
  LinkedinProvider: class LinkedinProvider {
    checkScopes(required: string[], got: string | string[]) {
      const scopes = Array.isArray(got) ? got : got.split(' ');
      if (!required.every((scope) => scopes.includes(scope))) {
        throw new Error('missing scope');
      }
    }
  },
}));

import { LinkedinPageProvider } from './linkedin.page.provider';

const fetchMock = jest.fn();

const jsonResponse = (body: unknown) => ({
  json: jest.fn().mockResolvedValue(body),
});

describe('LinkedinPageProvider', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock as unknown as typeof fetch;
    process.env.LINKEDIN_CLIENT_ID = 'client-id';
    process.env.FRONTEND_URL = 'https://postiz.example.com';
  });

  it('uses Community Management scopes without OIDC or silent authorization', async () => {
    const { url } = await new LinkedinPageProvider().generateAuthUrl();
    const authorization = new URL(url);

    expect(authorization.searchParams.get('scope')?.split(' ')).toEqual([
      'w_member_social',
      'r_basicprofile',
      'rw_organization_admin',
      'w_organization_social',
      'r_organization_social',
    ]);
    const scopes = authorization.searchParams.get('scope')?.split(' ') || [];
    expect(scopes).not.toContain('openid');
    expect(scopes).not.toContain('profile');
    expect(authorization.searchParams.has('prompt')).toBe(false);
  });

  it('authenticates a page admin through the Community Management profile endpoint', async () => {
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({
          access_token: 'access-token',
          expires_in: 3600,
          refresh_token: 'refresh-token',
          scope:
            'w_member_social r_basicprofile rw_organization_admin w_organization_social r_organization_social',
        })
      )
      .mockResolvedValueOnce(
        jsonResponse({
          id: 'member-101',
          localizedFirstName: 'Yan',
          localizedLastName: 'Lai',
          vanityName: 'laiyanlong_',
        })
      );

    await expect(
      new LinkedinPageProvider().authenticate({
        code: 'authorization-code',
        codeVerifier: 'code-verifier',
      })
    ).resolves.toEqual({
      id: 'member-101',
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      expiresIn: 3600,
      name: 'Yan Lai',
      picture: '',
      username: 'laiyanlong_',
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'https://api.linkedin.com/v2/me',
      {
        headers: {
          Authorization: 'Bearer access-token',
        },
      }
    );
  });

  it('loads approved organization admins from the REST organization ACL API', async () => {
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({
          elements: [
            {
              role: 'ADMINISTRATOR',
              organization: 'urn:li:organization:101',
            },
            {
              role: 'CONTENT_ADMIN',
              organization: 'urn:li:organization:202',
            },
            {
              role: 'CONTENT_ADMINISTRATOR',
              organizationTarget: 'urn:li:organization:202',
            },
            {
              role: 'ANALYST',
              organization: 'urn:li:organization:303',
            },
          ],
        })
      )
      .mockResolvedValueOnce(
        jsonResponse({
          results: {
            '101': {
              id: 101,
              localizedName: 'DappGo',
              vanityName: 'dappgo',
              logoV2: {
                'original~': {
                  elements: [
                    {
                      identifiers: [
                        { identifier: 'https://example.com/logo.png' },
                      ],
                    },
                  ],
                },
              },
            },
            '202': {
              id: 202,
              name: { localized: { en_US: 'DappGo Research' } },
              vanityName: 'dappgo-research',
            },
          },
        })
      );

    await expect(
      new LinkedinPageProvider().companies('access-token')
    ).resolves.toEqual([
      {
        id: '101',
        page: '101',
        username: 'dappgo',
        name: 'DappGo',
        picture: 'https://example.com/logo.png',
      },
      {
        id: '202',
        page: '202',
        username: 'dappgo-research',
        name: 'DappGo Research',
        picture: undefined,
      },
    ]);

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'https://api.linkedin.com/rest/organizationAcls?q=roleAssignee&state=APPROVED',
      {
        headers: {
          Authorization: 'Bearer access-token',
          'X-Restli-Protocol-Version': '2.0.0',
          'LinkedIn-Version': '202601',
        },
      }
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'https://api.linkedin.com/rest/organizations?ids=List(101,202)',
      {
        headers: {
          Authorization: 'Bearer access-token',
          'X-Restli-Protocol-Version': '2.0.0',
          'LinkedIn-Version': '202601',
        },
      }
    );
  });

  it('does not make an organization lookup when no approved admin role is present', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        elements: [
          {
            role: 'ANALYST',
            organization: 'urn:li:organization:303',
          },
        ],
      })
    );

    await expect(
      new LinkedinPageProvider().companies('access-token')
    ).resolves.toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('uses the REST organization lookup when reconnecting a page', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        id: 101,
        localizedName: 'DappGo',
        vanityName: 'dappgo',
      })
    );

    await expect(
      new LinkedinPageProvider().fetchPageInformation('access-token', {
        page: '101',
      })
    ).resolves.toEqual({
      id: 101,
      name: 'DappGo',
      access_token: 'access-token',
      picture: undefined,
      username: 'dappgo',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.linkedin.com/rest/organizations/101',
      {
        headers: {
          Authorization: 'Bearer access-token',
          'X-Restli-Protocol-Version': '2.0.0',
          'LinkedIn-Version': '202601',
        },
      }
    );
  });
});
