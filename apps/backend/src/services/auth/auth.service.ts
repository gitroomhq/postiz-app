import { Injectable } from '@nestjs/common';
import { randomBytes, randomInt } from 'crypto';
import {
  OtpPurpose,
  Provider,
  User,
} from '@gitroom/nestjs-libraries/database/prisma/generated/client';
import { CreateOrgUserDto } from '@gitroom/nestjs-libraries/dtos/auth/create.org.user.dto';
import { LoginUserDto } from '@gitroom/nestjs-libraries/dtos/auth/login.user.dto';
import { UsersService } from '@gitroom/nestjs-libraries/database/prisma/users/users.service';
import { OrganizationService } from '@gitroom/nestjs-libraries/database/prisma/organizations/organization.service';
import { AuthService as AuthChecker } from '@gitroom/helpers/auth/auth.service';
import { AuthProviderManager } from '@gitroom/backend/services/auth/providers/providers.manager';
import dayjs from 'dayjs';
import { NotificationService } from '@gitroom/nestjs-libraries/database/prisma/notifications/notification.service';
import { ForgotReturnPasswordDto } from '@gitroom/nestjs-libraries/dtos/auth/forgot-return.password.dto';
import { EmailService } from '@gitroom/nestjs-libraries/services/email.service';
import { NewsletterService } from '@gitroom/nestjs-libraries/newsletter/newsletter.service';
import { OtpService } from '@gitroom/nestjs-libraries/database/prisma/otp/otp.service';
import { AbuseGuardService } from '@gitroom/nestjs-libraries/services/abuse-guard.service';
import { isEmailActivationRequired } from '@gitroom/helpers/utils/activation.required';
import { isWalletLoginEnabled } from '@gitroom/helpers/utils/wallet.login';
import {
  existingAccountForEmail,
  findExistingOauthUser,
  oauthWorkspaceName,
  shouldBlockLocalRegister,
  shouldCompleteOauthWithoutOrgForm,
} from '@gitroom/backend/services/auth/oauth-local-link';
import {
  hasPasswordHash,
  oauthLinkTicketMatchesState,
} from '@gitroom/helpers/auth/account-security';

// A session lasts as long as the cookie that carries it (one year, set in
// auth.controller). Before this no token had an expiry at all, so a copied
// session was good forever.
const SESSION_LIFETIME = '365d';
const ACTIVATION_LIFETIME = '7d';
const RESET_LIFETIME = '20m';

// Compared against when there is no password to compare with, so a login for
// an unknown address costs the same bcrypt round as a wrong password and the
// response time no longer says which addresses exist. Made on first use:
// hashing at import would put a bcrypt round in every process's boot.
let dummyPasswordHash: string | undefined;
const passwordHashToCompare = (hash?: string | null) =>
  hash ||
  (dummyPasswordHash ??= AuthChecker.hashPassword(
    randomBytes(16).toString('hex'),
  ));

@Injectable()
export class AuthService {
  constructor(
    private _userService: UsersService,
    private _organizationService: OrganizationService,
    private _notificationService: NotificationService,
    private _emailService: EmailService,
    private _providerManager: AuthProviderManager,
    private _otpService: OtpService,
    private _abuseGuardService: AbuseGuardService,
  ) {}

  // Passwordless email-code login (cloud). Kept behind PASSWORDLESS_LOGIN so
  // self-hosters keep the email+password + OAuth flow unchanged.
  private otpCode() {
    return randomInt(0, 1_000_000).toString().padStart(6, '0');
  }

