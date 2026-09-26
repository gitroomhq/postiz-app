import { Injectable } from '@nestjs/common';
import { AccessRequest, AccessRequestStatus, Prisma } from '@prisma/client';
import { PrismaRepository } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';

// postmonster: closed access storage (PRD 6) - AccessRequest / AccessInvite
export interface ListRequestsParams {
  page?: number;
  limit?: number;
  status?: AccessRequestStatus;
  email?: string;
}

@Injectable()
export class AccessRepository {
  constructor(
    private _access: PrismaRepository<'accessRequest' | 'accessInvite'>,
    private _users: PrismaRepository<'user' | 'integration'>
  ) {}

  createRequest(
    data: Prisma.AccessRequestUncheckedCreateInput
  ): Promise<AccessRequest> {
    return this._access.model.accessRequest.create({ data });
  }

  findPendingRequestByEmail(email: string) {
    return this._access.model.accessRequest.findFirst({
      where: { email, status: 'PENDING' },
    });
  }

  getRequestById(id: string) {
    return this._access.model.accessRequest.findUnique({ where: { id } });
  }

  async listRequests(params: ListRequestsParams) {
    const page = Math.max(0, params.page || 0);
    const limit = Math.min(Math.max(1, params.limit || 20), 100);
    const skip = page * limit;
    const where: Prisma.AccessRequestWhereInput = {
      ...(params.status ? { status: params.status } : {}),
      ...(params.email
        ? { email: { contains: params.email, mode: 'insensitive' } }
        : {}),
    };

    const [items, total] = await Promise.all([
      this._access.model.accessRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          invites: {
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
              email: true,
              expiresAt: true,
              usedAt: true,
              revokedAt: true,
              createdAt: true,
            },
          },
        },
      }),
      this._access.model.accessRequest.count({ where }),
    ]);

    return { items, total, page, limit, hasMore: skip + items.length < total };
  }

  updateRequestStatus(
    id: string,
    status: AccessRequestStatus,
    reviewedById?: string
  ) {
    return this._access.model.accessRequest.update({
      where: { id },
      data: {
        status,
        reviewedAt: new Date(),
        ...(reviewedById ? { reviewedById } : {}),
      },
    });
  }

  createInvite(data: Prisma.AccessInviteUncheckedCreateInput) {
    return this._access.model.accessInvite.create({
      data,
      select: {
        id: true,
        email: true,
        expiresAt: true,
        usedAt: true,
        revokedAt: true,
        createdAt: true,
        accessRequestId: true,
      },
    });
  }

  findInviteByTokenHash(tokenHash: string) {
    return this._access.model.accessInvite.findUnique({
      where: { tokenHash },
    });
  }

  findInviteById(id: string) {
    return this._access.model.accessInvite.findUnique({ where: { id } });
  }

  listInvites() {
    return this._access.model.accessInvite.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        accessRequest: {
          select: { id: true, name: true, role: true, status: true },
        },
      },
    });
  }

  revokeInvite(id: string) {
    return this._access.model.accessInvite.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
  }

  // Consumes a single-use invite: the update only matches while the token is
  // fresh, so two parallel registrations can never both win. Runs on the
  // caller's transaction client so user creation and consumption commit together
  async consumeInvite(
    client: Prisma.TransactionClient,
    tokenHash: string,
    email: string
  ) {
    const consumed = await client.accessInvite.updateMany({
      where: {
        tokenHash,
        email,
        usedAt: null,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      data: { usedAt: new Date() },
    });
    return consumed.count === 1;
  }

  async listUsers(page: number, limit: number) {
    const safePage = Math.max(0, page || 0);
    const safeLimit = Math.min(Math.max(1, limit || 20), 100);
    const skip = safePage * safeLimit;
    const where: Prisma.UserWhereInput = { deletedAt: null };

    const [items, total] = await Promise.all([
      this._users.model.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: safeLimit,
        select: {
          id: true,
          email: true,
          createdAt: true,
          lastOnline: true,
          isSuperAdmin: true,
          activated: true,
          organizations: {
            select: {
              role: true,
              organization: {
                select: { id: true, name: true, createdAt: true },
              },
            },
          },
        },
      }),
      this._users.model.user.count({ where }),
    ]);

    const orgIds = items.flatMap((u) =>
      u.organizations.map((o) => o.organization.id)
    );
    const channels = orgIds.length
      ? await this._users.model.integration.groupBy({
          by: ['organizationId'],
          where: { deletedAt: null, organizationId: { in: orgIds } },
          _count: { _all: true },
        })
      : [];
    const channelsByOrg = new Map(
      channels.map((c) => [c.organizationId, c._count._all])
    );

    return {
      items: items.map((u) => ({
        ...u,
        organizations: u.organizations.map((o) => ({
          ...o,
          channels: channelsByOrg.get(o.organization.id) || 0,
        })),
      })),
      total,
      page: safePage,
      limit: safeLimit,
      hasMore: skip + items.length < total,
    };
  }
}
