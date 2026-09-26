import { createHash, randomBytes } from 'crypto';
import {
  AccessService,
  hashAccessToken,
  hashIp,
} from '@gitroom/nestjs-libraries/database/prisma/postmonster-access/access.service';

// In-memory stand-in for AccessRepository that enforces the same invite
// semantics as the SQL one (fresh, unrevoked, unused, email match)
class FakeAccessRepository {
  invites: any[] = [];
  requests: any[] = [];
  private seq = 0;

  async createRequest(data: any) {
    const row = {
      id: `req_${++this.seq}`,
      status: 'PENDING',
      createdAt: new Date(),
      reviewedAt: null,
      reviewedById: null,
      invites: [],
      role: null,
      networks: [],
      teamSize: null,
      useCase: null,
      ipHash: null,
      userAgent: null,
      ...data,
    };
    this.requests.push(row);
    return row;
  }

  async findPendingRequestByEmail(email: string) {
    return this.requests.find(
      (r) => r.email === email && r.status === 'PENDING'
    ) || null;
  }

  async getRequestById(id: string) {
    return this.requests.find((r) => r.id === id) || null;
  }

  async listRequests(params: any) {
    return { items: this.requests, total: this.requests.length, page: 0, limit: 20, hasMore: false };
  }

  async updateRequestStatus(id: string, status: string, reviewedById?: string) {
    const row = await this.getRequestById(id);
    Object.assign(row, { status, reviewedAt: new Date(), reviewedById });
    return row;
  }

  async createInvite(data: any) {
    const row = {
      id: `inv_${++this.seq}`,
      usedAt: null,
      revokedAt: null,
      createdAt: new Date(),
      accessRequestId: null,
      createdBy: null,
      ...data,
    };
    this.invites.push(row);
    return row;
  }

  async findInviteByTokenHash(tokenHash: string) {
    return this.invites.find((i) => i.tokenHash === tokenHash) || null;
  }

  async findInviteById(id: string) {
    return this.invites.find((i) => i.id === id) || null;
  }

  async listInvites() {
    return this.invites.map((i) => ({ ...i, accessRequest: null }));
  }

  async revokeInvite(id: string) {
    const row = await this.findInviteById(id);
    row.revokedAt = new Date();
    return row;
  }

  async consumeInvite(_tx: any, tokenHash: string, email: string) {
    const row = this.invites.find((i) => i.tokenHash === tokenHash);
    if (
      !row ||
      row.email !== email ||
      row.usedAt ||
      row.revokedAt ||
      new Date(row.expiresAt) <= new Date()
    ) {
      return false;
    }
    row.usedAt = new Date();
    return true;
  }

  async listUsers() {
    return { items: [], total: 0, page: 0, limit: 20, hasMore: false };
  }
}

const makeService = () => {
  const repository = new FakeAccessRepository();
  const organization = {
    createOrgAndUser: jest.fn(async (body: any) => ({
      id: 'org_1',
      users: [{ user: { id: 'user_1', email: body.email, password: 'hash' } }],
    })),
  };
  const email = { sendEmailSync: jest.fn(async (..._args: any[]) => undefined) as jest.Mock };
  const transaction = {
    model: {
      $transaction: jest.fn(async (fn: any) => fn({ tx: true })),
    },
  };
  const service = new AccessService(
    repository as any,
    organization as any,
    email as any,
    transaction as any
  );
  return { service, repository, organization, email, transaction };
};