  async requestOtp(email: string, ip: string, captchaToken?: string) {
    if (!this._emailService.hasProvider()) {
      throw new Error('Email delivery is not configured');
    }

    email = email.toLowerCase();

    const decision = await this._abuseGuardService.challenge({
      action: 'otp_request',
      ip,
      email,
      captchaToken,
    });
    if (!decision.allow) {
      throw new Error(
        decision.reason === 'rate_limited'
          ? 'Too many requests, please try again later'
          : 'Please complete the verification and try again',
      );
    }

    const code = this.otpCode();

    await this._otpService.invalidateActive(email, OtpPurpose.LOGIN);
    await this._otpService.create({
      email,
      codeHash: AuthChecker.hashPassword(code),
      purpose: OtpPurpose.LOGIN,
      expiresAt: dayjs().add(10, 'minutes').toDate(),
      ip,
    });

    await this._notificationService.sendEmail(
      email,
      'Your PostQueen sign-in code',
      `Your sign-in code is <strong style="font-size:20px;letter-spacing:2px">${code}</strong>.<br />It expires in 10 minutes. If you didn't request it, you can ignore this email.`,
    );

    // Never reveal whether the email maps to an existing account.
    return { sent: true };
  }

  async verifyOtp(email: string, code: string, ip: string, userAgent: string) {
    email = email.toLowerCase();

    // Rate limiting only — the captcha is solved when the code is requested,
    // and its token is single-use so none exists by this point. Guessing the
    // code is separately capped at 5 attempts below.
    const decision = await this._abuseGuardService.challenge({
      action: 'otp_verify',
      ip,
      email,
    });
    if (!decision.allow) {
      throw new Error(
        decision.reason === 'rate_limited'
          ? 'Too many attempts, please try again later'
          : 'Verification blocked, please request a new code',
      );
    }

    const record = await this._otpService.getLatestActive(
      email,
      OtpPurpose.LOGIN,
    );

    if (!record || dayjs(record.expiresAt).isBefore(dayjs())) {
      throw new Error('Invalid or expired code');
    }

    if (record.attempts >= 5) {
      await this._otpService.consume(record.id);
      throw new Error('Too many attempts, request a new code');
    }

    if (!AuthChecker.comparePassword(code, record.codeHash)) {
      await this._otpService.incrementAttempts(record.id);
      throw new Error('Invalid or expired code');
    }

    await this._otpService.consume(record.id);

    const local = await this._userService.getUserByEmail(email);
    let user: User | null = existingAccountForEmail(
      local,
      local ?? (await this._userService.getUserByEmailAnyProvider(email)),
    );
    let isNew = false;

    if (!user) {
      // Only the account-creation branch is gated; an existing user signing in
      // never reaches it. Without this the flag was cosmetic — the signup page
      // said registration was closed while this route happily created accounts.
      if (!(await this.canRegister(Provider.LOCAL))) {
        throw new Error('Registration is disabled');
      }

      const company = oauthWorkspaceName(email);
      const create = await this._organizationService.createOrgAndUser(
        {
          email,
          password: '',
          provider: Provider.LOCAL,
          company,
          datafast_visitor_id: '',
        },
        ip,
        userAgent,
      );

      user = create.users[0].user as User;
      isNew = true;
      this._track('register', email, '').catch(() => {});
      await NewsletterService.register(email);
    }

    // The code proves ownership of the inbox, so the account is verified.
    if (!user.activated) {
      await this._userService.activateUser(user.id);
      user.activated = true;
    }

    return { jwt: await this.jwt(user), isNew };
  }
  async canRegister(provider: string) {
    if (
      process.env.DISABLE_REGISTRATION !== 'true' ||
      provider === Provider.GENERIC
    ) {
      return true;
    }

    return (await this._organizationService.getCount()) === 0;
  }

