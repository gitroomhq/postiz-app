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

@Injectable()
export class UsersRepository {
  constructor(
    private _user: PrismaRepository<'user'>,
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

  async getUserByProvider(providerId: string, provider: Provider) {
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

  attachProviderId(userId: string, providerId: string) {
    return this._user.model.user.updateMany({
      where: {
        id: userId,
        providerName: Provider.LOCAL,
        deletedAt: null,
      },
      data: {
        providerId,
      },
    });
  }

  attachAppleProviderId(userId: string, appleProviderId: string) {
    return this._user.model.user.updateMany({
      where: {
        id: userId,
        providerName: Provider.LOCAL,
        deletedAt: null,
      },
      data: {
        appleProviderId,
      },
    });
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
        providerName: Provider.LOCAL,
      },
      data: {
        password: AuthService.hashPassword(password),
        // Every session signed before this second stops working (see the auth
        // middleware), so a reset also locks out whoever else held one.
        // Rounded down because a token's `iat` has one-second resolution.
        sessionsNotBefore: new Date(Math.floor(Date.now() / 1000) * 1000),
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
        picture: body.picture
          ? {
              connect: {
                id: body.picture.id,
              },
            }
          : {
              disconnect: true,
            },
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
