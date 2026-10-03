import { Provider } from '@prisma/client';

import { CreateOrgUserDto } from '@gitroom/nestjs-libraries/dtos/auth/create.org.user.dto';
import { LoginUserDto } from '@gitroom/nestjs-libraries/dtos/auth/login.user.dto';
import { AuthService as AuthChecker } from '@gitroom/helpers/auth/auth.service';
import { AuthService } from './auth.service';

type Mocks = ReturnType<typeof mocks>;

const mocks = () => ({
  userService: {
    getUserByEmail: vi.fn(async () => null as any),
    getUserByProvider: vi.fn(async () => null as any),
    activateUser: vi.fn(),
    updatePassword: vi.fn(async () => ({ id: 'u1' })),
  },
  organizationService: {
    getCount: vi.fn(async () => 0),
    createOrgAndUser: vi.fn(async () => ({
      id: 'org-1',
      users: [{ user: { id: 'u1', email: 'a@b.c', activated: false } }],
    })),
    addUserToOrg: vi.fn(async () => ({ id: 'membership' })),
  },
  notificationService: {
    sendEmail: vi.fn(async (_to: string, _subject: string, _html: string) => undefined),
  },
  emailService: {
    sendEmail: vi.fn(
      async (_to: string, _subject: string, _html: string, _pos: string) =>
        undefined
    ),
  },
  providerManager: {
    getProvider: vi.fn(() => provider()),
  },
});

const provider = (over: Record<string, unknown> = {}) => ({
  getUser: vi.fn(async () => ({ id: 'p-1', email: 'p@b.c' })),
  getToken: vi.fn(async () => 'provider-token'),
  generateLink: vi.fn(() => 'https://provider.test/oauth'),
  ...over,
});

const build = (over: Partial<Mocks> = {}) => {
  const m = { ...mocks(), ...over };
  const service = new AuthService(
    m.userService as never,
    m.organizationService as never,
    m.notificationService as never,
    m.emailService as never,
    m.providerManager as never
  );

  return { service, ...m };
};

const registration = (over: Record<string, unknown> = {}) =>
  Object.assign(new CreateOrgUserDto(), {
    email: 'a@b.c',
    password: 'hunter22',
    provider: Provider.LOCAL,
    company: 'Acme',
    ...over,
  });

const login = (over: Record<string, unknown> = {}) =>
  Object.assign(new LoginUserDto(), {
    email: 'a@b.c',
    password: 'hunter22',
    provider: Provider.LOCAL,
    ...over,
  });

const activeUser = (over: Record<string, unknown> = {}) => ({
  id: 'u1',
  email: 'a@b.c',
  password: AuthChecker.hashPassword('hunter22'),
  activated: true,
  providerName: Provider.LOCAL,
  ...over,
});

beforeEach(() => {
  vi.stubEnv('JWT_SECRET', 'test-secret');
  vi.stubEnv('FRONTEND_URL', 'https://app.example.com');
  vi.stubEnv('DISABLE_REGISTRATION', '');
  vi.stubEnv('DISALLOW_PLUS', '');
  vi.stubEnv('DATAFAST_API_KEY', '');
  vi.stubEnv('NOT_SECURED', '');
});

describe('AuthService.canRegister', () => {
  it('allows registration when it was never disabled', async () => {
    const { service } = build();

    await expect(service.canRegister(Provider.LOCAL)).resolves.toBe(true);
  });

  it('always allows the generic provider through', async () => {
    const { service } = build();
    vi.stubEnv('DISABLE_REGISTRATION', 'true');

    await expect(service.canRegister(Provider.GENERIC)).resolves.toBe(true);
  });

  it('lets the very first account register even when disabled', async () => {
    const { service } = build();
    vi.stubEnv('DISABLE_REGISTRATION', 'true');

    await expect(service.canRegister(Provider.LOCAL)).resolves.toBe(true);
  });

  it('refuses a second account once registration is disabled', async () => {
    const { service, organizationService } = build();
    vi.stubEnv('DISABLE_REGISTRATION', 'true');
    organizationService.getCount.mockResolvedValue(3);

    await expect(service.canRegister(Provider.LOCAL)).resolves.toBe(false);
  });
});

