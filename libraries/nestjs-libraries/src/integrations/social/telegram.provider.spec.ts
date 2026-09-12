import { beforeEach, describe, expect, it, vi } from 'vitest';

const env = vi.hoisted(() => {
  process.env.TELEGRAM_TOKEN = 'test-bot-token';
  process.env.FRONTEND_URL = 'http://localhost:5000';
  process.env.STORAGE_PROVIDER = 'local';
});

const bot = vi.hoisted(() => ({
  getChat: vi.fn(),
  getFileLink: vi.fn(),
  getUpdates: vi.fn(),
  getMe: vi.fn(),
  getChatMember: vi.fn(),
  deleteMessage: vi.fn(),
  sendMessage: vi.fn(),
  sendPhoto: vi.fn(),
  sendVideo: vi.fn(),
  sendDocument: vi.fn(),
  sendMediaGroup: vi.fn(),
}));

vi.mock('node-telegram-bot-api', () => ({
  default: function TelegramBot(this: Record<string, unknown>) {
    return bot;
  },
}));

import { TelegramProvider } from './telegram.provider';

const provider = new TelegramProvider();
const integration = {} as never;

const post = (over: Record<string, unknown> = {}) => ({
  id: 'post-1',
  message: 'hello',
  settings: {},
  ...over,
});

const image = (path: string) => ({ type: 'image' as const, path });

beforeEach(() => {
  bot.sendMessage.mockResolvedValue({ message_id: 11 });
  bot.sendPhoto.mockResolvedValue({ message_id: 12 });
  bot.sendVideo.mockResolvedValue({ message_id: 13 });
  bot.sendDocument.mockResolvedValue({ message_id: 14 });
  bot.sendMediaGroup.mockResolvedValue([{ message_id: 15 }, { message_id: 16 }]);
});

describe('TelegramProvider identity', () => {
  it('declares the Telegram message limit', () => {
    expect(provider.maxLength()).toBe(4096);
    expect(provider.identifier).toBe('telegram');
    expect(provider.editor).toBe('html');
  });

  it('returns an empty token set on refresh, because the chat id never expires', async () => {
    await expect(provider.refreshToken('anything')).resolves.toMatchObject({
      accessToken: '',
      expiresIn: 0,
    });
  });

  it('uses the same random value as both url and state', async () => {
    const { url, state, codeVerifier } = await provider.generateAuthUrl();

    expect(url).toBe(state);
    expect(state).toHaveLength(17);
    expect(codeVerifier).toHaveLength(10);
  });
});

describe('TelegramProvider.post text handling', () => {
  it('sends a plain message as HTML and reports the public permalink', async () => {
    const [result] = await provider.post('mychannel', '-1001234', [post()]);

    expect(bot.sendMessage).toHaveBeenCalledWith('-1001234', 'hello', {
      parse_mode: 'HTML',
    });
    expect(result).toEqual({
      id: 'post-1',
      postId: '11',
      releaseURL: 'https://t.me/mychannel/11',
      status: 'completed',
    });
  });

  it('falls back to the /c/ permalink for a private channel with no username', async () => {
    // A private channel arrives with the literal string "undefined" as its id,
    // and its chat id carries a -100 prefix that is not part of the web URL.
    // Without this, every private-channel post links to ".../c/undefined/11".
    const [result] = await provider.post('undefined', '-1001234567', [post()]);

    expect(result.releaseURL).toBe('https://t.me/c/1234567/11');
  });

  it.each([
    ['<p>Hello</p>', 'Hello\n'],
    ['<strong>bold</strong>', '<b>bold</b>'],
    ['<u>under</u>', '<u>under</u>'],
    ['<script>alert(1)</script>', 'alert(1)'],
    ['<div>plain</div>', 'plain'],
    ['<a href="http://x">link</a>', 'link'],
    ['<p>a <strong>b</strong> c</p>', 'a <b>b</b> c\n'],
  ])('rewrites %s to %s', async (message, expected) => {
    await provider.post('chan', 'token', [post({ message })]);

    expect(bot.sendMessage).toHaveBeenCalledWith('token', expected, {
      parse_mode: 'HTML',
    });
  });

  it('treats a missing message as empty rather than sending "undefined"', async () => {
    await provider.post('chan', 'token', [post({ message: undefined })]);

    expect(bot.sendMessage).toHaveBeenCalledWith('token', '', {
      parse_mode: 'HTML',
    });
  });

  it('returns nothing when Telegram hands back no message id', async () => {
    bot.sendMessage.mockResolvedValue({ message_id: null });

    await expect(provider.post('chan', 'token', [post()])).resolves.toEqual([]);
  });

  it('only publishes the first post of the batch', async () => {
    await provider.post('chan', 'token', [post(), post({ id: 'post-2' })]);

    expect(bot.sendMessage).toHaveBeenCalledTimes(1);
  });
});

