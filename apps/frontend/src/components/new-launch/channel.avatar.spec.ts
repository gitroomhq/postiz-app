import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  channelPlatformIcon,
  isUsableChannelPicture,
} from './channel-picture.ts';

const source = readFileSync(
  fileURLToPath(new URL('./channel.avatar.tsx', import.meta.url)),
  'utf8'
);
const selectCurrent = readFileSync(
  fileURLToPath(new URL('./select.current.tsx', import.meta.url)),
  'utf8'
);
const picks = readFileSync(
  fileURLToPath(new URL('./picks.socials.component.tsx', import.meta.url)),
  'utf8'
);
const providers = readFileSync(
  fileURLToPath(
    new URL('./providers/show.all.providers.tsx', import.meta.url)
  ),
  'utf8'
);

describe('channel avatar fallback', () => {
  it('treats missing and placeholder pictures as unusable', () => {
    assert.equal(isUsableChannelPicture(undefined), false);
    assert.equal(isUsableChannelPicture(null), false);
    assert.equal(isUsableChannelPicture(''), false);
    assert.equal(isUsableChannelPicture('/no-picture.jpg'), false);
    assert.equal(isUsableChannelPicture('  /no-picture.jpg  '), false);
    assert.equal(
      isUsableChannelPicture('https://cdn.example/uploads/no-picture.jpg'),
      false
    );
    assert.equal(
      isUsableChannelPicture('https://cdn.example/pic.jpg'),
      true
    );
  });

  it('uses the YouTube svg and pngs for every other network', () => {
    assert.equal(
      channelPlatformIcon('youtube'),
      '/icons/platforms/youtube.svg'
    );
    assert.equal(
      channelPlatformIcon('instagram'),
      '/icons/platforms/instagram.png'
    );
  });

  it('is the composer chip face instead of a gray no-picture tile', () => {
    assert.match(source, /object-contain/);
    assert.match(selectCurrent, /<ChannelAvatar/);
    assert.match(picks, /<ChannelAvatar/);
    assert.match(providers, /<ChannelAvatar/);
    assert.doesNotMatch(selectCurrent, /fallbackSrc="\/no-picture\.jpg"/);
    assert.doesNotMatch(picks, /fallbackSrc="\/no-picture\.jpg"/);
  });
});
