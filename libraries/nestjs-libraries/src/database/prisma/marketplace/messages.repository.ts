import { PrismaRepository } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { NewConversationDto } from '@gitroom/nestjs-libraries/dtos/marketplace/new.conversation.dto';
import { From } from '@prisma/client';
import { AddMessageDto } from '@gitroom/nestjs-libraries/dtos/messages/add.message';

@Injectable()
export class MessagesRepository {
  constructor(
    private _messagesGroup: PrismaRepository<'messagesGroup'>,
    private _messages: PrismaRepository<'messages'>
  ) {}

  async createConversation(userId: string, body: NewConversationDto) {
    const { id } =
      (await this._messagesGroup.model.messagesGroup.findFirst({
        where: {
          buyerId: userId,
          sellerId: body.to,
        },
      })) ||
      (await this._messagesGroup.model.messagesGroup.create({
        data: {
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

  async getMessagesGroup(userId: string) {
    return this._messagesGroup.model.messagesGroup.findMany({
      where: {
        buyerId: userId,
      },
      orderBy: {
        updatedAt: 'desc',
      },
      include: {
        seller: {
          select: {
            name: true,
            picture: {
              select: {
                id: true,
                path: true,
              },
            },
          },
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

  async createMessage(userId: string, groupId: string, body: AddMessageDto) {
    const group = await this._messagesGroup.model.messagesGroup.findFirst({
      where: {
        id: groupId,
        OR: [
          {
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

    await this._messages.model.messages.create({
      data: {
        groupId,
        from: group.buyerId === userId ? From.BUYER : From.SELLER,
        content: body.message,
      },
    });
  }

  async getMessages(userId: string, groupId: string, page: number) {
    return this._messagesGroup.model.messagesGroup.findFirst({
      where: {
        id: groupId,
        OR: [
          {
            buyerId: userId,
          },
          {
            sellerId: userId,
          },
        ],
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
}
