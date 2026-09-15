import { Injectable, Logger } from '@nestjs/common';
import { createHash, randomUUID } from 'crypto';
import { ioRedis } from '@gitroom/nestjs-libraries/redis/redis.service';

export type GuardAction =
  | 'otp_request'
  | 'otp_verify'
  | 'login'
  | 'register'
  | 'forgot'
  | 'password_change'
  | 'email_change'
  | 'identity_link';

export interface GuardChallengeInput {
  action: GuardAction;
  ip?: string;
  email?: string;
  captchaToken?: string;
}

export interface GuardDecision {
  allow: boolean;
  reason?: 'rate_limited' | 'captcha_required' | 'captcha_failed';
}

interface ActionLimit {
  email: number;
  ip: number;
}

const SITEVERIFY = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

function int(name: string, def: number): number {
  const raw = process.env[name];
  const n = raw ? parseInt(raw, 10) : NaN;
  return Number.isFinite(n) ? n : def;
}

function actionList(name: string, def: GuardAction[]): GuardAction[] {
  const raw = process.env[name];
  if (!raw) return def;
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean) as GuardAction[];
}

/**
 * Rate limiting and captcha verification for unauthenticated auth endpoints.
 *
 * Rate limiting is on by default: it needs no configuration and no secret, and
 * without it the OTP endpoints can be brute-forced by anyone. Set a limit to 0
 * to disable that dimension.
 *
 * Captcha verification only engages when TURNSTILE_SECRET is set. Note that
 * TURNSTILE_SITE_KEY alone renders a widget; without the secret there is
 * nothing to check the answer against, so the widget is decorative.
 */
@Injectable()
export class AbuseGuardService {
  private readonly _logger = new Logger(AbuseGuardService.name);

  // MockRedis (used when REDIS_URL is unset) implements only get/set/del, so
  // the sorted-set calls below would throw. Fall back to per-process counters
  // in that case, which is correct for a single-node or development install.
  private readonly _useRedis = !!process.env.REDIS_URL;
  private readonly _memory = new Map<string, number[]>();
  private _announced = false;

  private get windowMs() {
    return int('GUARD_WINDOW_MS', 15 * 60 * 1000);
  }

  private get limits(): Record<GuardAction, ActionLimit> {
    return {
      otp_request: {
        email: int('GUARD_OTP_REQUEST_EMAIL', 5),
        ip: int('GUARD_OTP_REQUEST_IP', 30),
      },
      otp_verify: {
        email: int('GUARD_OTP_VERIFY_EMAIL', 10),
        ip: int('GUARD_OTP_VERIFY_IP', 60),
      },
      // Deliberately loose: these guard against credential stuffing and mail
      // bombing, not against a person mistyping their password. A shared office
      // NAT should never hit the IP ceiling in normal use.
      login: {
        email: int('GUARD_LOGIN_EMAIL', 20),
        ip: int('GUARD_LOGIN_IP', 60),
      },
      register: {
        email: int('GUARD_REGISTER_EMAIL', 5),
        ip: int('GUARD_REGISTER_IP', 20),
      },
      forgot: {
        email: int('GUARD_FORGOT_EMAIL', 5),
        ip: int('GUARD_FORGOT_IP', 20),
      },
      password_change: {
        email: int('GUARD_PASSWORD_CHANGE_EMAIL', 5),
        ip: int('GUARD_PASSWORD_CHANGE_IP', 20),
      },
      email_change: {
        email: int('GUARD_EMAIL_CHANGE_EMAIL', 5),
        ip: int('GUARD_EMAIL_CHANGE_IP', 20),
      },
      identity_link: {
        email: int('GUARD_IDENTITY_LINK_EMAIL', 5),
        ip: int('GUARD_IDENTITY_LINK_IP', 20),
      },
    };
  }

  private get captchaActions(): GuardAction[] {
    return actionList('GUARD_CAPTCHA_ACTIONS', ['otp_request']);
  }

  private announceOnce() {
    if (this._announced) {
      return;
    }
    this._announced = true;
    this._logger.log(
      this._useRedis
        ? 'Abuse guard using Redis counters (shared across instances)'
        : 'Abuse guard using in-process counters — set REDIS_URL so limits are shared when running more than one backend instance'
    );
  }

  /**
   * Record a hit and report whether it is still within `limit` over the
   * trailing window. Over-limit hits are still recorded, so a flood keeps its
   * own window saturated instead of recovering a slot on every call.
   */
  private async hitAndCheck(
    key: string,
    limit: number,
    now: number
  ): Promise<boolean> {
    const windowMs = this.windowMs;
    const cutoff = now - windowMs;

    if (!this._useRedis) {
      const recent = (this._memory.get(key) ?? []).filter((t) => t > cutoff);
      recent.push(now);
      this._memory.set(key, recent);
      return recent.length <= limit;
    }

    try {
      const redisKey = `abuse-guard:${key}`;
      const result = await ioRedis
        .multi()
        .zremrangebyscore(redisKey, 0, cutoff)
        .zadd(redisKey, now, `${now}-${randomUUID()}`)
        .zcard(redisKey)
        .pexpire(redisKey, windowMs)
        .exec();

      const count = Number(result?.[2]?.[1] ?? 0);
      return count <= limit;
    } catch (err) {
      // Availability beats strict limiting here: a Redis outage must not lock
      // every user out of signing in.
      this._logger.warn(
        `Abuse guard could not reach Redis, allowing request: ${
          (err as Error)?.message
        }`
      );
      return true;
    }
  }

  /** Emails are identifying, so logs carry a stable digest instead. */
  private digest(value: string) {
    return createHash('sha256').update(value).digest('hex').slice(0, 8);
  }

  private async verifyTurnstile(
    secret: string,
    token: string,
    ip?: string
  ): Promise<boolean> {
    try {
      const body = new URLSearchParams();
      body.set('secret', secret);
      body.set('response', token);
      if (ip) {
        body.set('remoteip', ip);
      }

      const res = await fetch(SITEVERIFY, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      });

      if (!res.ok) {
        return false;
      }

      const data = (await res.json()) as { success?: boolean };
      return data.success === true;
    } catch {
      // Any failure (network, non-2xx, malformed token) counts as unverified.
      return false;
    }
  }

  async challenge(input: GuardChallengeInput): Promise<GuardDecision> {
    this.announceOnce();

    const now = Date.now();
    const limit = this.limits[input.action];

    if (limit) {
      if (input.email && limit.email > 0) {
        const key = `${input.action}:email:${input.email.toLowerCase()}`;
        if (!(await this.hitAndCheck(key, limit.email, now))) {
          this._logger.warn(
            `Rate limited ${input.action} by email ${this.digest(input.email)}`
          );
          return { allow: false, reason: 'rate_limited' };
        }
      }

      if (input.ip && limit.ip > 0) {
        const key = `${input.action}:ip:${input.ip}`;
        if (!(await this.hitAndCheck(key, limit.ip, now))) {
          this._logger.warn(`Rate limited ${input.action} by ip ${input.ip}`);
          return { allow: false, reason: 'rate_limited' };
        }
      }
    }

    const turnstileSecret = process.env.TURNSTILE_SECRET;
    if (turnstileSecret && this.captchaActions.includes(input.action)) {
      if (!input.captchaToken) {
        return { allow: false, reason: 'captcha_required' };
      }

      const valid = await this.verifyTurnstile(
        turnstileSecret,
        input.captchaToken,
        input.ip
      );

      if (!valid) {
        return { allow: false, reason: 'captcha_failed' };
      }
    }

    return { allow: true };
  }
}
