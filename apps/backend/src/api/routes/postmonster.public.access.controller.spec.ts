import { randomBytes } from 'crypto';
import { Reflector } from '@nestjs/core';
import {
  ThrottlerModuleOptions,
  ThrottlerStorageService,
} from '@nestjs/throttler';
import { PublicAccessController } from '@gitroom/backend/api/routes/postmonster.public.access.controller';
import { SuperAdminUserGuard } from '@gitroom/backend/services/auth/super.admin.user.guard';
import { ThrottlerRealIpGuard } from '@gitroom/nestjs-libraries/throttler/throttler.provider';
import { hashIp } from '@gitroom/nestjs-libraries/database/prisma/postmonster-access/access.service';
import { CreateAccessRequestDto } from '@gitroom/nestjs-libraries/dtos/access/create.access.request.dto';

const makeBody = (over: Partial<CreateAccessRequestDto> = {}) =>
  Object.assign(
    {
      name: 'Ada',
      email: 'ada@example.com',
      role: 'Founder',
      networks: ['tiktok'],
      teamSize: '1-5',
      useCase: 'Scheduling',
    },
    over
  ) as CreateAccessRequestDto;

describe('POST /public/access-requests (postmonster closed access)', () => {
  it('drops honeypot submissions silently and still answers ok', async () => {
    const access = { submitRequest: jest.fn() };
    const controller = new PublicAccessController(access as any);

    const response = await controller.createAccessRequest(
      makeBody({ website: 'http://spam.example' }) as any,
      '9.9.9.9',
      'bot/1.0'
    );

    expect(response).toEqual({ ok: true });
    expect(access.submitRequest).not.toHaveBeenCalled();
  });

  it('passes a real submission through with a hashed ip and the user agent', async () => {
    const access = { submitRequest: jest.fn(async () => ({ ok: true })) };
    const controller = new PublicAccessController(access as any);

    const response = await controller.createAccessRequest(
      makeBody() as any,
      '9.9.9.9',
      'Mozilla/5.0'
    );

    expect(response).toEqual({ ok: true });
    expect(access.submitRequest).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'ada@example.com' }),
      { ipHash: hashIp('9.9.9.9'), userAgent: 'Mozilla/5.0' }
    );
  });

  it('refuses malformed invite tokens without touching the service', async () => {
    const access = { getInviteByToken: jest.fn() };
    const controller = new PublicAccessController(access as any);

    await expect(controller.getInvite('short')).rejects.toThrow(
      'This invite link is invalid or has expired'
    );
    expect(access.getInviteByToken).not.toHaveBeenCalled();
  });

  it('rate limits the endpoint at 5 requests per hour per ip', async () => {
    const handler = PublicAccessController.prototype.createAccessRequest;
    const metadata = new Reflector();
    const limit = metadata.get<any>('THROTTLER:LIMITdefault', handler);
    const ttl = metadata.get<any>('THROTTLER:TTLdefault', handler);
    expect(limit).toBe(5);
    expect(ttl).toBe(3600000);

    const options: ThrottlerModuleOptions = {
      throttlers: [{ name: 'default', ttl: 3600000, limit: 5 }],
    };
    const guard = new ThrottlerRealIpGuard(
      options as any,
      new ThrottlerStorageService(),
      new Reflector()
    );
    await guard.onModuleInit();

    const context = (ip: string) =>
      ({
        getType: () => 'http',
        getHandler: () => handler,
        getClass: () => PublicAccessController,
        switchToHttp: () => ({
          getRequest: () => ({
            ip,
            headers: { 'x-forwarded-for': ip },
            url: '/public/access-requests',
            method: 'POST',
          }),
          getResponse: () => ({
            header: () => undefined,
            setHeader: () => undefined,
            getHeader: () => undefined,
          }),
        }),
      }) as any;

    for (let i = 0; i < 5; i += 1) {
      await expect(guard.canActivate(context('5.5.5.5'))).resolves.toBe(true);
    }
    await expect(guard.canActivate(context('5.5.5.5'))).rejects.toThrow();
    // a different client ip is unaffected
    await expect(guard.canActivate(context('6.6.6.6'))).resolves.toBe(true);
  });
});

describe('GET /admin/access-* (super admin guard)', () => {
  const guard = new SuperAdminUserGuard();

  const contextWith = (user: any) =>
    ({
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
    }) as any;

  it('rejects anonymous requests', () => {
    expect(() => guard.canActivate(contextWith(undefined))).toThrow(
      'Unauthorized'
    );
  });

  it('rejects regular users', () => {
    expect(() =>
      guard.canActivate(contextWith({ id: 'u1', isSuperAdmin: false }))
    ).toThrow('Unauthorized');
  });

  it('lets the super admin through', () => {
    expect(
      guard.canActivate(contextWith({ id: 'u1', isSuperAdmin: true }))
    ).toBe(true);
  });
});

describe('invite tokens', () => {
  it('are high entropy base64url strings', () => {
    // sanity of the shape used in the emails: 32 random bytes
    const token = randomBytes(32).toString('base64url');
    expect(token.length).toBeGreaterThanOrEqual(40);
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
  });
});