describe('AuthService.routeAuth local registration', () => {
  it('creates the organization and sends an activation link', async () => {
    const { service, organizationService, emailService } = build();

    const result = await service.routeAuth(
      Provider.LOCAL,
      registration(),
      '1.2.3.4',
      'firefox'
    );

    expect(organizationService.createOrgAndUser).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'a@b.c' }),
      '1.2.3.4',
      'firefox'
    );
    expect(result.jwt).toEqual(expect.any(String));
    expect(emailService.sendEmail).toHaveBeenCalledWith(
      'a@b.c',
      'Activate your account',
      expect.stringContaining(`/auth/activate/${result.jwt}`),
      'top'
    );
  });

  it('lowercases the address so a duplicate cannot slip through casing', async () => {
    const { service, organizationService } = build();

    await service.routeAuth(
      Provider.LOCAL,
      registration({ email: 'MiXeD@B.c' }),
      '1.2.3.4',
      'firefox'
    );

    expect(organizationService.createOrgAndUser).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'mixed@b.c' }),
      '1.2.3.4',
      'firefox'
    );
  });

  it('refuses an address that is already taken', async () => {
    const { service, userService } = build();
    userService.getUserByEmail.mockResolvedValue(activeUser());

    await expect(
      service.routeAuth(Provider.LOCAL, registration(), '1.2.3.4', 'firefox')
    ).rejects.toThrow(/Email already exists/);
  });

  it('refuses to register while registration is disabled', async () => {
    const { service, organizationService } = build();
    vi.stubEnv('DISABLE_REGISTRATION', 'true');
    organizationService.getCount.mockResolvedValue(1);

    await expect(
      service.routeAuth(Provider.LOCAL, registration(), '1.2.3.4', 'firefox')
    ).rejects.toThrow(/Registration is disabled/);
  });

  it('refuses a plus addressed email when the instance disallows it', async () => {
    const { service } = build();
    vi.stubEnv('DISALLOW_PLUS', 'true');

    await expect(
      service.routeAuth(
        Provider.LOCAL,
        registration({ email: 'a+spam@b.c' }),
        '1.2.3.4',
        'firefox'
      )
    ).rejects.toThrow(/plus sign is not allowed/);
  });

  it('joins the invited organization when the signup carried an invite', async () => {
    const { service, organizationService } = build();

    const result = await service.routeAuth(
      Provider.LOCAL,
      registration(),
      '1.2.3.4',
      'firefox',
      { orgId: 'org-9', role: 'ADMIN', id: 'inv-1' }
    );

    expect(organizationService.addUserToOrg).toHaveBeenCalledWith(
      'u1',
      'inv-1',
      'org-9',
      'ADMIN'
    );
    expect(result.addedOrg).toEqual({ id: 'membership' });
  });

  it('does not join an organization for a bare boolean flag', async () => {
    const { service, organizationService } = build();

    const result = await service.routeAuth(
      Provider.LOCAL,
      registration(),
      '1.2.3.4',
      'firefox',
      true
    );

    expect(organizationService.addUserToOrg).not.toHaveBeenCalled();
    expect(result.addedOrg).toBe(false);
  });
});

describe('AuthService.routeAuth local login', () => {
  it('issues a token for the right password', async () => {
    const { service, userService } = build();
    userService.getUserByEmail.mockResolvedValue(activeUser());

    const result = await service.routeAuth(
      Provider.LOCAL,
      login(),
      '1.2.3.4',
      'firefox'
    );

    expect(result.addedOrg).toBe(false);
    expect(AuthChecker.verifyJWT(result.jwt)).toMatchObject({ id: 'u1' });
  });

  it('never puts the password hash inside the token', async () => {
    const { service, userService } = build();
    userService.getUserByEmail.mockResolvedValue(activeUser());

    const { jwt } = await service.routeAuth(
      Provider.LOCAL,
      login(),
      '1.2.3.4',
      'firefox'
    );

    expect(AuthChecker.verifyJWT(jwt)).not.toHaveProperty('password');
  });

  it('rejects an unknown address with the same message as a wrong password', async () => {
    const { service } = build();

    await expect(
      service.routeAuth(Provider.LOCAL, login(), '1.2.3.4', 'firefox')
    ).rejects.toThrow(/Invalid user name or password/);
  });

  it('rejects a wrong password', async () => {
    const { service, userService } = build();
    userService.getUserByEmail.mockResolvedValue(activeUser());

    await expect(
      service.routeAuth(
        Provider.LOCAL,
        login({ password: 'not-it' }),
        '1.2.3.4',
        'firefox'
      )
    ).rejects.toThrow(/Invalid user name or password/);
  });

  it('refuses a user who never activated', async () => {
    const { service, userService } = build();
    userService.getUserByEmail.mockResolvedValue(activeUser({ activated: false }));

    await expect(
      service.routeAuth(Provider.LOCAL, login(), '1.2.3.4', 'firefox')
    ).rejects.toThrow(/User is not activated/);
  });
});

