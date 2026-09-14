import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { splitNotificationContent } from './notification.look.ts';

describe('splitNotificationContent', () => {
  it('pulls the live URL off a published-post message', () => {
    const split = splitNotificationContent(
      'Your post has been published on Facebook at https://facebook.com/123'
    );
    assert.equal(split.kind, 'success');
    assert.equal(split.url, 'https://facebook.com/123');
    assert.equal(split.text, 'Your post has been published on Facebook');
  });

  it('marks a publish failure without inventing a link', () => {
    const split = splitNotificationContent(
      "We couldn't publish your post to RedSim: token expired. Open the post on your calendar to see the details."
    );
    assert.equal(split.kind, 'fail');
    assert.equal(split.url, null);
    assert.match(split.text, /couldn['’]t publish/);
  });

  it('strips trailing punctuation from a URL', () => {
    const split = splitNotificationContent(
      'Your post has been published on Instagram at https://instagram.com/p/abc.'
    );
    assert.equal(split.url, 'https://instagram.com/p/abc');
  });
});
