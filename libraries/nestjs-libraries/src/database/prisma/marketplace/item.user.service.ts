import { Injectable } from '@nestjs/common';
import { ItemUserRepository } from '@gitroom/nestjs-libraries/database/prisma/marketplace/item.user.repository';

@Injectable()
export class ItemUserService {
  constructor(private _itemUserRepository: ItemUserRepository) {}

  addOrRemoveItem(add: boolean, userId: string, item: string) {
    return this._itemUserRepository.addOrRemoveItem(add, userId, item);
  }

  getItems(userId: string) {
    return this._itemUserRepository.getItems(userId);
  }
}
