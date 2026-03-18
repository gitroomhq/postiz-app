import { __awaiter } from "tslib";
import { makeId } from "../../services/make.is";
import dayjs from 'dayjs';
import { SocialAbstract } from "../social.abstract";
//@ts-ignore
import mime from 'mime';
import TelegramBot from 'node-telegram-bot-api';
import striptags from 'striptags';
const telegramBot = new TelegramBot(process.env.TELEGRAM_TOKEN);
// Added to support local storage posting
const frontendURL = process.env.FRONTEND_URL || 'http://localhost:5000';
const mediaStorage = process.env.STORAGE_PROVIDER || 'local';
export class TelegramProvider extends SocialAbstract {
    constructor() {
        super(...arguments);
        this.maxConcurrentJob = 3; // Telegram has moderate bot API limits
        this.identifier = 'telegram';
        this.name = 'Telegram';
        this.isBetweenSteps = false;
        this.isWeb3 = true;
        this.scopes = [];
        this.editor = 'html';
    }
    maxLength() {
        return 4096;
    }
    refreshToken(refresh_token) {
        return __awaiter(this, void 0, void 0, function* () {
            return {
                refreshToken: '',
                expiresIn: 0,
                accessToken: '',
                id: '',
                name: '',
                picture: '',
                username: '',
            };
        });
    }
    generateAuthUrl() {
        return __awaiter(this, void 0, void 0, function* () {
            const state = makeId(17);
            return {
                url: state,
                codeVerifier: makeId(10),
                state,
            };
        });
    }
    authenticate(params) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const chat = yield telegramBot.getChat(params.code);
            console.log(JSON.stringify(chat));
            if (!(chat === null || chat === void 0 ? void 0 : chat.id)) {
                return 'No chat found';
            }
            const photo = !((_a = chat === null || chat === void 0 ? void 0 : chat.photo) === null || _a === void 0 ? void 0 : _a.big_file_id)
                ? ''
                : yield telegramBot.getFileLink(chat.photo.big_file_id);
            // Modified id to work with chat.username (public groups/channels) or chat.id (private groups/channels) when chat.username is not available
            return {
                id: String(chat.username ? chat.username : chat.id),
                name: chat.title,
                accessToken: String(chat.id),
                refreshToken: '',
                expiresIn: dayjs().add(200, 'year').unix() - dayjs().unix(),
                picture: photo || '',
                username: chat.username,
            };
        });
    }
    getBotId(query) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e, _f;
            // Added allowed_updates Ensure only necessary updates are fetched
            const res = yield telegramBot.getUpdates(Object.assign(Object.assign({}, (query.id ? { offset: query.id } : {})), { allowed_updates: ['message', 'channel_post'] }));
            //message.text is for groups, channel_post.text is for channels
            const match = res.find((p) => {
                var _a, _b, _c, _d, _e, _f;
                return (((_a = p === null || p === void 0 ? void 0 : p.message) === null || _a === void 0 ? void 0 : _a.text) === `/connect ${query.word}` &&
                    ((_c = (_b = p === null || p === void 0 ? void 0 : p.message) === null || _b === void 0 ? void 0 : _b.chat) === null || _c === void 0 ? void 0 : _c.id)) ||
                    (((_d = p === null || p === void 0 ? void 0 : p.channel_post) === null || _d === void 0 ? void 0 : _d.text) === `/connect ${query.word}` &&
                        ((_f = (_e = p === null || p === void 0 ? void 0 : p.channel_post) === null || _e === void 0 ? void 0 : _e.chat) === null || _f === void 0 ? void 0 : _f.id));
            });
            // get correct chatId based on the channel type
            const chatId = ((_b = (_a = match === null || match === void 0 ? void 0 : match.message) === null || _a === void 0 ? void 0 : _a.chat) === null || _b === void 0 ? void 0 : _b.id) || ((_d = (_c = match === null || match === void 0 ? void 0 : match.channel_post) === null || _c === void 0 ? void 0 : _c.chat) === null || _d === void 0 ? void 0 : _d.id);
            // prevents the code from running while chatId is still undefined to avoid the error 'ETELEGRAM: 400 Bad Request: chat_id is empty'. the code would still work eventually but console spam is not pretty
            if (chatId) {
                //get the numberic ID of the bot
                const botId = (yield telegramBot.getMe()).id;
                // check if the bot is an admin in the chat
                const isAdmin = yield this.botIsAdmin(chatId, botId);
                // get the messageId of the message that triggered the connection
                const connectMessageId = ((_e = match === null || match === void 0 ? void 0 : match.message) === null || _e === void 0 ? void 0 : _e.message_id) || ((_f = match === null || match === void 0 ? void 0 : match.channel_post) === null || _f === void 0 ? void 0 : _f.message_id);
                if (!isAdmin) {
                    // alternatively you can replace this with a console.log if you do not want to inform the user of the bot's admin status
                    telegramBot.sendMessage(chatId, "Connection Successful. I don't have admin privileges to delete these messages, please go ahead and remove them yourself.");
                }
                else {
                    // Delete the message that triggered the connection
                    yield telegramBot.deleteMessage(chatId, connectMessageId);
                    // Send success message to the chat
                    const successMessage = yield telegramBot.sendMessage(chatId, 'Connection Successful. Message will be deleted in 10 seconds.');
                    // Delete the success message after 10 seconds
                    setTimeout(() => __awaiter(this, void 0, void 0, function* () {
                        yield telegramBot.deleteMessage(chatId, successMessage.message_id);
                        console.log('Success message deleted.');
                    }), 10000);
                }
            }
            // modified lastChatId to work with any type of channel (private/public groups/channels)
            return chatId
                ? { chatId }
                : res.length > 0
                    ? {
                        lastChatId: res[res.length - 1].update_id + 1,
                    }
                    : {};
        });
    }
    processMedia(mediaFiles) {
        return (mediaFiles || []).map((media) => {
            let mediaUrl = media.path;
            if (mediaStorage === 'local' && mediaUrl.startsWith(frontendURL)) {
                mediaUrl = mediaUrl.replace(frontendURL, '');
            }
            //get mime type to pass contentType to telegram api.
            //some photos and videos might not pass telegram api restrictions, so they are sent as documents instead of returning errors
            const mimeType = mime.getType(mediaUrl); // Detect MIME type
            let mediaType;
            if (mimeType === null || mimeType === void 0 ? void 0 : mimeType.startsWith('image/')) {
                mediaType = 'photo';
            }
            else if (mimeType === null || mimeType === void 0 ? void 0 : mimeType.startsWith('video/')) {
                mediaType = 'video';
            }
            else {
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
    sendMessage(accessToken, message, replyToMessageId) {
        return __awaiter(this, void 0, void 0, function* () {
            let messageId = null;
            const mediaFiles = message.media || [];
            const text = striptags(message.message || '', ['u', 'strong', 'p'])
                .replace(/<strong>/g, '<b>')
                .replace(/<\/strong>/g, '</b>')
                .replace(/<p>(.*?)<\/p>/g, '$1\n');
            console.log(text);
            const processedMedia = this.processMedia(mediaFiles);
            // if there's no media, bot sends a text message only
            if (processedMedia.length === 0) {
                const response = yield telegramBot.sendMessage(accessToken, text, Object.assign({ parse_mode: 'HTML' }, (replyToMessageId ? { reply_to_message_id: replyToMessageId } : {})));
                messageId = response.message_id;
            }
            // if there's only one media, bot sends the media with the text message as caption
            else if (processedMedia.length === 1) {
                const media = processedMedia[0];
                const options = Object.assign({ caption: text, parse_mode: 'HTML' }, (replyToMessageId ? { reply_to_message_id: replyToMessageId } : {}));
                const response = media.type === 'video'
                    ? yield telegramBot.sendVideo(accessToken, media.media, options, media.fileOptions)
                    : media.type === 'photo'
                        ? yield telegramBot.sendPhoto(accessToken, media.media, options, media.fileOptions)
                        : yield telegramBot.sendDocument(accessToken, media.media, options, media.fileOptions);
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
                    const response = yield telegramBot.sendMediaGroup(accessToken, mediaGroup, Object.assign({}, (replyToMessageId && i === 0
                        ? { reply_to_message_id: replyToMessageId }
                        : {})));
                    if (i === 0) {
                        messageId = response[0].message_id;
                    }
                }
            }
            return messageId;
        });
    }
    post(id, accessToken, postDetails) {
        return __awaiter(this, void 0, void 0, function* () {
            const [firstPost] = postDetails;
            const messageId = yield this.sendMessage(accessToken, firstPost);
            // for private groups/channels message.id is undefined so the link generated by Postiz will be unusable "https://t.me/c/undefined/16"
            // to avoid that, we use accessToken instead of message.id and we generate the link manually removing the -100 from the start.
            if (messageId) {
                return [
                    {
                        id: firstPost.id,
                        postId: String(messageId),
                        releaseURL: `https://t.me/${id !== 'undefined' ? id : `c/${accessToken.replace('-100', '')}`}/${messageId}`,
                        status: 'completed',
                    },
                ];
            }
            return [];
        });
    }
    comment(id, postId, lastCommentId, accessToken, postDetails, integration) {
        return __awaiter(this, void 0, void 0, function* () {
            const [commentPost] = postDetails;
            const replyToId = Number(lastCommentId || postId);
            const messageId = yield this.sendMessage(accessToken, commentPost, replyToId);
            if (messageId) {
                return [
                    {
                        id: commentPost.id,
                        postId: String(messageId),
                        releaseURL: `https://t.me/${id !== 'undefined' ? id : `c/${accessToken.replace('-100', '')}`}/${messageId}`,
                        status: 'completed',
                    },
                ];
            }
            return [];
        });
    }
    // chunkMedia is used to split media into groups of "size". 10 is used here because telegram api allows a maximum of 10 media per group
    chunkMedia(media, size) {
        const result = [];
        for (let i = 0; i < media.length; i += size) {
            result.push(media.slice(i, i + size));
        }
        return result;
    }
    botIsAdmin(chatId, botId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const chatMember = yield telegramBot.getChatMember(chatId, botId);
                if (chatMember.status === 'administrator' ||
                    chatMember.status === 'creator') {
                    const permissions = chatMember.can_delete_messages;
                    return !!permissions; // Return true if bot can delete messages
                }
                return false;
            }
            catch (error) {
                console.error('Error checking bot privileges:', error);
                return false;
            }
        });
    }
}
//# sourceMappingURL=telegram.provider.js.map