describe('AccessService (postmonster closed access)', () => {
  const envBackup: Record<string, string | undefined> = {};
  beforeAll(() => {
    for (const key of ['FRONTEND_URL', 'OPERATOR_EMAIL']) {
      envBackup[key] = process.env[key];
    }
    process.env.FRONTEND_URL = 'https://app.postmonster.xyz';
    process.env.OPERATOR_EMAIL = 'operator@postmonster.xyz';
  });
  afterAll(() => {
    for (const [key, value] of Object.entries(envBackup)) {
      process.env[key] = value;
    }
  });

  describe('token hashing', () => {
    it('stores only a sha256 of the token', () => {
      const token = randomBytes(32).toString('base64url');
      expect(hashAccessToken(token)).toBe(
        createHash('sha256').update(token).digest('hex')
      );
    });

    it('hashes ips deterministically and not verbatim', () => {
      expect(hashIp('1.2.3.4')).toBe(hashIp('1.2.3.4'));
      expect(hashIp('1.2.3.4')).not.toContain('1.2.3.4');
    });
  });

  describe('submitRequest', () => {
    it('stores the request and mails the applicant and the operator', async () => {
      const { service, repository, email } = makeService();
      const result = await service.submitRequest(
        {
          name: '  Ada ',
          email: '  Ada@Example.COM ',
          role: 'Founder',
          networks: ['tiktok'],
          teamSize: '1-5',
          useCase: 'Scheduling TikToks',
          website: '',
        } as any,
        { ipHash: 'h', userAgent: 'ua' }
      );

      expect(result).toEqual({ ok: true });
      expect(repository.requests).toHaveLength(1);
      expect(repository.requests[0].email).toBe('ada@example.com');
      expect(repository.requests[0].name).toBe('Ada');
      expect(email.sendEmailSync).toHaveBeenCalledTimes(2);
      expect(email.sendEmailSync.mock.calls[0][0]).toBe('ada@example.com');
      expect(email.sendEmailSync.mock.calls[1][0]).toBe(
        'operator@postmonster.xyz'
      );
    });

    it('does not create a duplicate for a pending request but still succeeds', async () => {
      const { service, repository, email } = makeService();
      await service.submitRequest(
        { name: 'Ada', email: 'ada@example.com' } as any,
        {}
      );
      email.sendEmailSync.mockClear();

      const result = await service.submitRequest(
        { name: 'Ada again', email: 'ADA@example.com' } as any,
        {}
      );

      expect(result).toEqual({ ok: true });
      expect(repository.requests).toHaveLength(1);
      expect(email.sendEmailSync).not.toHaveBeenCalled();
    });
  });

  describe('getInviteByToken', () => {
    it('answers with the email of an active invite', async () => {
      const { service, repository } = makeService();
      const token = randomBytes(32).toString('base64url');
      await repository.createInvite({
        email: 'ada@example.com',
        tokenHash: hashAccessToken(token),
        expiresAt: new Date(Date.now() + 86400000),
      });

      await expect(service.getInviteByToken(token)).resolves.toEqual({
        email: 'ada@example.com',
      });
    });

    it.each([
      ['unknown', 'UNKNOWN'],
      ['expired', 'EXPIRED'],
      ['used', 'USED'],
      ['revoked', 'REVOKED'],
    ])('rejects a %s invite', async (_label: string, kind: string) => {
      const { service, repository } = makeService();
      const token = randomBytes(32).toString('base64url');
      const row = await repository.createInvite({
        email: 'ada@example.com',
        tokenHash: hashAccessToken(token),
        expiresAt: new Date(Date.now() + 86400000),
      });
      if (kind === 'EXPIRED') {
        row.expiresAt = new Date(Date.now() - 1000);
      } else if (kind === 'USED') {
        row.usedAt = new Date();
      } else if (kind === 'REVOKED') {
        row.revokedAt = new Date();
      }

      const lookup = kind === 'UNKNOWN' ? 'no-such-token' : token;
      await expect(service.getInviteByToken(lookup)).rejects.toThrow(
        'This invite link is invalid or has expired'
      );
    });
  });

  describe('approveRequest / rejectRequest', () => {
    it('approve creates a 7 day one-time invite, marks the request and mails the link', async () => {
      const { service, repository, email } = makeService();
      const request = await repository.createRequest({
        name: 'Ada',
        email: 'ada@example.com',
      });

      await service.approveRequest(request.id, 'admin_1');

      expect(repository.invites).toHaveLength(1);
      const invite = repository.invites[0];
      expect(invite.email).toBe('ada@example.com');
      expect(invite.accessRequestId).toBe(request.id);
      expect(invite.usedAt).toBeNull();
      const ttl = +new Date(invite.expiresAt) - Date.now();
      expect(ttl).toBeGreaterThan(6.9 * 86400000);
      expect(ttl).toBeLessThan(7.1 * 86400000);

      expect(repository.requests[0].status).toBe('APPROVED');
      expect(repository.requests[0].reviewedById).toBe('admin_1');

      const html = email.sendEmailSync.mock.calls[0][2] as string;
      expect(html).toContain('/auth/register?invite=');
      // the raw token goes into the mail body; only its hash is stored
      const mailedToken = html.match(/invite=([A-Za-z0-9_-]+)/)?.[1];
      expect(mailedToken).toBeTruthy();
      expect(hashAccessToken(mailedToken!)).toBe(invite.tokenHash);

      await expect(service.approveRequest(request.id)).rejects.toThrow(
        'Request is already reviewed'
      );
    });

    it('reject optionally mails the applicant', async () => {
      const { service, repository, email } = makeService();
      const request = await repository.createRequest({
        name: 'Ada',
        email: 'ada@example.com',
      });

      await service.rejectRequest(request.id, 'admin_1', true);
      expect(repository.requests[0].status).toBe('REJECTED');
      expect(email.sendEmailSync).toHaveBeenCalledTimes(1);

      const other = await repository.createRequest({
        name: 'Bob',
        email: 'bob@example.com',
      });
      email.sendEmailSync.mockClear();
      await service.rejectRequest(other.id, 'admin_1', false);
      expect(email.sendEmailSync).not.toHaveBeenCalled();
    });
  });

  describe('resend / revoke', () => {
    it('resend issues a new token and revokes the previous one', async () => {
      const { service, repository } = makeService();
      const token = randomBytes(32).toString('base64url');
      await repository.createInvite({
        email: 'ada@example.com',
        tokenHash: hashAccessToken(token),
        expiresAt: new Date(Date.now() + 86400000),
      });
      const original = repository.invites[0];

      await service.resendInvite(original.id);

      expect(original.revokedAt).not.toBeNull();
      expect(repository.invites).toHaveLength(2);
      const fresh = repository.invites[1];
      expect(fresh.tokenHash).not.toBe(original.tokenHash);
      expect(fresh.accessRequestId).toBe(original.accessRequestId);

      // the old token is dead, the new one works
      await expect(service.getInviteByToken(token)).rejects.toThrow(
        'This invite link is invalid or has expired'
      );
    });

    it('cannot resend or revoke a used invite', async () => {
      const { service, repository } = makeService();
      const invite = await repository.createInvite({
        email: 'ada@example.com',
        tokenHash: hashAccessToken('x'.repeat(43)),
        expiresAt: new Date(Date.now() + 86400000),
        usedAt: new Date(),
      });

      await expect(service.resendInvite(invite.id)).rejects.toThrow(
        'Invite is already used'
      );
      await expect(service.revokeInvite(invite.id)).rejects.toThrow(
        'Invite is already used'
      );
    });

    it('revoke kills the link', async () => {
      const { service, repository } = makeService();
      const token = randomBytes(32).toString('base64url');
      const invite = await repository.createInvite({
        email: 'ada@example.com',
        tokenHash: hashAccessToken(token),
        expiresAt: new Date(Date.now() + 86400000),
      });

      await service.revokeInvite(invite.id);
      await expect(service.getInviteByToken(token)).rejects.toThrow(
        'This invite link is invalid or has expired'
      );
    });
  });

  describe('registerWithInviteToken', () => {
    const body = {
      email: 'ada@example.com',
      password: 'supersecret',
      company: 'Ada Inc',
      provider: 'LOCAL' as any,
    };

    it('creates the user with its own workspace and burns the invite in one transaction', async () => {
      const { service, repository, organization, transaction } = makeService();
      const token = randomBytes(32).toString('base64url');
      const invite = await repository.createInvite({
        email: 'ada@example.com',
        tokenHash: hashAccessToken(token),
        expiresAt: new Date(Date.now() + 86400000),
      });

      const created = await service.registerWithInviteToken(
        body as any,
        token,
        '1.2.3.4',
        'ua'
      );

      expect(created.users[0].user.email).toBe('ada@example.com');
      expect(invite.usedAt).not.toBeNull();
      expect(transaction.model.$transaction).toHaveBeenCalledTimes(1);
      // user creation runs on the same transaction client as the consumption
      expect(organization.createOrgAndUser).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'ada@example.com' }),
        '1.2.3.4',
        'ua',
        expect.anything()
      );
    });

    it.each([
      ['a foreign email', 'charlie@example.com', 'invalid'],
      ['an already used invite', 'ada@example.com', 'used'],
      ['an expired invite', 'ada@example.com', 'expired'],
    ])(
      'rejects %s',
      async (_label: string, email: string, kind: string) => {
        const { service, repository, organization } = makeService();
        const token = randomBytes(32).toString('base64url');
        const invite = await repository.createInvite({
          email: 'ada@example.com',
          tokenHash: hashAccessToken(token),
          expiresAt: new Date(
            Date.now() + (kind === 'expired' ? -1000 : 86400000)
          ),
        });
        if (kind === 'used') {
          invite.usedAt = new Date();
        }

        await expect(
          service.registerWithInviteToken(
            { ...body, email } as any,
            token,
            '1.2.3.4',
            'ua'
          )
        ).rejects.toThrow('This invite link is invalid or has expired');
        expect(organization.createOrgAndUser).not.toHaveBeenCalled();
      }
    );
  });
});
