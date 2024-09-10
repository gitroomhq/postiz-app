import { Injectable } from '@nestjs/common';
import { MessagesRepository } from '@gitroom/nestjs-libraries/database/prisma/marketplace/messages.repository';
import { NewConversationDto } from '@gitroom/nestjs-libraries/dtos/marketplace/new.conversation.dto';
import { AddMessageDto } from '@gitroom/nestjs-libraries/dtos/messages/add.message';
import { CreateOfferDto } from '@gitroom/nestjs-libraries/dtos/marketplace/create.offer.dto';
import { From, OrderStatus, User } from '@prisma/client';
import { OrganizationRepository } from '@gitroom/nestjs-libraries/database/prisma/organizations/organization.repository';
import { NotificationService } from '@gitroom/nestjs-libraries/database/prisma/notifications/notification.service';
import dayjs from 'dayjs';
import { BullMqClient } from '@gitroom/nestjs-libraries/bull-mq-transport-new/client';

@Injectable()
export class MessagesService {
  constructor(
    private _workerServiceProducer: BullMqClient,
    private _messagesRepository: MessagesRepository,
    private _organizationRepository: OrganizationRepository,
    private _inAppNotificationService: NotificationService
  ) {}

  async createConversation(
    userId: string,
    organizationId: string,
    body: NewConversationDto
  ) {
    const conversation = await this._messagesRepository.createConversation(
      userId,
      organizationId,
      body
    );

    const orgs = await this._organizationRepository.getOrgsByUserId(body.to);
    await Promise.all(
      orgs.map(async (org) => {
        return this._inAppNotificationService.inAppNotification(
          org.id,
          'Request for service',
          'A user has requested a service from you',
          true
        );
      })
    );

    return conversation;
  }

  getMessagesGroup(userId: string, organizationId: string) {
    return this._messagesRepository.getMessagesGroup(userId, organizationId);
  }

  async getMessages(
    userId: string,
    organizationId: string,
    groupId: string,
    page: number
  ) {
    if (page === 1) {
      this._messagesRepository.updateOrderOnline(userId);
    }

    return this._messagesRepository.getMessages(
      userId,
      organizationId,
      groupId,
      page
    );
  }

  async createNewMessage(
    group: string,
    from: From,
    content: string,
    special?: object
  ) {
    const message = await this._messagesRepository.createNewMessage(
      group,
      from,
      content,
      special
    );

    const user = from === 'BUYER' ? message.group.seller : message.group.buyer;

    await Promise.all(
      user.organizations.map((p) => {
        return this.sendMessageNotification({
          id: p.organizationId,
          lastOnline: user.lastOnline,
        });
      })
    );

    return message;
  }

  async sendMessageNotification(user: { id: string; lastOnline: Date }) {
    if (dayjs(user.lastOnline).add(5, 'minute').isBefore(dayjs())) {
      await this._inAppNotificationService.inAppNotification(
        user.id,
        'New message',
        'You have a new message',
        true
      );
    }
  }

  async createMessage(
    userId: string,
    orgId: string,
    groupId: string,
    body: AddMessageDto
  ) {
    const message = await this._messagesRepository.createMessage(
      userId,
      orgId,
      groupId,
      body
    );

    await Promise.all(
      message.organizations.map((p) => {
        return this.sendMessageNotification({
          id: p.organizationId,
          lastOnline: message.lastOnline,
        });
      })
    );

    return message;
  }

  createOffer(userId: string, body: CreateOfferDto) {
    return this._messagesRepository.createOffer(userId, body);
  }

  getOrderDetails(userId: string, organizationId: string, orderId: string) {
    return this._messagesRepository.getOrderDetails(
      userId,
      organizationId,
      orderId
    );
  }

  canAddPost(id: string, order: string, integrationId: string) {
    return this._messagesRepository.canAddPost(id, order, integrationId);
  }

  changeOrderStatus(
    orderId: string,
    status: OrderStatus,
    paymentIntent?: string
  ) {
    return this._messagesRepository.changeOrderStatus(
      orderId,
      status,
      paymentIntent
    );
  }

  getOrgByOrder(orderId: string) {
    return this._messagesRepository.getOrgByOrder(orderId);
  }

  getMarketplaceAvailableOffers(orgId: string, id: string) {
    return this._messagesRepository.getMarketplaceAvailableOffers(orgId, id);
  }

  getPost(userId: string, orgId: string, postId: string) {
    return this._messagesRepository.getPost(userId, orgId, postId);
  }

  requestRevision(
    userId: string,
    orgId: string,
    postId: string,
    message: string
  ) {
    return this._messagesRepository.requestRevision(
      userId,
      orgId,
      postId,
      message
    );
  }

  async requestApproved(
    userId: string,
    orgId: string,
    postId: string,
    message: string
  ) {
    const post = await this._messagesRepository.requestApproved(
      userId,
      orgId,
      postId,
      message
    );
    if (post) {
      this._workerServiceProducer.emit('post', {
        id: post.id,
        options: {
          delay: 0, //dayjs(post.publishDate).diff(dayjs(), 'millisecond'),
        },
        payload: {
          id: post.id,
        },
      });
    }
  }

  async requestCancel(orgId: string, postId: string) {
    const cancel = await this._messagesRepository.requestCancel(orgId, postId);
    await this._workerServiceProducer.delete('post', postId);
    return cancel;
  }

  async completeOrderAndPay(orgId: string, order: string) {
    const orderList = await this._messagesRepository.completeOrderAndPay(
      orgId,
      order
    );
    if (!orderList) {
      return false;
    }
    orderList.posts.forEach((post) => {
      this._workerServiceProducer.delete('post', post.id);
    });
    return orderList;
  }

  completeOrder(orderId: string) {
    return this._messagesRepository.completeOrder(orderId);
  }

  payoutProblem(
    orderId: string,
    sellerId: string,
    amount: number,
    postId?: string
  ) {
    return this._messagesRepository.payoutProblem(
      orderId,
      sellerId,
      amount,
      postId
    );
  }

  getOrders(userId: string, orgId: string, type: 'seller' | 'buyer') {
    return this._messagesRepository.getOrders(userId, orgId, type);
  }
}
