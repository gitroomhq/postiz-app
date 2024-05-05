import { Injectable } from '@nestjs/common';
import { UsersRepository } from '@gitroom/nestjs-libraries/database/prisma/users/users.repository';
import { Provider } from '@prisma/client';
import { ItemsDto } from '@gitroom/nestjs-libraries/dtos/marketplace/items.dto';

@Injectable()
export class UsersService {
  constructor(private _usersRepository: UsersRepository) {}

  getUserByEmail(email: string) {
    return this._usersRepository.getUserByEmail(email);
  }

  getUserByProvider(providerId: string, provider: Provider) {
    return this._usersRepository.getUserByProvider(providerId, provider);
  }

  updatePassword(id: string, password: string) {
    return this._usersRepository.updatePassword(id, password);
  }

  changeMarketplaceActive(userId: string, active: boolean) {
    return this._usersRepository.changeMarketplaceActive(userId, active);
  }

  getMarketplacePeople(orgId: string, userId: string, body: ItemsDto) {
    return this._usersRepository.getMarketplacePeople(orgId, userId, body);
  }

  getPersonal(userId: string) {
    return this._usersRepository.getPersonal(userId);
  }
}