describe('TelegramProvider.post media routing', () => {
  it.each([
    ['photo.jpg', 'sendPhoto', 'image/jpeg', 12],
    ['clip.mp4', 'sendVideo', 'video/mp4', 13],
    ['doc.pdf', 'sendDocument', 'application/pdf', 14],
  ])('routes %s through %s', async (name, method, contentType, messageId) => {
    const [result] = await provider.post('chan', 'token', [
      post({ media: [image(`https://cdn.test/${name}`)] }),
    ]);

    expect((bot as never as Record<string, ReturnType<typeof vi.fn>>)[method]).toHaveBeenCalledWith(
      'token',
      `https://cdn.test/${name}`,
      { caption: 'hello', parse_mode: 'HTML' },
      { filename: name, contentType }
    );
    expect(result.postId).toBe(String(messageId));
  });

  it('sends an unknown extension as a document rather than failing', async () => {
    await provider.post('chan', 'token', [
      post({ media: [image('https://cdn.test/thing.qqq')] }),
    ]);

    expect(bot.sendDocument).toHaveBeenCalledWith(
      'token',
      'https://cdn.test/thing.qqq',
      expect.anything(),
      { filename: 'thing.qqq', contentType: 'application/octet-stream' }
    );
  });

  it('strips the frontend origin from a locally stored file', async () => {
    // Local storage serves media off the frontend origin, but the bot runs
    // server-side and must read the path, not fetch its own public URL.
    await provider.post('chan', 'token', [
      post({ media: [image('http://localhost:5000/uploads/a.jpg')] }),
    ]);

    expect(bot.sendPhoto).toHaveBeenCalledWith(
      'token',
      '/uploads/a.jpg',
      expect.anything(),
      { filename: 'a.jpg', contentType: 'image/jpeg' }
    );
  });

  it('leaves a remote URL alone', async () => {
    await provider.post('chan', 'token', [
      post({ media: [image('https://cdn.test/a.jpg')] }),
    ]);

    expect(bot.sendPhoto).toHaveBeenCalledWith(
      'token',
      'https://cdn.test/a.jpg',
      expect.anything(),
      expect.anything()
    );
  });

  it('sends two or more media as a group with the text as the first caption', async () => {
    const [result] = await provider.post('chan', 'token', [
      post({ media: [image('https://cdn.test/a.jpg'), image('https://cdn.test/b.jpg')] }),
    ]);

    expect(bot.sendMediaGroup).toHaveBeenCalledTimes(1);
    const [, group] = bot.sendMediaGroup.mock.calls[0];
    expect(group).toEqual([
      { type: 'photo', media: 'https://cdn.test/a.jpg', caption: 'hello', parse_mode: 'HTML' },
      { type: 'photo', media: 'https://cdn.test/b.jpg', caption: undefined, parse_mode: 'HTML' },
    ]);
    expect(result.postId).toBe('15');
  });

  it('chunks into groups of ten and captions only the very first item', async () => {
    // Telegram rejects a media group larger than ten, so eleven images must
    // become two calls - and the caption must not be repeated on the second.
    const media = Array.from({ length: 11 }, (_, i) => image(`https://cdn.test/${i}.jpg`));

    const [result] = await provider.post('chan', 'token', [post({ media })]);

    expect(bot.sendMediaGroup).toHaveBeenCalledTimes(2);
    expect(bot.sendMediaGroup.mock.calls[0][1]).toHaveLength(10);
    expect(bot.sendMediaGroup.mock.calls[1][1]).toHaveLength(1);

    const captions = bot.sendMediaGroup.mock.calls
      .flatMap(([, group]) => group as Array<{ caption?: string }>)
      .filter((m) => m.caption !== undefined);
    expect(captions).toEqual([{ ...captions[0], caption: 'hello' }]);

    expect(result.postId).toBe('15');
  });

  it('reports the message id of the first group, not the last', async () => {
    bot.sendMediaGroup
      .mockResolvedValueOnce([{ message_id: 100 }])
      .mockResolvedValueOnce([{ message_id: 200 }]);
    const media = Array.from({ length: 11 }, (_, i) => image(`https://cdn.test/${i}.jpg`));

    const [result] = await provider.post('chan', 'token', [post({ media })]);

    expect(result.postId).toBe('100');
    expect(result.releaseURL).toBe('https://t.me/chan/100');
  });
});

