import {
  AuthTokenDetails,
  PostDetails,
  PostResponse,
  SocialProvider,
} from '@gitroom/nestjs-libraries/integrations/social/social.integrations.interface';
import { makeId } from '@gitroom/nestjs-libraries/services/make.is';
import dayjs from 'dayjs';
import { SocialAbstract } from '@gitroom/nestjs-libraries/integrations/social.abstract';
//@ts-ignore
import mime from 'mime';
import TelegramBot from 'node-telegram-bot-api';
import { Integration } from '@prisma/client';
import striptags from 'striptags';

const telegramBot = new TelegramBot(process.env.TELEGRAM_TOKEN!);
// Added to support local storage posting
const frontendURL = process.env.FRONTEND_URL || 'http://localhost:5000';
const mediaStorage = process.env.STORAGE_PROVIDER || 'local';

export class TelegramProvider extends SocialAbstract implements SocialProvider {
  override maxConcurrentJob = 3; // Telegram has moderate bot API limits
  identifier = 'telegram';
  name = 'Telegram';
  isBetweenSteps = false;
  isWeb3 = true;
  scopes = [] as string[];
  editor = 'html' as const;
  maxLength() {
    return 4096;
  }

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

    let photo: string | undefined;
    try {
      if (chat.photo?.small_file_id) {
        photo = await telegramBot.getFileLink(chat.photo.small_file_id);
      }
    } catch (e) {}