  async routeAuth(
    provider: Provider,
    body: CreateOrgUserDto | LoginUserDto,
    ip: string,
    userAgent: string,
    addToOrg?: boolean | { orgId: string; role: 'USER' | 'ADMIN'; id: string },
  ) {
    if (provider === Provider.LOCAL) {
      if (process.env.DISALLOW_PLUS && body.email.includes('+')) {
        throw new Error('Email with plus sign is not allowed');
      }
      if (body instanceof CreateOrgUserDto) {
        body.email = body.email.toLowerCase();
      }
      const user = await this._userService.getUserByEmail(body.email);
      const loginUser =
        user && hasPasswordHash(user.password)
          ? user
          : await this._userService.getUserByEmailWithPassword(body.email);
      if (body instanceof CreateOrgUserDto) {
        const any = existingAccountForEmail(
          user,
          user ??
            (await this._userService.getUserByEmailAnyProvider(body.email)),
        );
        if (shouldBlockLocalRegister(any)) {
          throw new Error('Email already exists');
        }

        if (!(await this.canRegister(provider))) {
          throw new Error('Registration is disabled');
        }

        const create = await this._organizationService.createOrgAndUser(
          body,
          ip,
          userAgent,
        );

        const addedOrg =
          addToOrg && typeof addToOrg !== 'boolean'
            ? await this._organizationService.addUserToOrg(
                create.users[0].user.id,
                addToOrg.id,
                addToOrg.orgId,
                addToOrg.role,
              )
            : false;

        const obj = { addedOrg, jwt: await this.jwt(create.users[0].user) };
        // The account is already activated when this install does not gate on
        // it, so the link would point at a no-op. Sending it anyway told the
        // user to do something that does not exist and spent sender reputation
        // on an address nothing else needs to reach yet.
        if (isEmailActivationRequired()) {
          await this._emailService.sendEmail(
            body.email,
            'Activate your account',
            `Click <a href="${this.activationLink(
              create.users[0].user,
            )}">here</a> to activate your account`,
            'top',
          );
        }
        return obj;
      }

      // Always one bcrypt round, whether or not the address exists: skipping
      // it for an unknown address answered in ~1 ms instead of ~100 ms.
      const passwordMatches = AuthChecker.comparePassword(
        body.password,
        passwordHashToCompare(loginUser?.password),
      );
      if (!hasPasswordHash(loginUser?.password) || !passwordMatches) {
        throw new Error('Invalid user name or password');
      }

      if (!loginUser.activated) {
        throw new Error('User is not activated');
      }

      return { addedOrg: false, jwt: await this.jwt(loginUser) };
    }

    const user = await this.loginOrRegisterProvider(
      provider,
      body as CreateOrgUserDto,
      ip,
      userAgent,
    );

    const addedOrg =
      addToOrg && typeof addToOrg !== 'boolean'
        ? await this._organizationService.addUserToOrg(
            user.id,
            addToOrg.id,
            addToOrg.orgId,
            addToOrg.role,
          )
        : false;
    return { addedOrg, jwt: await this.jwt(user) };
  }

  public getOrgFromCookie(cookie?: string) {
    if (!cookie) {
      return false;
    }

    try {
      const getOrg: any = AuthChecker.verifyJWT(cookie);
      // Presence first, for the same reason as `forgotReturn`: `dayjs(undefined)`
      // is now, and `now.isBefore(now)` is false, so a token with no `timeLimit`
      // passed the window check instead of failing it.
      if (!getOrg?.orgId || !getOrg?.timeLimit) {
        return false;
      }
      if (dayjs(getOrg.timeLimit).isBefore(dayjs())) {
        return false;
      }

      return getOrg as {
        email: string;
        role: 'USER' | 'ADMIN';
        orgId: string;
        id: string;
      };
    } catch (err) {
      return false;
    }
  }

  private oauthUserStore() {
    return {
      getUserByProvider: (providerId: string, name: string) =>
        this._userService.getUserByProvider(providerId, name as Provider),
      getUserByEmail: (email: string) =>
        this._userService.getUserByEmail(email),
      attachProviderId: (userId: string, providerId: string) =>
        this._userService.attachProviderId(userId, providerId),
      attachAppleProviderId: (userId: string, appleProviderId: string) =>
        this._userService.attachAppleProviderId(userId, appleProviderId),
      activateUser: (id: string) => this._userService.activateUser(id),
    };
  }