describe('AuthService.routeAuth through an external provider', () => {
  const providerBody = () =>
    Object.assign(new CreateOrgUserDto(), {
      providerToken: 'tok',
      provider: Provider.GITHUB,
      company: 'Acme',
    });

  it('logs an existing provider user straight in', async () => {
    const { service, userService, organizationService } = build();
    userService.getUserByProvider.mockResolvedValue(activeUser());

    const result = await service.routeAuth(
      Provider.GITHUB,
      providerBody(),
      '1.2.3.4',
      'firefox'
    );

    expect(result.jwt).toEqual(expect.any(String));
    expect(organizationService.createOrgAndUser).not.toHaveBeenCalled();
  });

  it('registers a first-time provider user with the provider email', async () => {
    const { service, organizationService } = build();

    await service.routeAuth(
      Provider.GITHUB,
      providerBody(),
      '1.2.3.4',
      'firefox'
    );

    expect(organizationService.createOrgAndUser).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'p@b.c',
        provider: Provider.GITHUB,
        providerId: 'p-1',
        password: '',
      }),
      '1.2.3.4',
      'firefox'
    );
  });

  it('rejects a provider token the provider does not recognise', async () => {
    const { service, providerManager } = build();
    providerManager.getProvider.mockReturnValue(
      provider({ getUser: vi.fn(async () => null) })
    );

    await expect(
      service.routeAuth(Provider.GITHUB, providerBody(), '1.2.3.4', 'firefox')
    ).rejects.toThrow(/Invalid provider token/);
  });

  it('refuses a new provider user while registration is disabled', async () => {
    const { service, organizationService } = build();
    vi.stubEnv('DISABLE_REGISTRATION', 'true');
    organizationService.getCount.mockResolvedValue(1);

    await expect(
      service.routeAuth(Provider.GITHUB, providerBody(), '1.2.3.4', 'firefox')
    ).rejects.toThrow(/Registration is disabled/);
  });

  it('runs the provider post-registration hook', async () => {
    const { service, providerManager } = build();
    const postRegistration = vi.fn(async () => undefined);
    providerManager.getProvider.mockReturnValue(provider({ postRegistration }));

    await service.routeAuth(
      Provider.GITHUB,
      providerBody(),
      '1.2.3.4',
      'firefox'
    );

    expect(postRegistration).toHaveBeenCalledWith('tok', 'org-1');
  });

  it('still registers the user when the post-registration hook fails', async () => {
    const { service, providerManager } = build();
    providerManager.getProvider.mockReturnValue(
      provider({
        postRegistration: vi.fn(async () => {
          throw new Error('hook exploded');
        }),
      })
    );

    await expect(
      service.routeAuth(Provider.GITHUB, providerBody(), '1.2.3.4', 'firefox')
    ).resolves.toMatchObject({ jwt: expect.any(String) });
  });
});

describe('AuthService.getOrgFromCookie', () => {
  it('rejects a missing cookie', () => {
    const { service } = build();

    expect(service.getOrgFromCookie(undefined)).toBe(false);
  });

  it('rejects a cookie that is not a valid token', () => {
    const { service } = build();

    expect(service.getOrgFromCookie('not-a-jwt')).toBe(false);
  });

  it('rejects an invite whose window has closed', () => {
    const { service } = build();
    const cookie = AuthChecker.signJWT({
      orgId: 'org-1',
      timeLimit: '2020-01-01 00:00:00',
    });

    expect(service.getOrgFromCookie(cookie)).toBe(false);
  });

  it('returns the invite payload while it is still valid', () => {
    const { service } = build();
    const cookie = AuthChecker.signJWT({
      email: 'a@b.c',
      role: 'ADMIN',
      orgId: 'org-1',
      id: 'inv-1',
      timeLimit: '2999-01-01 00:00:00',
    });

    expect(service.getOrgFromCookie(cookie)).toMatchObject({
      orgId: 'org-1',
      role: 'ADMIN',
    });
  });
});

describe('AuthService password reset', () => {
  it('says nothing about an address that has no account', async () => {
    const { service, notificationService } = build();

    await expect(service.forgot('nobody@b.c')).resolves.toBe(false);
    expect(notificationService.sendEmail).not.toHaveBeenCalled();
  });

  it('refuses to reset a password owned by an external provider', async () => {
    const { service, userService, notificationService } = build();
    userService.getUserByEmail.mockResolvedValue(
      activeUser({ providerName: Provider.GITHUB })
    );

    await expect(service.forgot('a@b.c')).resolves.toBe(false);
    expect(notificationService.sendEmail).not.toHaveBeenCalled();
  });

  it('emails a reset link that expires in twenty minutes', async () => {
    const { service, userService, notificationService } = build();
    userService.getUserByEmail.mockResolvedValue(activeUser());

    await service.forgot('a@b.c');

    const [to, subject, body] = notificationService.sendEmail.mock.calls[0];
    expect(to).toBe('a@b.c');
    expect(subject).toBe('Reset your password');
    expect(body).toContain('/auth/forgot/');
    expect(body).toContain('expire in 20 minutes');
  });

  it('refuses a reset token that has expired', () => {
    const { service, userService } = build();
    const token = AuthChecker.signJWT({
      id: 'u1',
      expires: '2020-01-01 00:00:00',
    });

    expect(service.forgotReturn({ token, password: 'new-one' } as never)).toBe(
      false
    );
    expect(userService.updatePassword).not.toHaveBeenCalled();
  });

  it('sets the new password for a live reset token', () => {
    const { service, userService } = build();
    const token = AuthChecker.signJWT({
      id: 'u1',
      expires: '2999-01-01 00:00:00',
    });

    service.forgotReturn({ token, password: 'new-one' } as never);

    expect(userService.updatePassword).toHaveBeenCalledWith('u1', 'new-one');
  });
});

