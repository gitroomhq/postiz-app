import { PrismaRepository } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { Provider } from '@prisma/client';
import { AuthService } from '@gitroom/helpers/auth/auth.service';
import { ItemsDto } from '@gitroom/nestjs-libraries/dtos/marketplace/items.dto';
import { allTagsOptions } from '@gitroom/nestjs-libraries/database/prisma/marketplace/tags.list';
import { UserDetailDto } from '@gitroom/nestjs-libraries/dtos/users/user.details.dto';

@Injectable()
export class UsersRepository {
  constructor(private _user: PrismaRepository<'user'>) {}

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
        id: true,
        name: true,
        bio: true,
        audience: true,
        picture: {
          select: {
            id: true,
            path: true,
          },
        },
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
      skip: (items.page - 1) * 8,
      take: 8,
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