describe('TelegramProvider.comment', () => {
  it('replies to the root post when there is no previous comment', async () => {
    const [result] = await provider.comment(
      'chan',
      '11',
      undefined,
      'token',
      [post({ id: 'comment-1', message: 'first reply' })],
      integration
    );

    expect(bot.sendMessage).toHaveBeenCalledWith('token', 'first reply', {
      parse_mode: 'HTML',
      reply_to_message_id: 11,
    });
    expect(result).toMatchObject({ id: 'comment-1', postId: '11' });
  });

  it('chains onto the previous comment so the thread stays in order', async () => {
    await provider.comment(
      'chan',
      '11',
      '42',
      'token',
      [post({ id: 'comment-2' })],
      integration
    );

    expect(bot.sendMessage).toHaveBeenCalledWith(
      'token',
      'hello',
      expect.objectContaining({ reply_to_message_id: 42 })
    );
  });

  it('threads a media comment too', async () => {
    await provider.comment(
      'chan',
      '11',
      undefined,
      'token',
      [post({ media: [image('https://cdn.test/a.jpg')] })],
      integration
    );

    expect(bot.sendPhoto).toHaveBeenCalledWith(
      'token',
      'https://cdn.test/a.jpg',
      { caption: 'hello', parse_mode: 'HTML', reply_to_message_id: 11 },
      expect.anything()
    );
  });

  it('only sets reply_to on the first chunk of a multi-group comment', async () => {
    const media = Array.from({ length: 11 }, (_, i) => image(`https://cdn.test/${i}.jpg`));

    await provider.comment('chan', '11', undefined, 'token', [post({ media })], integration);

    expect(bot.sendMediaGroup.mock.calls[0][2]).toEqual({ reply_to_message_id: 11 });
    expect(bot.sendMediaGroup.mock.calls[1][2]).toEqual({});
  });

  it('returns nothing when the reply produced no message id', async () => {
    bot.sendMessage.mockResolvedValue({ message_id: undefined });

    await expect(
      provider.comment('chan', '11', undefined, 'token', [post()], integration)
    ).resolves.toEqual([]);
  });
});

describe('TelegramProvider.authenticate', () => {
  it('prefers the public username as the channel id', async () => {
    bot.getChat.mockResolvedValue({
      id: -1001234,
      username: 'mychannel',
      title: 'My Channel',
      photo: { big_file_id: 'file-1' },
    });
    bot.getFileLink.mockResolvedValue('https://t.me/photo.jpg');

    const result = await provider.authenticate({ code: 'mychannel', codeVerifier: 'v' });

    expect(result).toMatchObject({
      id: 'mychannel',
      username: 'mychannel',
      accessToken: '-1001234',
      name: 'My Channel',
      picture: 'https://t.me/photo.jpg',
    });
  });

  it('falls back to the numeric chat id for a private channel', async () => {
    bot.getChat.mockResolvedValue({ id: -1009876, title: 'Private' });

    const result = await provider.authenticate({ code: '-1009876', codeVerifier: 'v' });

    expect(result).toMatchObject({ id: '-1009876', accessToken: '-1009876', picture: '' });
    expect(bot.getFileLink).not.toHaveBeenCalled();
  });

  it('reports a missing chat instead of throwing', async () => {
    bot.getChat.mockResolvedValue({});

    await expect(
      provider.authenticate({ code: 'nope', codeVerifier: 'v' })
    ).resolves.toBe('No chat found');
  });

  it('issues a token that effectively never expires', async () => {
    bot.getChat.mockResolvedValue({ id: 1, title: 'T' });

    const result = await provider.authenticate({ code: '1', codeVerifier: 'v' });

    expect((result as { expiresIn: number }).expiresIn).toBeGreaterThan(
      100 * 365 * 24 * 60 * 60
    );
  });
});

