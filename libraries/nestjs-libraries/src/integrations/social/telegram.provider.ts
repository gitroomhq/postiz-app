import {
  AuthTokenDetails,
  PostDetails,
  PostResponse,
  SocialProvider,
} from '@gitroom/nestjs-libraries/integrations/social/social.integrations.interface';
import { makeId } from '@gitroom/nestjs-libraries/services/make.is';
import dayjs from 'dayjs';
import { SocialAbstract } from '@gitroom/nestjs-libraries/integrations/social.abstract';
import TelegramBot from 'node-telegram-bot-api';
import { Integration } from '@prisma/client';

const telegramBot = new TelegramBot(process.env.TELEGRAM_TOKEN!);

export class TelegramProvider extends SocialAbstract implements SocialProvider {
  identifier = 'telegram';
  name = 'Telegram';
  isBetweenSteps = false;
  isWeb3 = true;
  scopes = [];

  async refreshToken(refresh_token: string): Promise<AuthTokenDetails> {
    return {
      refreshToken: '',
      expiresIn: 0,
      accessToken: '',
      id: '',
      name: '',
      picture: '',
      username: '',
    };
  }

  async generateAuthUrl() {
    const state = makeId(17);
    return {
      url: state,
      codeVerifier: makeId(10),
      state,
    };
  }

  async authenticate(params: {
    code: string;
    codeVerifier: string;
    refresh?: string;
  }) {
    const chat = await telegramBot.getChat(params.code);

    console.log(JSON.stringify(chat))
    if (!chat?.id) {
      return 'No chat found';
    }

    const photo = !chat?.photo?.big_file_id
      ? ''
      : await telegramBot.getFileLink(chat.photo.big_file_id);
    return {
      id: String(chat.username),
      name: chat.title!,
      accessToken: String(chat.id),
      refreshToken: '',
      expiresIn: dayjs().add(200, 'year').unix() - dayjs().unix(),
      picture: photo,
      username: chat.username!,
    };
  }

  async getBotId(query: { id?: number; word: string }) {
    const res = await telegramBot.getUpdates({
      ...(query.id ? { offset: query.id } : {}),
    });

    const chatId = res?.find(
      (p) => p?.message?.text === `/connect ${query.word}`
    )?.message?.chat?.id;

    return chatId
      ? {
          chatId,
        }
      : res.length > 0
      ? {
          lastChatId: res?.[res.length - 1]?.message?.chat?.id,
        }
      : {};
  }

  async post(
    id: string,
    accessToken: string,
    postDetails: PostDetails[]
  ): Promise<PostResponse[]> {
    const ids: PostResponse[] = [];
    for (const message of postDetails) {
      if (
        (message?.media?.length || 0) === 1
      ) {
        const [{ message_id }] = await telegramBot.sendMediaGroup(
          accessToken,
          message?.media?.map((m) => ({
            type: m.url.indexOf('mp4') > -1 ? 'video' : 'photo',
            caption: message.message,
            media: m.url,
          })) || []
        );

        ids.push({
          id: message.id,
          postId: String(message_id),
          releaseURL: `https://t.me/${id}/${message_id}`,
          status: 'completed',
        });
      } else {
        const { message_id } = await telegramBot.sendMessage(
          accessToken,
          message.message
        );

        ids.push({
          id: message.id,
          postId: String(message_id),
          releaseURL: `https://t.me/${id}/${message_id}`,
          status: 'completed',
        });

        if ((message?.media?.length || 0) > 0) {
          await telegramBot.sendMediaGroup(
            accessToken,
            message?.media?.map((m) => ({
              type: m.url.indexOf('mp4') > -1 ? 'video' : 'photo',
              media: m.url,
            })) || []
          );
        }
      }
    }

    return ids;
  }
}
