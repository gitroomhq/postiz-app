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
  identifier = 'telegram';
  name = 'Telegram';
  isBetweenSteps = false;
  isWeb3 = true;
  scopes = [] as string[];
  editor = 'html' as const;

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

    console.log(JSON.stringify(chat));
    if (!chat?.id) {
      return 'No chat found';
    }

    const photo = !chat?.photo?.big_file_id
      ? ''
      : await telegramBot.getFileLink(chat.photo.big_file_id);

    // Modified id to work with chat.username (public groups/channels) or chat.id (private groups/channels) when chat.username is not available
    return {
      id: String(chat.username ? chat.username : chat.id),
      name: chat.title!,
      accessToken: String(chat.id),
      refreshToken: '',
      expiresIn: dayjs().add(200, 'year').unix() - dayjs().unix(),
      picture: photo,
      username: chat.username!,
    };
  }

  async getBotId(query: { id?: number; word: string }) {
    // Added allowed_updates Ensure only necessary updates are fetched
    const res = await telegramBot.getUpdates({
      ...(query.id ? { offset: query.id } : {}),
      allowed_updates: ['message', 'channel_post'],
    });
    //message.text is for groups, channel_post.text is for channels
    const match = res.find(
      (p) =>
        (p?.message?.text === `/connect ${query.word}` &&
          p?.message?.chat?.id) ||
        (p?.channel_post?.text === `/connect ${query.word}` &&
          p?.channel_post?.chat?.id)
    );
    // get correct chatId based on the channel type
    const chatId = match?.message?.chat?.id || match?.channel_post?.chat?.id;

    // prevents the code from running while chatId is still undefined to avoid the error 'ETELEGRAM: 400 Bad Request: chat_id is empty'. the code would still work eventually but console spam is not pretty
    if (chatId) {
      //get the numberic ID of the bot
      const botId = (await telegramBot.getMe()).id;
      // check if the bot is an admin in the chat
      const isAdmin = await this.botIsAdmin(chatId, botId);
      // get the messageId of the message that triggered the connection
      const connectMessageId =
        match?.message?.message_id || match?.channel_post?.message_id;

      if (!isAdmin) {
        // alternatively you can replace this with a console.log if you do not want to inform the user of the bot's admin status
        telegramBot.sendMessage(
          chatId,
          "Connection Successful. I don't have admin privileges to delete these messages, please go ahead and remove them yourself."
        );
      } else {
        // Delete the message that triggered the connection
        await telegramBot.deleteMessage(chatId, connectMessageId);
        // Send success message to the chat
        const successMessage = await telegramBot.sendMessage(
          chatId,
          'Connection Successful. Message will be deleted in 10 seconds.'
        );
        // Delete the success message after 10 seconds
        setTimeout(async () => {
          await telegramBot.deleteMessage(chatId, successMessage.message_id);
          console.log('Success message deleted.');
        }, 10000);
      }
    }

    // modified lastChatId to work with any type of channel (private/public groups/channels)
    return chatId
      ? { chatId }
      : res.length > 0
      ? {
          lastChatId:
            res?.[res.length - 1]?.message?.chat?.id ||
            res?.[res.length - 1]?.channel_post?.chat?.id,
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
      let messageId: number | null = null;
      const mediaFiles = message.media || [];
      const text = striptags(message.message || '', [
        'u',
        'strong',
        'p',
      ])
        .replace(/<strong>/g, '<b>')
        .replace(/<\/strong>/g, '</b>')
        .replace(/<p>(.*?)<\/p>/g, '$1\n')
      // check if media is local to modify url
      const processedMedia = mediaFiles.map((media) => {
        let mediaUrl = media.path;
        if (mediaStorage === 'local' && mediaUrl.startsWith(frontendURL)) {
          mediaUrl = mediaUrl.replace(frontendURL, '');
        }
        //get mime type to pass contentType to telegram api.
        //some photos and videos might not pass telegram api restrictions, so they are sent as documents instead of returning errors
        const mimeType = mime.getType(mediaUrl); // Detect MIME type
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
      // if there's no media, bot sends a text message only
      if (processedMedia.length === 0) {
        const response = await telegramBot.sendMessage(accessToken, text, {
          parse_mode: 'HTML',
        });
        messageId = response.message_id;
      }
      // if there's only one media, bot sends the media with the text message as caption
      else if (processedMedia.length === 1) {
        const media = processedMedia[0];
        const response =
          media.type === 'video'
            ? await telegramBot.sendVideo(
                accessToken,
                media.media,
                { caption: text, parse_mode: 'HTML' },
                media.fileOptions
              )
            : media.type === 'photo'
            ? await telegramBot.sendPhoto(
                accessToken,
                media.media,
                { caption: text, parse_mode: 'HTML' },
                media.fileOptions
              )
            : await telegramBot.sendDocument(
                accessToken,
                media.media,
                { caption: text, parse_mode: 'HTML' },
                media.fileOptions
              );
        messageId = response.message_id;
      }
      // if there are multiple media, bot sends them as a media group - max 10 media per group - with the text as a caption (if there are more than 1 group, the caption will only be sent with the first group)
      else {
        const mediaGroups = this.chunkMedia(processedMedia, 10);
        for (let i = 0; i < mediaGroups.length; i++) {
          const mediaGroup = mediaGroups[i].map((m, index) => ({
            type: m.type === 'document' ? 'document' : m.type, // Documents are not allowed in media groups
            media: m.media,
            caption: i === 0 && index === 0 ? text : undefined,
            parse_mode: 'HTML',
          }));

          const response = await telegramBot.sendMediaGroup(
            accessToken,
            mediaGroup as any[]
          );
          if (i === 0) {
            messageId = response[0].message_id;
          }
        }
      }
      // for private groups/channels message.id is undefined so the link generated by Postiz will be unusable "https://t.me/c/undefined/16"
      // to avoid that, we use accessToken instead of message.id and we generate the link manually removing the -100 from the start.
      if (messageId) {
        ids.push({
          id: message.id,
          postId: String(messageId),
          releaseURL: `https://t.me/${
            id !== 'undefined' ? id : `c/${accessToken.replace('-100', '')}`
          }/${messageId}`,
          status: 'completed',
        });
      }
    }

    return ids;
  }
  // chunkMedia is used to split media into groups of "size". 10 is used here because telegram api allows a maximum of 10 media per group
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
        return !!permissions; // Return true if bot can delete messages
      }

      return false;
    } catch (error) {
      console.error('Error checking bot privileges:', error);
      return false;
    }
  }
}
