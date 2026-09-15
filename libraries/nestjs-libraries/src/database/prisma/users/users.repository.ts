import {
  PrismaRepository,
  PrismaTransaction,
} from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import { Provider, Role } from '@gitroom/nestjs-libraries/database/prisma/generated/client';
import { AuthService } from '@gitroom/helpers/auth/auth.service';
import { UserDetailDto } from '@gitroom/nestjs-libraries/dtos/users/user.details.dto';
import { EmailNotificationsDto } from '@gitroom/nestjs-libraries/dtos/users/email-notifications.dto';
import { makeId } from '@gitroom/nestjs-libraries/services/make.is';
import {
  pickUserWithPassword,
  sessionsNotBeforeFrom,
} from '@gitroom/helpers/auth/account-security';

@Injectable()
export class UsersRepository {
  constructor(
    private _user: PrismaRepository<'user'>,
    private _userIdentity: PrismaRepository<'userIdentity'>,
    private _transaction: PrismaTransaction
  ) {}

  async switchUserCredentials(currentUserId: string, targetUserId: string) {
    const current = await this._user.model.user.findUnique({
      where: { id: currentUserId },
    });
    const target = await this._user.model.user.findUnique({
      where: { id: targetUserId },
    });

    if (!current || !target) {
      throw new Error('User not found');
    }

    const currentCredentials = {
      email: current.email,
      password: current.password,
      providerName: current.providerName,
      providerId: current.providerId,
      appleProviderId: current.appleProviderId,
      account: current.account,
      connectedAccount: current.connectedAccount,
      activated: current.activated,
    };
    const targetCredentials = {
      email: target.email,
      password: target.password,
      providerName: target.providerName,
      providerId: target.providerId,
      appleProviderId: target.appleProviderId,
      account: target.account,
      connectedAccount: target.connectedAccount,
      activated: target.activated,
    };

    // (email, providerName) is unique and checked per-statement, so park the
    // current user on a throwaway email first, then fill each freed slot
    await this._transaction.model.$transaction([
      this._user.model.user.update({
        where: { id: current.id },
        data: {
          email: `switch-${makeId(10)}-${current.email}`,
          appleProviderId: null,
        },
      }),
      this._user.model.user.update({
        where: { id: target.id },
        data: currentCredentials,
      }),
      this._user.model.user.update({
        where: { id: current.id },
        data: targetCredentials,
      }),
    ]);

    return {
      kept: { id: current.id, email: targetCredentials.email },
      switched: { id: target.id, email: currentCredentials.email },
    };
  }