describe('TelegramProvider.botIsAdmin', () => {
  it.each([
    ['administrator', true, true],
    ['creator', true, true],
    ['administrator', false, false],
    ['member', true, false],
    ['left', true, false],
  ])('for status %s with delete=%s returns %s', async (status, canDelete, expected) => {
    bot.getChatMember.mockResolvedValue({ status, can_delete_messages: canDelete });

    await expect(provider.botIsAdmin(1, 2)).resolves.toBe(expected);
  });

  it('treats an API failure as "not an admin"', async () => {
    bot.getChatMember.mockRejectedValue(new Error('forbidden'));

    await expect(provider.botIsAdmin(1, 2)).resolves.toBe(false);
  });
});

describe('TelegramProvider.getBotId', () => {
  const connect = (over: Record<string, unknown>) => ({ update_id: 5, ...over });

  it('finds the chat from a /connect message in a group', async () => {
    bot.getUpdates.mockResolvedValue([
      connect({ message: { text: '/connect word', chat: { id: 55 }, message_id: 7 } }),
    ]);
    bot.getMe.mockResolvedValue({ id: 99 });
    bot.getChatMember.mockResolvedValue({ status: 'administrator', can_delete_messages: true });

    await expect(provider.getBotId({ word: 'word' })).resolves.toEqual({ chatId: 55 });
    expect(bot.getUpdates).toHaveBeenCalledWith({
      allowed_updates: ['message', 'channel_post'],
    });
  });

  it('finds the chat from a /connect channel post', async () => {
    bot.getUpdates.mockResolvedValue([
      connect({ channel_post: { text: '/connect word', chat: { id: 66 }, message_id: 8 } }),
    ]);
    bot.getMe.mockResolvedValue({ id: 99 });
    bot.getChatMember.mockResolvedValue({ status: 'creator', can_delete_messages: true });

    await expect(provider.getBotId({ word: 'word' })).resolves.toEqual({ chatId: 66 });
  });

  it('passes the offset through so updates are not replayed', async () => {
    bot.getUpdates.mockResolvedValue([]);

    await provider.getBotId({ id: 12, word: 'word' });

    expect(bot.getUpdates).toHaveBeenCalledWith({
      offset: 12,
      allowed_updates: ['message', 'channel_post'],
    });
  });

  it('returns the next offset when nothing matched, so polling advances', async () => {
    bot.getUpdates.mockResolvedValue([connect({ update_id: 41, message: { text: 'hi' } })]);

    await expect(provider.getBotId({ word: 'word' })).resolves.toEqual({
      lastChatId: 42,
    });
  });

  it('returns an empty object when there are no updates at all', async () => {
    bot.getUpdates.mockResolvedValue([]);

    await expect(provider.getBotId({ word: 'word' })).resolves.toEqual({});
  });

  it('does not match a /connect for a different word', async () => {
    bot.getUpdates.mockResolvedValue([
      connect({ update_id: 70, message: { text: '/connect other', chat: { id: 55 } } }),
    ]);

    await expect(provider.getBotId({ word: 'word' })).resolves.toEqual({
      lastChatId: 71,
    });
    expect(bot.getMe).not.toHaveBeenCalled();
  });

  it('tidies up the connect message when it has permission', async () => {
    bot.getUpdates.mockResolvedValue([
      connect({ message: { text: '/connect word', chat: { id: 55 }, message_id: 7 } }),
    ]);
    bot.getMe.mockResolvedValue({ id: 99 });
    bot.getChatMember.mockResolvedValue({ status: 'administrator', can_delete_messages: true });

    await provider.getBotId({ word: 'word' });

    expect(bot.deleteMessage).toHaveBeenCalledWith(55, 7);
    expect(bot.sendMessage).toHaveBeenCalledWith(
      55,
      expect.stringContaining('deleted in 10 seconds')
    );
  });

  it('explains itself instead of deleting when it is not an admin', async () => {
    bot.getUpdates.mockResolvedValue([
      connect({ message: { text: '/connect word', chat: { id: 55 }, message_id: 7 } }),
    ]);
    bot.getMe.mockResolvedValue({ id: 99 });
    bot.getChatMember.mockResolvedValue({ status: 'member' });

    await provider.getBotId({ word: 'word' });

    expect(bot.deleteMessage).not.toHaveBeenCalled();
    expect(bot.sendMessage).toHaveBeenCalledWith(
      55,
      expect.stringContaining("don't have admin privileges")
    );
  });
});
