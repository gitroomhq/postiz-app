import { PrismaRepository } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { NewConversationDto } from '@gitroom/nestjs-libraries/dtos/marketplace/new.conversation.dto';
import { From, OrderStatus } from '@prisma/client';
import { AddMessageDto } from '@gitroom/nestjs-libraries/dtos/messages/add.message';
import { CreateOfferDto } from '@gitroom/nestjs-libraries/dtos/marketplace/create.offer.dto';

@Injectable()
export class MessagesRepository {
  constructor(
    private _messagesGroup: PrismaRepository<'messagesGroup'>,
    private _messages: PrismaRepository<'messages'>,
    private _orders: PrismaRepository<'orders'>,
    private _organizations: PrismaRepository<'organization'>,
    private _post: PrismaRepository<'post'>,
    private _payoutProblems: PrismaRepository<'payoutProblems'>,
    private _users: PrismaRepository<'user'>
  ) {}

  async createConversation(
    userId: string,
    organizationId: string,
    body: NewConversationDto
  ) {
    const { id } =
      (await this._messagesGroup.model.messagesGroup.findFirst({
        where: {
          buyerOrganizationId: organizationId,
          buyerId: userId,
          sellerId: body.to,
        },
      })) ||
      (await this._messagesGroup.model.messagesGroup.create({
        data: {
          buyerOrganizationId: organizationId,
          buyerId: userId,
          sellerId: body.to,
        },
      }));

    await this._messagesGroup.model.messagesGroup.update({
      where: {
        id,
      },
      data: {
        updatedAt: new Date(),
      },
    });

    await this._messages.model.messages.create({
      data: {
        groupId: id,
        from: From.BUYER,
        content: body.message,
      },
    });

    return { id };
  }

  getOrgByOrder(orderId: string) {
    return this._orders.model.orders.findFirst({
      where: {
        id: orderId,
      },
      select: {
        messageGroup: {
          select: {
            buyerOrganizationId: true,
          },
        },
      },
    });
  }