describe('AuthService.activate', () => {
  it('activates the account and returns a fresh token', async () => {
    const { service, userService } = build();
    userService.getUserByEmail.mockResolvedValue(activeUser({ activated: false }));
    const code = AuthChecker.signJWT({
      id: 'u1',
      email: 'a@b.c',
      activated: false,
    });

    const jwt = await service.activate(code, 'visitor-1');

    expect(userService.activateUser).toHaveBeenCalledWith('u1');
    expect(AuthChecker.verifyJWT(jwt as string)).toMatchObject({
      activated: true,
    });
  });

  it('refuses a code for an account that is already activated', async () => {
    const { service, userService } = build();
    userService.getUserByEmail.mockResolvedValue(activeUser());
    const code = AuthChecker.signJWT({
      id: 'u1',
      email: 'a@b.c',
      activated: false,
    });

    await expect(service.activate(code, 'visitor-1')).resolves.toBe(false);
    expect(userService.activateUser).not.toHaveBeenCalled();
  });

  it('refuses a code that already carries the activated flag', async () => {
    const { service } = build();
    const code = AuthChecker.signJWT({
      id: 'u1',
      email: 'a@b.c',
      activated: true,
    });

    await expect(service.activate(code, 'visitor-1')).resolves.toBe(false);
  });
});

describe('AuthService.resendActivationEmail', () => {
  it('refuses for an unknown address', async () => {
    const { service } = build();

    await expect(service.resendActivationEmail('nobody@b.c')).rejects.toThrow(
      /User not found/
    );
  });

  it('refuses for an account that is already activated', async () => {
    const { service, userService } = build();
    userService.getUserByEmail.mockResolvedValue(activeUser());

    await expect(service.resendActivationEmail('a@b.c')).rejects.toThrow(
      /already activated/
    );
  });

  it('sends a new activation link', async () => {
    const { service, userService, emailService } = build();
    userService.getUserByEmail.mockResolvedValue(activeUser({ activated: false }));

    await expect(service.resendActivationEmail('a@b.c')).resolves.toBe(true);
    expect(emailService.sendEmail).toHaveBeenCalledWith(
      'a@b.c',
      'Activate your account',
      expect.stringContaining('/auth/activate/'),
      'top'
    );
  });
});

describe('AuthService.checkExists', () => {
  it('refuses a web callback whose state does not match the cookie', async () => {
    const { service } = build();

    await expect(
      service.checkExists('github', 'code', undefined, 'state-a', 'state-b')
    ).rejects.toThrow(/Invalid state/);
  });

  it('refuses a web callback with no state at all', async () => {
    const { service } = build();

    await expect(service.checkExists('github', 'code')).rejects.toThrow(
      /Invalid state/
    );
  });

  it('skips the state check for the mobile redirect flow', async () => {
    const { service } = build();

    await expect(
      service.checkExists('github', 'code', 'postiz://callback')
    ).resolves.toEqual({ token: 'provider-token' });
  });

  it('skips the state check on an unsecured instance', async () => {
    const { service } = build();
    vi.stubEnv('NOT_SECURED', 'true');

    await expect(service.checkExists('github', 'code')).resolves.toEqual({
      token: 'provider-token',
    });
  });

  it('returns a session for a provider account we already know', async () => {
    const { service, userService } = build();
    userService.getUserByProvider.mockResolvedValue(activeUser());

    await expect(
      service.checkExists('github', 'code', undefined, 'state', 'state')
    ).resolves.toMatchObject({ jwt: expect.any(String) });
  });

  it('rejects a token the provider will not resolve to a user', async () => {
    const { service, providerManager } = build();
    providerManager.getProvider.mockReturnValue(
      provider({ getUser: vi.fn(async () => null) })
    );

    await expect(
      service.checkExists('github', 'code', undefined, 'state', 'state')
    ).rejects.toThrow(/Invalid user/);
  });
});

describe('AuthService.oauthLink', () => {
  it('asks the provider for its consent url', () => {
    const { service, providerManager } = build();
    const instance = provider();
    providerManager.getProvider.mockReturnValue(instance);

    expect(service.oauthLink('github', { a: 1 })).toBe(
      'https://provider.test/oauth'
    );
    expect(instance.generateLink).toHaveBeenCalledWith({ a: 1 });
  });
});
