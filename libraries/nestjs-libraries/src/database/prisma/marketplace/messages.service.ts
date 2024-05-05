import { Injectable } from '@nestjs/common';
import { MessagesRepository } from '@gitroom/nestjs-libraries/database/prisma/marketplace/messages.repository';
import { NewConversationDto } from '@gitroom/nestjs-libraries/dtos/marketplace/new.conversation.dto';
import { AddMessageDto } from '@gitroom/nestjs-libraries/dtos/messages/add.message';

@Injectable()
export class MessagesService {
  constructor(private _messagesRepository: MessagesRepository) {}

  createConversation(userId: string, body: NewConversationDto) {
    return this._messagesRepository.createConversation(userId, body);
  }

  getMessagesGroup(userId: string) {
    return this._messagesRepository.getMessagesGroup(userId);
  }

  getMessages(userId: string, groupId: string, page: number) {
    return this._messagesRepository.getMessages(userId, groupId, page);
  }

  createMessage(userId: string, groupId: string, body: AddMessageDto) {
    return this._messagesRepository.createMessage(userId, groupId, body);
  }
}