  async getMessagesGroup(userId: string, organizationId: string) {
    return this._messagesGroup.model.messagesGroup.findMany({
      where: {
        OR: [
          {
            buyerOrganizationId: organizationId,
            buyerId: userId,
          },
          {
            sellerId: userId,
          },
        ],
      },
      orderBy: {
        updatedAt: 'desc',
      },
      include: {
        seller: {
          select: {
            id: true,
            name: true,
            picture: {
              select: {
                id: true,
                path: true,
              },
            },
          },
        },
        buyer: {
          select: {
            id: true,
            name: true,
            picture: {
              select: {
                id: true,
                path: true,
              },
            },
          },
        },
        orders: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
        },
        messages: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
        },
      },
    });
  }

  async createMessage(
    userId: string,
    orgId: string,
    groupId: string,
    body: AddMessageDto
  ) {
    const group = await this._messagesGroup.model.messagesGroup.findFirst({
      where: {
        id: groupId,
        OR: [
          {
            buyerOrganizationId: orgId,
            buyerId: userId,
          },
          {
            sellerId: userId,
          },
        ],
      },
    });

    if (!group) {
      throw new Error('Group not found');
    }

    const create = await this.createNewMessage(
      groupId,
      group.buyerId === userId ? From.BUYER : From.SELLER,
      body.message
    );

    await this._messagesGroup.model.messagesGroup.update({
      where: {
        id: groupId,
      },
      data: {
        updatedAt: new Date(),
      },
    });

    if (userId === group.buyerId) {
      return create.group.seller;
    }

    return create.group.buyer;
  }

  async updateOrderOnline(userId: string) {
    await this._users.model.user.update({
      where: {
        id: userId,
      },
      data: {
        lastOnline: new Date(),
      },
    });
  }

  async getMessages(
    userId: string,
    organizationId: string,
    groupId: string,
    page: number
  ) {
    return this._messagesGroup.model.messagesGroup.findFirst({
      where: {
        id: groupId,
        OR: [
          {
            buyerOrganizationId: organizationId,
            buyerId: userId,
          },
          {
            sellerId: userId,
          },
        ],
      },
      include: {
        messages: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 10,
          skip: (page - 1) * 10,
        },
      },
    });
  }

  async createOffer(userId: string, body: CreateOfferDto) {
    const messageGroup =
      await this._messagesGroup.model.messagesGroup.findFirst({
        where: {
          id: body.group,
          sellerId: userId,
        },
        select: {
          id: true,
          buyer: {
            select: {
              id: true,
            },
          },
          orders: {
            orderBy: {
              createdAt: 'desc',
            },
            take: 1,
          },
        },
      });

    if (!messageGroup?.id) {
      throw new Error('Group not found');
    }

    if (
      messageGroup.orders.length &&
      messageGroup.orders[0].status !== 'COMPLETED' &&
      messageGroup.orders[0].status !== 'CANCELED'
    ) {
      throw new Error('Order already exists');
    }

    const data = await this._orders.model.orders.create({
      data: {
        sellerId: userId,
        buyerId: messageGroup.buyer.id,
        messageGroupId: messageGroup.id,
        ordersItems: {
          createMany: {
            data: body.socialMedia.map((item) => ({
              quantity: item.total,
              integrationId: item.value,
              price: item.price,
            })),
          },
        },
        status: 'PENDING',
      },
      select: {
        id: true,
        ordersItems: {
          select: {
            quantity: true,
            price: true,
            integration: {
              select: {
                name: true,
                providerIdentifier: true,
                picture: true,
                id: true,
              },
            },
          },
        },
      },
    });

    await this._messages.model.messages.create({
      data: {
        groupId: body.group,
        from: From.SELLER,
        content: '',
        special: JSON.stringify({ type: 'offer', data: data }),
      },
    });

    return { success: true };
  }

  async createNewMessage(
    group: string,
    from: From,
    content: string,
    special?: object
  ) {
    return this._messages.model.messages.create({
      data: {
        groupId: group,
        from,
        content,
        special: JSON.stringify(special),
      },
      select: {
        id: true,
        group: {
          select: {
            buyer: {
              select: {
                lastOnline: true,
                id: true,
                organizations: true,
              },
            },
            seller: {
              select: {
                lastOnline: true,
                id: true,
                organizations: true,
              },
            },
          },
        },
      },
    });
  }

  async getOrderDetails(
    userId: string,
    organizationId: string,
    orderId: string
  ) {
    const order = await this._messagesGroup.model.messagesGroup.findFirst({
      where: {
        buyerId: userId,
        buyerOrganizationId: organizationId,
      },
      select: {
        buyer: true,
        seller: true,
        orders: {
          include: {
            ordersItems: {
              select: {
                quantity: true,
                integration: true,
                price: true,
              },
            },
          },
          where: {
            id: orderId,
            status: 'PENDING',
          },
        },
      },
    });

    if (!order?.orders[0]?.id) {
      throw new Error('Order not found');
    }

    return {
      buyer: order.buyer,
      seller: order.seller,
      order: order.orders[0]!,
    };
  }

  async canAddPost(id: string, order: string, integrationId: string) {
    const findOrder = await this._orders.model.orders.findFirst({
      where: {
        id: order,
        status: 'ACCEPTED',
      },
      select: {
        posts: true,
        ordersItems: true,
      },
    });

    if (!findOrder) {
      return false;
    }

    if (
      findOrder.posts.find(
        (p) => p.id === id && p.approvedSubmitForOrder === 'YES'
      )
    ) {
      return false;
    }

    if (
      findOrder.posts.find(
        (p) =>
          p.id === id && p.approvedSubmitForOrder === 'WAITING_CONFIRMATION'
      )
    ) {
      return true;
    }

    const postsForIntegration = findOrder.ordersItems.filter(
      (p) => p.integrationId === integrationId
    );
    const totalPostsRequired = postsForIntegration.reduce(
      (acc, item) => acc + item.quantity,
      0
    );
    const usedPosts = findOrder.posts.filter(
      (p) =>
        p.integrationId === integrationId &&
        ['WAITING_CONFIRMATION', 'YES'].indexOf(p.approvedSubmitForOrder) > -1
    ).length;

    return totalPostsRequired > usedPosts;
  }

  changeOrderStatus(
    orderId: string,
    status: OrderStatus,
    paymentIntent?: string
  ) {
    return this._orders.model.orders.update({
      where: {
        id: orderId,
      },
      data: {
        status,
        captureId: paymentIntent,
      },
    });
  }

  async getMarketplaceAvailableOffers(orgId: string, id: string) {
    const offers = await this._organizations.model.organization.findFirst({
      where: {
        id: orgId,
      },
      select: {
        users: {
          select: {
            user: {
              select: {
                orderSeller: {
                  where: {
                    status: 'ACCEPTED',
                  },
                  select: {
                    id: true,
                    posts: {
                      where: {
                        deletedAt: null,
                      },
                      select: {
                        id: true,
                        integrationId: true,
                        approvedSubmitForOrder: true,
                      },
                    },
                    messageGroup: {
                      select: {
                        buyerOrganizationId: true,
                      },
                    },
                    buyer: {
                      select: {
                        id: true,
                        name: true,
                        picture: {
                          select: {
                            id: true,
                            path: true,
                          },
                        },
                      },
                    },
                    ordersItems: {
                      select: {
                        quantity: true,
                        integration: {
                          select: {
                            id: true,
                            name: true,
                            providerIdentifier: true,
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    const allOrders =
      offers?.users.flatMap((user) => user.user.orderSeller) || [];

    const onlyValidItems = allOrders.filter(
      (order) =>
        (order.posts.find((p) => p.id === id)
          ? 0
          : order.posts.filter((f) => f.approvedSubmitForOrder !== 'NO')
              .length) <
        order.ordersItems.reduce((acc, item) => acc + item.quantity, 0)
    );

    return onlyValidItems
      .map((order) => {
        const postsNumbers = order.posts
          .filter(
            (p) =>
              ['WAITING_CONFIRMATION', 'YES'].indexOf(
                p.approvedSubmitForOrder
              ) > -1
          )
          .reduce((acc, post) => {
            acc[post.integrationId] = acc[post.integrationId] + 1 || 1;
            return acc;
          }, {} as { [key: string]: number });

        const missing = order.ordersItems.map((item) => {
          return {
            integration: item,
            missing: item.quantity - (postsNumbers[item.integration.id] || 0),
          };
        });

        return {
          id: order.id,
          usedIds: order.posts.map((p) => ({
            id: p.id,
            status: p.approvedSubmitForOrder,
          })),
          buyer: order.buyer,
          missing,
        };
      })
      .filter((f) => f.missing.length);
  }

  async requestRevision(
    userId: string,
    orgId: string,
    postId: string,
    message: string
  ) {
    const loadMessage = await this._messages.model.messages.findFirst({
      where: {
        id: message,
        group: {
          buyerOrganizationId: orgId,
        },
      },
      select: {
        id: true,
        special: true,
      },
    });

    const post = await this._post.model.post.findFirst({
      where: {
        id: postId,
        approvedSubmitForOrder: 'WAITING_CONFIRMATION',
        deletedAt: null,
      },
    });

    if (post && loadMessage) {
      const special = JSON.parse(loadMessage.special!);
      special.data.status = 'REVISION';
      await this._messages.model.messages.update({
        where: {
          id: message,
        },
        data: {
          special: JSON.stringify(special),
        },
      });

      await this._post.model.post.update({
        where: {
          id: postId,
          deletedAt: null,
        },
        data: {
          approvedSubmitForOrder: 'NO',
        },
      });
    }
  }

  async requestCancel(orgId: string, postId: string) {
    const getPost = await this._post.model.post.findFirst({
      where: {
        id: postId,
        organizationId: orgId,
        approvedSubmitForOrder: {
          in: ['WAITING_CONFIRMATION', 'YES'],
        },
      },
      select: {
        lastMessage: true,
      },
    });

    if (!getPost) {
      throw new Error('Post not found');
    }

    await this._post.model.post.update({
      where: {
        id: postId,
      },
      data: {
        approvedSubmitForOrder: 'NO',
        submittedForOrganizationId: null,
      },
    });

    const special = JSON.parse(getPost.lastMessage!.special!);
    special.data.status = 'CANCELED';
    await this._messages.model.messages.update({
      where: {
        id: getPost.lastMessage!.id,
      },
      data: {
        special: JSON.stringify(special),
      },
    });
  }

  async requestApproved(
    userId: string,
    orgId: string,
    postId: string,
    message: string
  ) {
    const loadMessage = await this._messages.model.messages.findFirst({
      where: {
        id: message,
        group: {
          buyerOrganizationId: orgId,
        },
      },
      select: {
        id: true,
        special: true,
      },
    });

    const post = await this._post.model.post.findFirst({
      where: {
        id: postId,
        approvedSubmitForOrder: 'WAITING_CONFIRMATION',
        deletedAt: null,
      },
    });

    if (post && loadMessage) {
      const special = JSON.parse(loadMessage.special!);
      special.data.status = 'APPROVED';
      await this._messages.model.messages.update({
        where: {
          id: message,
        },
        data: {
          special: JSON.stringify(special),
        },
      });

      await this._post.model.post.update({
        where: {
          id: postId,
          deletedAt: null,
        },
        data: {
          approvedSubmitForOrder: 'YES',
        },
      });

      return post;
    }

    return false;
  }

  completeOrder(orderId: string) {
    return this._orders.model.orders.update({
      where: {
        id: orderId,
      },
      data: {
        status: 'COMPLETED',
      },
    });
  }

  async completeOrderAndPay(orgId: string, order: string) {
    const findOrder = await this._orders.model.orders.findFirst({
      where: {
        id: order,
        messageGroup: {
          buyerOrganizationId: orgId,
        },
      },
      select: {
        captureId: true,
        seller: {
          select: {
            account: true,
            id: true,
          },
        },
        ordersItems: true,
        posts: true,
      },
    });

    if (!findOrder) {
      return false;
    }

    const releasedPosts = findOrder.posts.filter((p) => p.releaseURL);
    const nonReleasedPosts = findOrder.posts.filter((p) => !p.releaseURL);

    const totalPosts = releasedPosts.reduce((acc, item) => {
      acc[item.integrationId] = (acc[item.integrationId] || 0) + 1;
      return acc;
    }, {} as { [key: string]: number });

    const totalOrderItems = findOrder.ordersItems.reduce((acc, item) => {
      acc[item.integrationId] = (acc[item.integrationId] || 0) + item.quantity;
      return acc;
    }, {} as { [key: string]: number });

    const calculate = Object.keys(totalOrderItems).reduce((acc, key) => {
      acc.push({
        price: findOrder.ordersItems.find((p) => p.integrationId === key)!
          .price,
        quantity: totalOrderItems[key] - (totalPosts[key] || 0),
      });
      return acc;
    }, [] as { price: number; quantity: number }[]);

    const price = calculate.reduce((acc, item) => {
      acc += item.price * item.quantity;
      return acc;
    }, 0);

    return {
      price,
      account: findOrder.seller.account,
      charge: findOrder.captureId,
      posts: nonReleasedPosts,
      sellerId: findOrder.seller.id,
    };
  }

  payoutProblem(
    orderId: string,
    sellerId: string,
    amount: number,
    postId?: string
  ) {
    return this._payoutProblems.model.payoutProblems.create({
      data: {
        amount,
        orderId,
        ...(postId ? { postId } : {}),
        userId: sellerId,
        status: 'PAYMENT_ERROR',
      },
    });
  }

  async getOrders(userId: string, orgId: string, type: 'seller' | 'buyer') {
    const orders = await this._orders.model.orders.findMany({
      where: {
        status: {
          in: ['ACCEPTED', 'PENDING', 'COMPLETED'],
        },
        ...(type === 'seller'
          ? {
              sellerId: userId,
            }
          : {
              messageGroup: {
                buyerOrganizationId: orgId,
              },
            }),
      },
      orderBy: {
        updatedAt: 'desc',
      },
      select: {
        id: true,
        status: true,
        ...(type === 'seller'
          ? {
              buyer: {
                select: {
                  name: true,
                },
              },
            }
          : {
              seller: {
                select: {
                  name: true,
                },
              },
            }),
        ordersItems: {
          select: {
            id: true,
            quantity: true,
            price: true,
            integration: {
              select: {
                id: true,
                picture: true,
                name: true,
                providerIdentifier: true,
              },
            },
          },
        },
        posts: {
          select: {
            id: true,
            integrationId: true,
            releaseURL: true,
            approvedSubmitForOrder: true,
            state: true,
          },
        },
      },
    });

    return {
      orders: await Promise.all(
        orders.map(async (order) => {
          return {
            id: order.id,
            status: order.status,
            // @ts-ignore
            name: type === 'seller' ? order?.buyer?.name : order?.seller?.name,
            price: order.ordersItems.reduce(
              (acc, item) => acc + item.price * item.quantity,
              0
            ),
            details: await Promise.all(
              order.ordersItems.map((item) => {
                return {
                  posted: order.posts.filter(
                    (p) =>
                      p.releaseURL && p.integrationId === item.integration.id
                  ).length,
                  submitted: order.posts.filter(
                    (p) =>
                      !p.releaseURL &&
                      (p.approvedSubmitForOrder === 'WAITING_CONFIRMATION' ||
                        p.approvedSubmitForOrder === 'YES') &&
                      p.integrationId === item.integration.id
                  ).length,
                  integration: item.integration,
                  total: item.quantity,
                  price: item.price,
                };
              })
            ),
          };
        })
      ),
    };
  }

  getPost(userId: string, orgId: string, postId: string) {
    return this._post.model.post.findFirst({
      where: {
        id: postId,
        submittedForOrder: {
          messageGroup: {
            OR: [{ sellerId: userId }, { buyerOrganizationId: orgId }],
          },
        },
      },
      select: {
        organizationId: true,
        integration: {
          select: {
            providerIdentifier: true,
          },
        },
      },
    });
  }
}
