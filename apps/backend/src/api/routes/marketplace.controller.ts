import { Body, Controller, Get, Post } from '@nestjs/common';
import { Organization, User } from '@prisma/client';
import { ApiTags } from '@nestjs/swagger';
import { GetUserFromRequest } from '@gitroom/nestjs-libraries/user/user.from.request';
import { ItemUserService } from '@gitroom/nestjs-libraries/database/prisma/marketplace/item.user.service';
import { AddRemoveItemDto } from '@gitroom/nestjs-libraries/dtos/marketplace/add.remove.item.dto';
import { StripeService } from '@gitroom/nestjs-libraries/services/stripe.service';
import { UsersService } from '@gitroom/nestjs-libraries/database/prisma/users/users.service';
import { ChangeActiveDto } from '@gitroom/nestjs-libraries/dtos/marketplace/change.active.dto';
import { ItemsDto } from '@gitroom/nestjs-libraries/dtos/marketplace/items.dto';
import { GetOrgFromRequest } from '@gitroom/nestjs-libraries/user/org.from.request';
import { AudienceDto } from '@gitroom/nestjs-libraries/dtos/marketplace/audience.dto';
import { NewConversationDto } from '@gitroom/nestjs-libraries/dtos/marketplace/new.conversation.dto';
import { MessagesService } from '@gitroom/nestjs-libraries/database/prisma/marketplace/messages.service';

@ApiTags('Marketplace')
@Controller('/marketplace')
export class MarketplaceController {
  constructor(
    private _itemUserService: ItemUserService,
    private _stripeService: StripeService,
    private _userService: UsersService,
    private _messagesService: MessagesService
  ) {}

  @Post('/')
  getInfluencers(
    @GetOrgFromRequest() organization: Organization,
    @GetUserFromRequest() user: User,
    @Body() body: ItemsDto
  ) {
    return this._userService.getMarketplacePeople(
      organization.id,
      user.id,
      body
    );
  }

  @Post('/conversation')
  createConversation(
    @GetUserFromRequest() user: User,
    @Body() body: NewConversationDto
  ) {
    return this._messagesService.createConversation(user.id, body);
  }

  @Get('/bank')
  connectBankAccount(@GetUserFromRequest() user: User) {
    return this._stripeService.createAccountProcess(user.id, user.email);
  }

  @Post('/item')
  async addItems(
    @GetUserFromRequest() user: User,
    @Body() body: AddRemoveItemDto
  ) {
    return this._itemUserService.addOrRemoveItem(body.state, user.id, body.key);
  }

  @Post('/active')
  async changeActive(
    @GetUserFromRequest() user: User,
    @Body() body: ChangeActiveDto
  ) {
    await this._userService.changeMarketplaceActive(user.id, body.active);
  }

  @Post('/audience')
  async changeAudience(
    @GetUserFromRequest() user: User,
    @Body() body: AudienceDto
  ) {
    await this._userService.changeAudienceSize(user.id, body.audience);
  }

  @Get('/item')
  async getItems(@GetUserFromRequest() user: User) {
    return this._itemUserService.getItems(user.id);
  }

  @Get('/account')
  async getAccount(@GetUserFromRequest() user: User) {
    const { account, marketplace, connectedAccount, name, picture, audience } =
      await this._userService.getUserByEmail(user.email);
    return {
      account,
      marketplace,
      connectedAccount,
      fullname: name,
      audience,
      picture,
    };
  }
}
