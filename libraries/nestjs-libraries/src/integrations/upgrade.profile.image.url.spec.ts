import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  upgradeProfileImageUrl,
  youtubeChannelPictureUrl,
} from './upgrade.profile.image.url.ts';

describe('upgradeProfileImageUrl', () => {
  it('returns empty for missing values', () => {
    assert.equal(upgradeProfileImageUrl(undefined), '');
    assert.equal(upgradeProfileImageUrl(null), '');
    assert.equal(upgradeProfileImageUrl(''), '');
  });

  it('upgrades X _normal / _bigger / _mini to _400x400', () => {
    assert.equal(
      upgradeProfileImageUrl(
        'https://pbs.twimg.com/profile_images/1/abc_normal.jpg'
      ),
      'https://pbs.twimg.com/profile_images/1/abc_400x400.jpg'
    );
    assert.equal(
      upgradeProfileImageUrl(
        'https://pbs.twimg.com/profile_images/1/abc_bigger.png'
      ),
      'https://pbs.twimg.com/profile_images/1/abc_400x400.png'
    );
    assert.equal(
      upgradeProfileImageUrl(
        'https://abs.twimg.com/sticky/default_profile_images/default_profile_normal.png'
      ),
      'https://abs.twimg.com/sticky/default_profile_images/default_profile_400x400.png'
    );
    assert.equal(
      upgradeProfileImageUrl(
        'https://pbs.twimg.com/profile_images/1/abc_mini.jpg'
      ),
      'https://pbs.twimg.com/profile_images/1/abc_400x400.jpg'
    );
  });

  it('upgrades the X name= query variant and leaves originals alone', () => {
    assert.equal(
      upgradeProfileImageUrl(
        'https://pbs.twimg.com/profile_images/1/abc.jpg?format=jpg&name=normal'
      ),
      'https://pbs.twimg.com/profile_images/1/abc.jpg?format=jpg&name=400x400'
    );
    assert.equal(
      upgradeProfileImageUrl(
        'https://pbs.twimg.com/profile_images/1/abc_400x400.jpg'
      ),
      'https://pbs.twimg.com/profile_images/1/abc_400x400.jpg'
    );
    assert.equal(
      upgradeProfileImageUrl('https://pbs.twimg.com/profile_images/1/abc.jpg'),
      'https://pbs.twimg.com/profile_images/1/abc.jpg'
    );
  });

  it('upgrades Google userinfo s96-c (and other small sNN-c) to s400-c', () => {
    assert.equal(
      upgradeProfileImageUrl(
        'https://lh3.googleusercontent.com/a/ACg8ocExample=s96-c'
      ),
      'https://lh3.googleusercontent.com/a/ACg8ocExample=s400-c'
    );
    assert.equal(
      upgradeProfileImageUrl(
        'https://lh3.googleusercontent.com/a/ACg8ocExample=s96-c-rp-mo'
      ),
      'https://lh3.googleusercontent.com/a/ACg8ocExample=s400-c-rp-mo'
    );
    assert.equal(
      upgradeProfileImageUrl(
        'https://lh3.googleusercontent.com/a/ACg8ocExample=s400-c'
      ),
      'https://lh3.googleusercontent.com/a/ACg8ocExample=s400-c'
    );
  });

  it('does not invent params on signed or unrelated CDNs', () => {
    const tiktok =
      'https://p16-sign-va.tiktokcdn.com/tos-maliva-avt-0068/abc~c5_100x100.jpeg?x-expires=1&x-signature=abc';
    const facebook =
      'https://platform-lookaside.fbsbx.com/platform/profilepic/?asid=1&height=50&width=50&ext=1';
    const linkedin =
      'https://media.licdn.com/dms/image/v2/D4E03AQF/profile-displayphoto-shrink_100_100/0/1';
    const other = 'https://example.com/avatar_normal.jpg';

    assert.equal(upgradeProfileImageUrl(tiktok), tiktok);
    assert.equal(upgradeProfileImageUrl(facebook), facebook);
    assert.equal(upgradeProfileImageUrl(linkedin), linkedin);
    assert.equal(upgradeProfileImageUrl(other), other);
  });
});

describe('youtubeChannelPictureUrl', () => {
  it('prefers high, then medium, then default', () => {
    assert.equal(
      youtubeChannelPictureUrl({
        default: { url: 'https://yt3.ggpht.com/d=s88' },
        medium: { url: 'https://yt3.ggpht.com/m=s240' },
        high: { url: 'https://yt3.ggpht.com/h=s800' },
      }),
      'https://yt3.ggpht.com/h=s800'
    );
    assert.equal(
      youtubeChannelPictureUrl({
        default: { url: 'https://yt3.ggpht.com/d=s88' },
        medium: { url: 'https://yt3.ggpht.com/m=s240' },
      }),
      'https://yt3.ggpht.com/m=s240'
    );
    assert.equal(
      youtubeChannelPictureUrl({
        default: { url: 'https://yt3.ggpht.com/d=s88' },
      }),
      'https://yt3.ggpht.com/d=s88'
    );
    assert.equal(youtubeChannelPictureUrl(undefined), '');
  });
});
