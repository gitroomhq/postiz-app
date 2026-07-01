import {
  PrismaRepository,
  PrismaTransaction,
} from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { Provider } from '@prisma/client';
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

  // Swap the login credentials (email + password + OAuth identity) between two
  // existing users, keeping both user entities (ids, organizations,
  // subscriptions, channels, media) exactly where they are. Because
  // (email, providerName) is a unique index that Postgres checks per-statement,
  // we can't trade two emails directly, so we park the current user on a unique
  // throwaway email first, then fill each freed slot in order. The whole thing
  // runs in a single transaction: a mid-swap backend restart rolls back cleanly
  // and the throwaway email is overwritten before commit, so it never persists.
  switchUserCredentials(currentUserId: string, targetUserId: string) {
    return this._transaction.model.$transaction(async (tx) => {
      // Lock both rows in a deterministic order so two concurrent switches that
      // share a user serialize instead of deadlocking.
      await tx.$queryRaw`SELECT id FROM "User" WHERE id IN (${currentUserId}, ${targetUserId}) ORDER BY id FOR UPDATE`;

      const current = await tx.user.findUnique({
        where: { id: currentUserId },
      });
      const target = await tx.user.findUnique({ where: { id: targetUserId } });

      if (!current || !target) {
        throw new Error('User not found');
      }
      if (current.id === target.id) {
        throw new Error('Cannot switch a user with itself');
      }

      // `activated` is the email-verification state, so it belongs to the login
      // and travels with the rest of the credentials: an unverified email stays
      // unverified whichever account it now signs into, and an already-verified
      // email doesn't force re-activation.
      const currentCredentials = {
        email: current.email,
        password: current.password,
        providerName: current.providerName,
        providerId: current.providerId,
        account: current.account,
        connectedAccount: current.connectedAccount,
        activated: current.activated,
      };
      const targetCredentials = {
        email: target.email,
        password: target.password,
        providerName: target.providerName,
        providerId: target.providerId,
        account: target.account,
        connectedAccount: target.connectedAccount,
        activated: target.activated,
      };

      // 1. Park the current user on a unique throwaway email to free its email.
      await tx.user.update({
        where: { id: current.id },
        data: { email: `switch-${makeId(10)}-${current.email}` },
      });
      // 2. Move the current user's original credentials onto the target,
      //    which frees the target's email.
      await tx.user.update({
        where: { id: target.id },
        data: currentCredentials,
      });
      // 3. Move the target's credentials onto the current user.
      await tx.user.update({
        where: { id: current.id },
        data: targetCredentials,
      });

      // Post-swap login state of each account (the kept account keeps its id and
      // data but now signs in with the target's credentials, and vice versa).
      return {
        kept: {
          id: current.id,
          email: targetCredentials.email,
          activated: targetCredentials.activated,
        },
        switched: {
          id: target.id,
          email: currentCredentials.email,
          activated: currentCredentials.activated,
        },
      };
    });
  }

  getImpersonateUser(name: string) {
    return this._user.model.user.findMany({
      where: {
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
    return this._user.model.user.findFirst({
      where: {
        id,
      },
    });
  }

  getUserByEmail(email: string) {
    return this._user.model.user.findFirst({
      where: {
        email,
        providerName: Provider.LOCAL,
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

  getUserByProvider(providerId: string, provider: Provider) {
    return this._user.model.user.findFirst({
      where: {
        providerId,
        providerName: provider,
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
