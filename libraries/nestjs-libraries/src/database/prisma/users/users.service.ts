import { Injectable } from '@nestjs/common';
import { UsersRepository } from '@gitroom/nestjs-libraries/database/prisma/users/users.repository';
import { Provider } from '@prisma/client';
import { ItemsDto } from '@gitroom/nestjs-libraries/dtos/marketplace/items.dto';
import { UserDetailDto } from '@gitroom/nestjs-libraries/dtos/users/user.details.dto';
import { OrganizationRepository } from '@gitroom/nestjs-libraries/database/prisma/organizations/organization.repository';
import { ItemUserRepository } from '../marketplace/item.user.repository';
import { AgenciesRepository } from '../agencies/agencies.repository';
import { PostsRepository } from '../posts/posts.repository';
import { MessagesRepository } from '../marketplace/messages.repository';

@Injectable()
export class UsersService {
  constructor(
    private _usersRepository: UsersRepository,
    private _organizationRepository: OrganizationRepository,
    private _itemUserRepository: ItemUserRepository,
    private _agenciesRepository: AgenciesRepository,
    private _postsRepository: PostsRepository,
    private _messagesRepository: MessagesRepository
  ) {}

  getUserByEmail(email: string) {
    return this._usersRepository.getUserByEmail(email);
  }

  getUserById(id: string) {
    return this._usersRepository.getUserById(id);
  }

  getImpersonateUser(name: string) {
    return this._organizationRepository.getImpersonateUser(name);
  }

  getUserByProvider(providerId: string, provider: Provider) {
    return this._usersRepository.getUserByProvider(providerId, provider);
  }

  activateUser(id: string) {
    return this._usersRepository.activateUser(id);
  }

  updatePassword(id: string, password: string) {
    return this._usersRepository.updatePassword(id, password);
  }

  changeAudienceSize(userId: string, audience: number) {
    return this._usersRepository.changeAudienceSize(userId, audience);
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

  changePersonal(userId: string, body: UserDetailDto) {
    return this._usersRepository.changePersonal(userId, body);
  }

    async deleteUser(userId: string){
    //Deleting all models the user has first
    await this._organizationRepository.deleteUserOrganizations(userId);
    await this._itemUserRepository.deleteAllItemsByUser(userId)
    await this._agenciesRepository.deleteByUserId(userId)
    await this._postsRepository.deleteCommentsByUser(userId)
    await this._messagesRepository.deletePayoutProblemsByUser(userId)
    return this._usersRepository.deleteUser(userId)
  }
}