    return {
      id: String(chat.id),
      name: chat.title || chat.username || 'Telegram Channel',
      accessToken: String(chat.id),
      refreshToken: '',
      expiresIn: dayjs().add(200, 'years').unix() - dayjs().unix(),
      picture: photo || '',
      username: chat.username || chat.title || 'channel',
    };
  }

  async getBotId(query: { word: string; id?: number }) {
    const res = await telegramBot.getUpdates({
      ...(query.id ? { offset: query.id } : {}),
      allowed_updates: ['message', 'channel_post'],
    });

    const match = res.find(
      (p) =>
        (p?.message?.text === `/connect ${query.word}` &&
          p?.message?.chat?.id) ||
        (p?.channel_post?.text === `/connect ${query.word}` &&
          p?.channel_post?.chat?.id)
    );

    const chatId = match?.message?.chat?.id || match?.channel_post?.chat?.id;

    if (chatId) {
      const botId = (await telegramBot.getMe()).id;
      const isAdmin = await this.botIsAdmin(chatId, botId);
      const connectMessageId =
        match?.message?.message_id || match?.channel_post?.message_id;

      if (!isAdmin) {
        telegramBot.sendMessage(
          chatId,
          "Connection Successful. I don't have admin privileges to delete these messages, please go ahead and remove them yourself."
        );
      } else {
        await telegramBot.deleteMessage(chatId, connectMessageId);
        const successMessage = await telegramBot.sendMessage(
          chatId,
          'Connection Successful. Message will be deleted in 10 seconds.'
        );
        setTimeout(async () => {
          await telegramBot.deleteMessage(chatId, successMessage.message_id);
          console.log('Success message deleted.');
        }, 10000);
      }
    }

    return chatId
      ? { chatId }
      : res.length > 0
      ? {
          lastChatId: res[res.length - 1].update_id + 1,
        }
      : {};
  }

  formatTelegramText(html: string): string {
    if (!html) return '';

    let text = html
      .replace(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/gi, '\n<b>$1</b>\n')
      .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '• $1\n')
      .replace(/<\/?(ul|ol)[^>]*>/gi, '')
      .replace(/<strong>/gi, '<b>')
      .replace(/<\/strong>/gi, '</b>')
      .replace(/<em>/gi, '<i>')
      .replace(/<\/em>/gi, '</i>')
      .replace(/<del>/gi, '<s>')
      .replace(/<\/del>/gi, '</s>')
      .replace(/<strike>/gi, '<s>')
      .replace(/<\/strike>/gi, '</s>')
      .replace(/<ins>/gi, '<u>')
      .replace(/<\/ins>/gi, '</u>')
      .replace(/<p><br\s*\/?>\s*<\/p>/gi, '\n')
      .replace(/<p>\s*<\/p>/gi, '\n')
      .replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, '$1\n')
      .replace(/<\/?p[^>]*>/gi, '\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/&nbsp;/gi, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    return striptags(text, [
      'b',
      'strong',
      'i',
      'em',
      'u',
      'ins',
      's',
      'del',
      'strike',
      'a',
      'code',
      'pre',
      'blockquote',
      'tg-spoiler',
    ]);
  }

  private processMedia(mediaFiles: PostDetails['media']) {
    return (mediaFiles || []).map((media) => {
      let mediaUrl = media.path;
      if (mediaStorage === 'local' && mediaUrl.startsWith(frontendURL)) {
        mediaUrl = mediaUrl.replace(frontendURL, '');
      }
      const mimeType = mime.getType(mediaUrl);
      let mediaType: 'photo' | 'video' | 'document';

      if (mimeType?.startsWith('image/')) {
        mediaType = 'photo';
      } else if (mimeType?.startsWith('video/')) {
        mediaType = 'video';
      } else {
        mediaType = 'document';
      }

      return {
        type: mediaType,
        media: mediaUrl,
        fileOptions: {
          filename: media.path.split('/').pop(),
          contentType: mimeType || 'application/octet-stream',
        },
      };
    });
  }

  private async sendMessage(
    accessToken: string,
    message: PostDetails,
    replyToMessageId?: number
  ): Promise<number | null> {
    let messageId: number | null = null;
    const mediaFiles = message.media || [];
    const text = this.formatTelegramText(message.message || '');

    const processedMedia = this.processMedia(mediaFiles);

    if (processedMedia.length === 0) {
      const response = await telegramBot.sendMessage(accessToken, text, {
        parse_mode: 'HTML',
        ...(replyToMessageId ? { reply_to_message_id: replyToMessageId } : {}),
      });
      messageId = response.message_id;
    } else if (processedMedia.length === 1) {
      const media = processedMedia[0];
      const options = {
        caption: text,
        parse_mode: 'HTML' as const,
        ...(replyToMessageId ? { reply_to_message_id: replyToMessageId } : {}),
      };
      const response =
        media.type === 'video'
          ? await telegramBot.sendVideo(
              accessToken,
              media.media,
              options,
              media.fileOptions
            )
          : media.type === 'photo'
          ? await telegramBot.sendPhoto(
              accessToken,
              media.media,
              options,
              media.fileOptions
            )
          : await telegramBot.sendDocument(
              accessToken,
              media.media,
              options,
              media.fileOptions
            );
      messageId = response.message_id;
    } else {
      const mediaGroups = this.chunkMedia(processedMedia, 10);
      for (let i = 0; i < mediaGroups.length; i++) {
        const mediaGroup = mediaGroups[i].map((m, index) => ({
          type: m.type === 'document' ? 'document' : m.type,
          media: m.media,
          caption: i === 0 && index === 0 ? text : undefined,
          parse_mode: 'HTML',
        }));

        const response = await telegramBot.sendMediaGroup(
          accessToken,
          mediaGroup as any[],
          {
            ...(replyToMessageId && i === 0
              ? { reply_to_message_id: replyToMessageId }
              : {}),
          }
        );
        if (i === 0) {
          messageId = response[0].message_id;
        }
      }
    }

    return messageId;
  }

  async post(
    id: string,
    accessToken: string,
    postDetails: PostDetails[]
  ): Promise<PostResponse[]> {
    const [firstPost] = postDetails;

    const messageId = await this.sendMessage(accessToken, firstPost);

    if (messageId) {
      return [
        {
          id: firstPost.id,
          postId: String(messageId),
          releaseURL: `https://t.me/${
            id !== 'undefined' ? id : `c/${accessToken.replace('-100', '')}`
          }/${messageId}`,
          status: 'completed',
        },
      ];
    }

    return [];
  }

  async comment(
    id: string,
    postId: string,
    lastCommentId: string | undefined,
    accessToken: string,
    postDetails: PostDetails[],
    integration: Integration
  ): Promise<PostResponse[]> {
    const [commentPost] = postDetails;
    const replyToId = Number(lastCommentId || postId);

    const messageId = await this.sendMessage(accessToken, commentPost, replyToId);

    if (messageId) {
      return [
        {
          id: commentPost.id,
          postId: String(messageId),
          releaseURL: `https://t.me/${
            id !== 'undefined' ? id : `c/${accessToken.replace('-100', '')}`
          }/${messageId}`,
          status: 'completed',
        },
      ];
    }

    return [];
  }

  async updateMessage(
    accessToken: string,
    messageId: string,
    postDetails: PostDetails
  ): Promise<boolean> {
    const text = this.formatTelegramText(postDetails.message || '');
    try {
      await telegramBot.editMessageText(text, {
        chat_id: accessToken,
        message_id: Number(messageId),
        parse_mode: 'HTML',
      });
      return true;
    } catch (e) {
      console.error('Error editing telegram message:', e);
      return false;
    }
  }

  private chunkMedia(media: { type: string; media: string }[], size: number) {
    const result = [];
    for (let i = 0; i < media.length; i += size) {
      result.push(media.slice(i, i + size));
    }
    return result;
  }

  async botIsAdmin(chatId: number, botId: number): Promise<boolean> {
    try {
      const chatMember = await telegramBot.getChatMember(chatId, botId);

      if (
        chatMember.status === 'administrator' ||
        chatMember.status === 'creator'
      ) {
        const permissions = chatMember.can_delete_messages;
        return !!permissions;
      }

      return false;
    } catch (error) {
      console.error('Error checking bot privileges:', error);
      return false;
    }
  }
}
