import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
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
import { CreateOfferDto } from '@gitroom/nestjs-libraries/dtos/marketplace/create.offer.dto';
import { PostsService } from '@gitroom/nestjs-libraries/database/prisma/posts/posts.service';

@ApiTags('Marketplace')
@Controller('/marketplace')
export class MarketplaceController {
  constructor(
    private _itemUserService: ItemUserService,
    private _stripeService: StripeService,
    private _userService: UsersService,
    private _messagesService: MessagesService,
    private _postsService: PostsService
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
    @GetOrgFromRequest() organization: Organization,
    @Body() body: NewConversationDto
  ) {
    return this._messagesService.createConversation(
      user.id,
      organization.id,
      body
    );
  }

  @Get('/bank')
  connectBankAccount(
    @GetUserFromRequest() user: User,
    @Query('country') country: string
  ) {
    return this._stripeService.createAccountProcess(
      user.id,
      user.email,
      country
    );
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

  @Get('/orders')
  async getOrders(
    @GetUserFromRequest() user: User,
    @GetOrgFromRequest() organization: Organization,
    @Query('type') type: 'seller' | 'buyer'
  ) {
    return this._messagesService.getOrders(user.id, organization.id, type);
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

  @Post('/offer')
  async createOffer(
    @GetUserFromRequest() user: User,
    @Body() body: CreateOfferDto
  ) {
    return this._messagesService.createOffer(user.id, body);
  }

  @Get('/posts/:id')
  async post(
    @GetUserFromRequest() user: User,
    @GetOrgFromRequest() organization: Organization,
    @Param('id') id: string
  ) {
    const getPost = await this._messagesService.getPost(
      user.id,
      organization.id,
      id
    );
    if (!getPost) {
      return;
    }

    return {
      ...(await this._postsService.getPost(getPost.organizationId, id)),
      providerId: getPost.integration.providerIdentifier,
    };
  }

  @Post('/posts/:id/revision')
  async revision(
    @GetUserFromRequest() user: User,
    @GetOrgFromRequest() organization: Organization,
    @Param('id') id: string,
    @Body('message') message: string
  ) {
    return this._messagesService.requestRevision(
      user.id,
      organization.id,
      id,
      message
    );
  }

  @Post('/posts/:id/approve')
  async approve(
    @GetUserFromRequest() user: User,
    @GetOrgFromRequest() organization: Organization,
    @Param('id') id: string,
    @Body('message') message: string
  ) {
    return this._messagesService.requestApproved(
      user.id,
      organization.id,
      id,
      message
    );
  }

  @Post('/posts/:id/cancel')
  async cancel(
    @GetOrgFromRequest() organization: Organization,
    @Param('id') id: string
  ) {
    return this._messagesService.requestCancel(organization.id, id);
  }

  @Post('/offer/:id/complete')
  async completeOrder(
    @GetOrgFromRequest() organization: Organization,
    @Param('id') id: string
  ) {
    const order = await this._messagesService.completeOrderAndPay(
      organization.id,
      id
    );

    if (!order) {
      return;
    }

    try {
      await this._stripeService.payout(
        id,
        order.charge,
        order.account,
        order.price
      );
    } catch (e) {
      await this._messagesService.payoutProblem(
        id,
        order.sellerId,
        order.price
      );
    }
    await this._messagesService.completeOrder(id);
  }

  @Post('/orders/:id/payment')
  async payOrder(
    @GetUserFromRequest() user: User,
    @GetOrgFromRequest() organization: Organization,
    @Param('id') id: string
  ) {
    const orderDetails = await this._messagesService.getOrderDetails(
      user.id,
      organization.id,
      id
    );
    const payment = await this._stripeService.payAccountStepOne(
      user.id,
      organization,
      orderDetails.seller,
      orderDetails.order.id,
      orderDetails.order.ordersItems.map((p) => ({
        quantity: p.quantity,
        integrationType: p.integration.providerIdentifier,
        price: p.price,
      })),
      orderDetails.order.messageGroupId
    );
    return payment;
  }
}