  private async loginOrRegisterProvider(
    provider: Provider,
    body: CreateOrgUserDto,
    ip: string,
    userAgent: string,
  ) {
    const providerInstance = this._providerManager.getProvider(provider);
    const providerUser = await providerInstance.getUser(body.providerToken);

    if (!providerUser) {
      throw new Error('Invalid provider token');
    }

    const user = await findExistingOauthUser(
      provider,
      providerUser,
      this.oauthUserStore(),
    );
    if (user) {
      await this._userService.ensureIdentity(
        user.id,
        provider,
        providerUser.id,
      );
      return user;
    }

    if (!(await this.canRegister(provider))) {
      throw new Error('Registration is disabled');
    }

    const create = await this._organizationService.createOrgAndUser(
      {
        company: body.company,
        email: providerUser.email,
        password: '',
        provider,
        providerId: providerUser.id,
        datafast_visitor_id: body.datafast_visitor_id,
      },
      ip,
      userAgent,
    );

    this._track('register', providerUser.email, body.datafast_visitor_id).catch(
      (err) => {},
    );

    await NewsletterService.register(providerUser.email);

    try {
      if (providerInstance?.postRegistration) {
        await providerInstance.postRegistration(body.providerToken, create.id);
      }
    } catch (err) {
      // Don't fail registration if postRegistration fails
    }

    return create.users[0].user;
  }