  getImpersonateUser(name: string) {
    return this._user.model.user.findMany({
      where: {
        deletedAt: null,
        OR: [
          {
            name: {
              contains: name,
            },
          },
          {
            email: {
              contains: name,
            },
          },
          {
            id: {
              contains: name,
            },
          },
        ],
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
      take: 10,
    });
  }

  getUserById(id: string) {
    // Prisma drops an `undefined` filter rather than matching nothing, so
    // `where: { id: undefined }` is an unfiltered query that returns whichever
    // user happens to be first. Callers reach this with metadata read straight
    // off a Stripe event (`stripe.service.ts:661`, `:1197`), and invoice events
    // are deliberately exempt from the service-tag filter — so an invoice from
    // any other integration sharing the Stripe account could attribute a
    // purchase to a stranger. Harmless at one user; not a property to keep.
    if (!id) {
      return null;
    }
    return this._user.model.user.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: {
        // Surfaces the uploaded avatar on /user/self so the top-bar UserMenu
        // can render it instead of the initial fallback.
        picture: {
          select: {
            id: true,
            path: true,
          },
        },
      },
    });
  }

  getUserByEmail(email: string) {
    return this._user.model.user.findFirst({
      where: {
        email: {
          equals: email,
          mode: 'insensitive',
        },
        providerName: Provider.LOCAL,
        deletedAt: null,
      },
      include: {
        picture: {
          select: {
            id: true,
            path: true,
          },
        },
      },
    });
  }

  // Any sign-in method that has proved this inbox. LOCAL wins if both exist
  // so Google-then-email does not create a second password user.
  async getUserByEmailAnyProvider(email: string) {
    const rows = await this._user.model.user.findMany({
      where: {
        email: {
          equals: email,
          mode: 'insensitive',
        },
        deletedAt: null,
      },
      include: {
        picture: {
          select: {
            id: true,
            path: true,
          },
        },
      },
    });
    return (
      rows.find((row) => row.providerName === Provider.LOCAL) || rows[0] || null
    );
  }

  async getUserByEmailWithPassword(email: string) {
    const rows = await this._user.model.user.findMany({
      where: {
        email: {
          equals: email,
          mode: 'insensitive',
        },
        deletedAt: null,
      },
      include: {
        picture: {
          select: {
            id: true,
            path: true,
          },
        },
      },
    });
    return pickUserWithPassword(rows);
  }

  getUserWithActiveSubscriptionByEmail(email: string, excludeUserId: string) {
    return this._user.model.user.findFirst({
      where: {
        email,
        id: { not: excludeUserId },
        deletedAt: null,
        organizations: {
          some: {
            role: Role.SUPERADMIN,
            organization: {
              subscription: { is: { deletedAt: null } },
            },
          },
        },
      },
      select: { id: true, email: true, providerName: true },
    });
  }

  activateUser(id: string) {
    return this._user.model.user.update({
      where: {
        id,
      },
      data: {
        activated: true,
      },
    });
  }

  getIdentities(userId: string) {
    return this._userIdentity.model.userIdentity.findMany({
      where: { userId },
      select: {
        provider: true,
        providerAccountId: true,
        createdAt: true,
      },
    });
  }

  findIdentity(provider: Provider, providerAccountId: string) {
    return this._userIdentity.model.userIdentity.findUnique({
      where: {
        provider_providerAccountId: {
          provider,
          providerAccountId,
        },
      },
    });
  }

  findUserIdentity(userId: string, provider: Provider) {
    return this._userIdentity.model.userIdentity.findUnique({
      where: {
        userId_provider: {
          userId,
          provider,
        },
      },
    });
  }

  createIdentity(
    userId: string,
    provider: Provider,
    providerAccountId: string
  ) {
    return this._userIdentity.model.userIdentity.create({
      data: {
        userId,
        provider,
        providerAccountId,
      },
    });
  }

  deleteIdentity(userId: string, provider: Provider) {
    return this._userIdentity.model.userIdentity.deleteMany({
      where: {
        userId,
        provider,
      },
    });
  }

  deleteIdentitiesForUser(userId: string) {
    return this._userIdentity.model.userIdentity.deleteMany({
      where: { userId },
    });
  }

  findEmailConflict(email: string, excludeUserId: string) {
    return this._user.model.user.findFirst({
      where: {
        email: {
          equals: email,
          mode: 'insensitive',
        },
        id: { not: excludeUserId },
        deletedAt: null,
      },
      select: { id: true, email: true },
    });
  }

  updateEmail(id: string, email: string) {
    return this._user.model.user.update({
      where: { id },
      data: { email },
    });
  }

  async getUserByProvider(providerId: string, provider: Provider) {
    const identity = await this._userIdentity.model.userIdentity.findUnique({
      where: {
        provider_providerAccountId: {
          provider,
          providerAccountId: providerId,
        },
      },
      include: {
        user: true,
      },
    });
    if (identity?.user && !identity.user.deletedAt) {
      return identity.user;
    }

    // Google ids can live on a LOCAL row after we attach them so password
    // login keeps working. Prefer that row over a leftover GOOGLE duplicate.
    if (provider === Provider.GOOGLE) {
      const linkedLocal = await this._user.model.user.findFirst({
        where: {
          providerId,
          providerName: Provider.LOCAL,
          deletedAt: null,
        },
      });
      if (linkedLocal) {
        return linkedLocal;
      }
    }

    if (provider === Provider.APPLE) {
      const linkedLocal = await this._user.model.user.findFirst({
        where: {
          appleProviderId: providerId,
          providerName: Provider.LOCAL,
          deletedAt: null,
        },
      });
      if (linkedLocal) {
        return linkedLocal;
      }
    }

    return this._user.model.user.findFirst({
      where: {
        providerId,
        providerName: provider,
        deletedAt: null,
      },
    });
  }

  async attachProviderId(userId: string, providerId: string) {
    await this._user.model.user.updateMany({
      where: {
        id: userId,
        providerName: Provider.LOCAL,
        deletedAt: null,
      },
      data: {
        providerId,
      },
    });
    await this.ensureIdentity(userId, Provider.GOOGLE, providerId);
  }

  async attachAppleProviderId(userId: string, appleProviderId: string) {
    await this._user.model.user.updateMany({
      where: {
        id: userId,
        providerName: Provider.LOCAL,
        deletedAt: null,
      },
      data: {
        appleProviderId,
      },
    });
    await this.ensureIdentity(userId, Provider.APPLE, appleProviderId);
  }

  async clearLinkedProvider(userId: string, provider: Provider) {
    if (provider === Provider.GOOGLE) {
      await this._user.model.user.updateMany({
        where: { id: userId, deletedAt: null },
        data: { providerId: null },
      });
    }
    if (provider === Provider.APPLE) {
      await this._user.model.user.updateMany({
        where: { id: userId, deletedAt: null },
        data: { appleProviderId: null },
      });
    }
  }

  updateProviderName(userId: string, providerName: Provider) {
    return this._user.model.user.update({
      where: { id: userId },
      data: { providerName },
    });
  }

  async ensureIdentity(
    userId: string,
    provider: Provider,
    providerAccountId: string
  ) {
    if (provider === Provider.LOCAL || !providerAccountId) {
      return;
    }

    const existing = await this.findIdentity(provider, providerAccountId);
    if (existing) {
      return existing.userId === userId ? existing : null;
    }

    const sameProvider = await this.findUserIdentity(userId, provider);
    if (sameProvider) {
      return sameProvider;
    }

    try {
      return await this.createIdentity(userId, provider, providerAccountId);
    } catch {
      return this.findIdentity(provider, providerAccountId);
    }
  }

  async deleteAccount(userId: string) {
    const user = await this._user.model.user.findUnique({
      where: {
        id: userId,
      },
    });

    if (!user || user.deletedAt) {
      return;
    }

    const hash = (value: string) =>
      createHash('md5').update(value).digest('hex');

    await this.deleteIdentitiesForUser(userId);

    // Hash the identifying fields instead of removing the row, the random
    // suffix keeps [email, providerName] unique if the same email is deleted
    // more than once
    return this._user.model.user.update({
      where: {
        id: userId,
      },
      data: {
        email: `deleted_${hash(user.email.toLowerCase())}_${makeId(5)}`,
        password: null,
        name: user.name ? hash(user.name) : null,
        lastName: user.lastName ? hash(user.lastName) : null,
        providerId: user.providerId ? hash(user.providerId) : null,
        appleProviderId: user.appleProviderId
          ? hash(user.appleProviderId)
          : null,
        bio: null,
        ip: null,
        agent: null,
        account: null,
        pictureId: null,
        deletedAt: new Date(),
      },
    });
  }

  updatePassword(id: string, password: string) {
    return this._user.model.user.update({
      where: {
        id,
      },
      data: {
        password: AuthService.hashPassword(password),
        // Every session signed before this second stops working (see the auth
        // middleware), so a reset also locks out whoever else held one.
        // Rounded down because a token's `iat` has one-second resolution.
        sessionsNotBefore: sessionsNotBeforeFrom(),
      },
    });
  }

  changeAudienceSize(userId: string, audience: number) {
    return this._user.model.user.update({
      where: {
        id: userId,
      },
      data: {
        audience,
      },
    });
  }

  async getPersonal(userId: string) {
    const user = await this._user.model.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        name: true,
        bio: true,
        picture: {
          select: {
            id: true,
            path: true,
          },
        },
      },
    });

    return user;
  }

  async changePersonal(userId: string, body: UserDetailDto) {
    await this._user.model.user.update({
      where: {
        id: userId,
      },
      data: {
        name: body.fullname,
        bio: body.bio,
        ...(body.picture
          ? {
              picture: {
                connect: {
                  id: body.picture.id,
                },
              },
            }
          : {}),
      },
    });
  }

  async getEmailNotifications(userId: string) {
    return this._user.model.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        sendSuccessEmails: true,
        sendFailureEmails: true,
        sendStreakEmails: true,
      },
    });
  }

  async updateEmailNotifications(userId: string, body: EmailNotificationsDto) {
    await this._user.model.user.update({
      where: {
        id: userId,
      },
      data: {
        sendSuccessEmails: body.sendSuccessEmails,
        sendFailureEmails: body.sendFailureEmails,
        sendStreakEmails: body.sendStreakEmails,
      },
    });
  }
}
