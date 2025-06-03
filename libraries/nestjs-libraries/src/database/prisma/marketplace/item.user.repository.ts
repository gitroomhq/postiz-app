import { PrismaRepository } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ItemUserRepository {
  constructor(private _itemUser: PrismaRepository<'itemUser'>) {}

  addOrRemoveItem(add: boolean, userId: string, item: string) {
    if (!add) {
      return this._itemUser.model.itemUser.deleteMany({
        where: {
          user: {
            id: userId,
          },
          key: item,
        },
      });
    }

    return this._itemUser.model.itemUser.create({
      data: {
        key: item,
        user: {
          connect: {
            id: userId,
          },
        },
      },
    });
  }

  getItems(userId: string) {
    return this._itemUser.model.itemUser.findMany({
      where: {
        user: {
          id: userId,
        },
      },
    });
  }
}
