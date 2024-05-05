import { PrismaRepository } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { Provider } from '@prisma/client';
import { AuthService } from '@gitroom/helpers/auth/auth.service';
import { ItemsDto } from '@gitroom/nestjs-libraries/dtos/marketplace/items.dto';
import { allTagsOptions } from '@gitroom/nestjs-libraries/database/prisma/marketplace/tags.list';

@Injectable()
export class UsersRepository {
  constructor(private _user: PrismaRepository<'user'>) {}

  getUserByEmail(email: string) {
    return this._user.model.user.findFirst({
      where: {
        email,
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

  changeMarketplaceActive(userId: string, active: boolean) {
    return this._user.model.user.update({
      where: {
        id: userId,
      },
      data: {
        marketplace: active,
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

  async getMarketplacePeople(orgId: string, userId: string, items: ItemsDto) {
    const info = {
      id: {
        not: userId,
      },
      account: {
        not: null,
      },
      connectedAccount: true,
      marketplace: true,
      items: {
        ...(items.items.length
          ? {
              some: {
                OR: items.items.map((key) => ({ key })),
              },
            }
          : {
              some: {
                OR: allTagsOptions.map((p) => ({ key: p.key })),
              },
            }),
      },
    };

    const list = await this._user.model.user.findMany({
      where: {
        ...info,
      },
      select: {
        name: true,
        organizations: {
          select: {
            organization: {
              select: {
                Integration: {
                  where: {
                    disabled: false,
                    deletedAt: null,
                  },
                  select: {
                    providerIdentifier: true,
                  },
                },
              },
            },
          },
        },
        items: {
          select: {
            key: true,
          },
        },
      },
      skip: (items.page - 1) * 10,
      take: 10,
    });

    const count = await this._user.model.user.count({
      where: {
        ...info,
      },
    });

    return {
      list,
      count,
    };
  }
}