  private async _track(
    name: string,
    email: string,
    datafast_visitor_id: string,
  ) {
    if (email && datafast_visitor_id && process.env.DATAFAST_API_KEY) {
      try {
        await fetch('https://datafa.st/api/v1/goals', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.DATAFAST_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            datafast_visitor_id: datafast_visitor_id,
            name: name,
            metadata: {
              email,
            },
          }),
        });
      } catch (err) {}
    }
  }

  async forgot(email: string) {
    const user = await this._userService.getUserByEmailWithPassword(email);
    if (!user) {
      return false;
    }

    const resetValues = AuthChecker.signJWT(
      {
        id: user.id,
        purpose: 'reset',
        expires: dayjs().add(20, 'minutes').format('YYYY-MM-DD HH:mm:ss'),
      },
      { expiresIn: RESET_LIFETIME },
    );

    await this._notificationService.sendEmail(
      user.email,
      'Reset your password',
      `You have requested to reset your passsord. <br />Click <a href="${process.env.FRONTEND_URL}/auth/forgot/${resetValues}">here</a> to reset your password<br />The link will expire in 20 minutes`,
    );
  }

  forgotReturn(body: ForgotReturnPasswordDto) {
    let user: { id?: string; expires?: string; purpose?: string };
    try {
      user = AuthChecker.verifyJWT(body.token) as typeof user;
    } catch {
      // Expired (reset links now carry `exp`) or not ours: the same answer as
      // a link past its 20 minutes, not a 500.
      return false;
    }

    // `expires` has to be *present*, not just in the future. `dayjs(undefined)`
    // is now, and `now.isBefore(now)` is false, so a token carrying no `expires`
    // at all sailed straight through the check below.
    //
    // That matters because every token this app signs uses the same key, a
    // session declares no purpose, and the session cookie is the whole User
    // row, which has an `id` and no `expires` and no expiry of its own. So any
    // place a session token leaked (a log line, a Referer header, the plaintext
    // `auth` response header under NOT_SECURED) it could be replayed here as a
    // password reset, forever. The token being signed is not the same as the
    // token being a reset token.
    if (!user?.id || !user.expires) {
      return false;
    }

    // A token minted for anything else is not a reset link. Links sent before
    // `purpose` existed have none, and are at most 20 minutes old.
    if (user.purpose && user.purpose !== 'reset') {
      return false;
    }

    if (dayjs(user.expires).isBefore(dayjs())) {
      return false;
    }

    // Also ends every session signed before now (users.repository).
    return this._userService.updatePassword(user.id, body.password);
  }

  async activate(code: string, tracking: string) {
    let token: {
      id?: string;
      email?: string;
      activated?: boolean;
      purpose?: string;
    };
    try {
      token = AuthChecker.verifyJWT(code) as typeof token;
    } catch {
      // Expired, or not a token of ours. The page handles `{ can: false }`;
      // a throw here was a 500.
      return false;
    }

    // `purpose: 'activate'` since activation links stopped being sessions.
    // Links sent before that are the session token of an account that was not
    // activated yet, so a token without a purpose is honoured only in that
    // shape.
    const isActivation =
      token?.purpose === 'activate' ||
      (!token?.purpose && token?.activated === false);
    if (!token?.id || !isActivation) {
      return false;
    }

    const user = await this._userService.getUserById(token.id);
    if (!user || user.activated) {
      return false;
    }

    await this._userService.activateUser(user.id);
    user.activated = true;
    this._track('register', user.email, tracking).catch((err) => {});
    await NewsletterService.register(user.email);
    // Signed from the row, not from the link, so none of the link's claims
    // end up in the session.
    return this.jwt(user);
  }

  async resendActivationEmail(email: string) {
    const user = await this._userService.getUserByEmail(email);

    if (!user) {
      throw new Error('User not found');
    }

    if (user.activated) {
      throw new Error('Account is already activated');
    }

    await this._emailService.sendEmail(
      user.email,
      'Activate your account',
      `Click <a href="${this.activationLink(
        user,
      )}">here</a> to activate your account`,
      'top',
    );

    return true;
  }

  oauthLink(provider: string, query?: any) {
    if (provider.toUpperCase() === 'WALLET' && !isWalletLoginEnabled()) {
      throw new Error('Wallet login is disabled');
    }
    const providerInstance = this._providerManager.getProvider(provider);
    return providerInstance.generateLink(query);
  }

  isLinkOauthState(state?: string) {
    return !!state && state.startsWith('link-');
  }

  /** Signed cookie: userId + nonce from `link-${nonce}`. Not a raw user id. */
  oauthLinkTicket(userId: string, nonce: string) {
    return AuthChecker.signJWT(
      {
        id: userId,
        nonce,
        purpose: 'oauth_link',
        expires: dayjs().add(10, 'minutes').format('YYYY-MM-DD HH:mm:ss'),
      },
      { expiresIn: '10m' },
    );
  }

  readOauthLinkUser(ticket: string | undefined, state?: string) {
    if (!ticket) {
      return undefined;
    }
    try {
      const payload = AuthChecker.verifyJWT(ticket) as {
        id?: string;
        nonce?: string;
        purpose?: string;
        expires?: string;
      };
      if (
        payload?.purpose !== 'oauth_link' ||
        !payload.id ||
        !payload.nonce ||
        !payload.expires ||
        dayjs(payload.expires).isBefore(dayjs()) ||
        !oauthLinkTicketMatchesState(payload.nonce, state)
      ) {
        return undefined;
      }
      return payload.id;
    } catch {
      return undefined;
    }
  }

  stepUpJwt(userId: string) {
    return AuthChecker.signJWT(
      {
        id: userId,
        purpose: 'stepup',
        expires: dayjs().add(20, 'minutes').format('YYYY-MM-DD HH:mm:ss'),
      },
      { expiresIn: '20m' },
    );
  }

  isFreshOauth(token: string | undefined, userId: string) {
    if (!token) {
      return false;
    }
    try {
      const payload = AuthChecker.verifyJWT(token) as {
        id?: string;
        purpose?: string;
        expires?: string;
      };
      if (
        payload?.purpose !== 'stepup' ||
        payload.id !== userId ||
        !payload.expires ||
        dayjs(payload.expires).isBefore(dayjs())
      ) {
        return false;
      }
      return true;
    } catch {
      return false;
    }
  }

  async checkExists(
    provider: string,
    code: string,
    redirectUri?: string,
    state?: string,
    stateCookie?: string,
    ip?: string,
    userAgent?: string,
    linkTicket?: string,
  ) {
    // the mobile app passes redirect_uri and keeps no cookies, the web flow
    // never passes it, so the state nonce is only enforced for the web flow
    if (
      !process.env.NOT_SECURED &&
      !redirectUri &&
      (!state || state !== stateCookie)
    ) {
      throw new Error('Invalid state');
    }

    if (provider.toUpperCase() === 'WALLET' && !isWalletLoginEnabled()) {
      throw new Error('Wallet login is disabled');
    }

    const providerInstance = this._providerManager.getProvider(provider);
    const token = await providerInstance.getToken(code, redirectUri);
    const identity = await providerInstance.getUser(token);
    if (!identity) {
      throw new Error('Invalid user');
    }

    if (this.isLinkOauthState(state)) {
      const linkUserId = this.readOauthLinkUser(linkTicket, state);
      if (!linkUserId) {
        throw new Error('Invalid link session');
      }
      await this._userService.linkIdentity(
        linkUserId,
        provider.toUpperCase(),
        identity.id,
      );
      const linkedUser = await this._userService.getUserById(linkUserId);
      if (!linkedUser) {
        throw new Error('Invalid user');
      }
      if (!linkedUser.activated) {
        await this._userService.activateUser(linkedUser.id);
        linkedUser.activated = true;
      }
      return {
        jwt: await this.jwt(linkedUser),
        isNew: false,
        linked: true,
        stepUp: this.stepUpJwt(linkedUser.id),
      };
    }

    const existing = await findExistingOauthUser(
      provider as Provider,
      identity,
      this.oauthUserStore(),
    );
    if (existing) {
      await this._userService.ensureIdentity(
        existing.id,
        provider.toUpperCase() as Provider,
        identity.id,
      );
      return {
        jwt: await this.jwt(existing),
        isNew: false,
        stepUp: this.stepUpJwt(existing.id),
      };
    }

    // Sign in and Create account both land here after Google (and Apple).
    // Existing inbox → already returned above (linked if it was email-only).
    // No account → open one with a workspace name from the email, no extra form.
    if (
      shouldCompleteOauthWithoutOrgForm(provider.toUpperCase()) &&
      identity.email
    ) {
      if (!(await this.canRegister(provider))) {
        throw new Error('Registration is disabled');
      }

      const create = await this._organizationService.createOrgAndUser(
        {
          company: oauthWorkspaceName(identity.email),
          email: identity.email,
          password: '',
          provider: provider.toUpperCase() as Provider,
          providerId: identity.id,
          datafast_visitor_id: '',
        },
        ip || '',
        userAgent || '',
      );

      this._track('register', identity.email, '').catch(() => {});
      await NewsletterService.register(identity.email);

      return {
        jwt: await this.jwt(create.users[0].user),
        isNew: true,
        stepUp: this.stepUpJwt(create.users[0].user.id),
      };
    }

    return { token };
  }

  // The link used to be the session token itself, so the email carried a
  // session. It holds only what `activate` needs, and a `purpose` the auth
  // middleware refuses.
  private activationLink(user: { id: string; email: string }) {
    const token = AuthChecker.signJWT(
      { id: user.id, email: user.email, purpose: 'activate' },
      { expiresIn: ACTIVATION_LIFETIME },
    );
    return `${process.env.FRONTEND_URL}/auth/activate/${token}`;
  }

  private async jwt(user: User) {
    // The row, never claims left over from a token it was read out of: `sign`
    // refuses a payload that already has `exp` when `expiresIn` is given, and
    // a `purpose` would make the middleware refuse the session issued here.
    const session: Record<string, unknown> = { ...user };
    for (const claim of ['password', 'iat', 'exp', 'purpose', 'expires']) {
      delete session[claim];
    }
    return AuthChecker.signJWT(session, { expiresIn: SESSION_LIFETIME });
  }
}
