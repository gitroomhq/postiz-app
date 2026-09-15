import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { splitNotificationContent } from './notification.look.ts';

describe('splitNotificationContent', () => {
  it('pulls the live URL off a published-post message', () => {
    const split = splitNotificationContent(
      'Your post has been published on Facebook at https://facebook.com/123'
    );
    assert.equal(split.kind, 'success');
    assert.equal(split.action, 'view_post');
    assert.equal(split.external, true);
    assert.equal(split.url, 'https://facebook.com/123');
    assert.equal(split.text, 'Your post has been published on Facebook');
  });

  it('marks a publish failure without inventing a link', () => {
    const split = splitNotificationContent(
      "We couldn't publish your post to RedSim: token expired. Open the post on your calendar to see the details."
    );
    assert.equal(split.kind, 'fail');
    assert.equal(split.action, 'open_calendar');
    assert.equal(split.external, false);
    assert.equal(split.url, '/launches');
    assert.match(split.text, /couldn['’]t publish/);
  });

  it('strips trailing punctuation from a URL', () => {
    const split = splitNotificationContent(
      'Your post has been published on Instagram at https://instagram.com/p/abc.'
    );
    assert.equal(split.url, 'https://instagram.com/p/abc');
  });

  it('rewrites a YouTube refresh error that pointed at Calendar as Reconnect', () => {
    const split = splitNotificationContent(
      'Could not refresh your youtube channel . Please go back to the system and connect it again https://app.postqueen.ai/launches'
    );
    assert.equal(split.kind, 'warning');
    assert.equal(split.action, 'reconnect');
    assert.equal(split.external, false);
    assert.equal(split.url, '/channels?channel=youtube');
    assert.equal(
      split.text,
      'Could not refresh your YouTube channel. Reconnect it to keep publishing.'
    );
    assert.doesNotMatch(split.text, /launches/);
    assert.doesNotMatch(split.text, /channel \./);
  });

  it('uses a stored Channels focus link for a new refresh error', () => {
    const split = splitNotificationContent(
      'Could not refresh your YouTube channel. Reconnect it to keep publishing.',
      '/channels?channel=youtube&focus=yt-row-1'
    );
    assert.equal(split.kind, 'warning');
    assert.equal(split.action, 'reconnect');
    assert.equal(split.url, '/channels?channel=youtube&focus=yt-row-1');
    assert.equal(split.external, false);
  });

  it('sends a reconnect-needed publish failure to Channels', () => {
    const split = splitNotificationContent(
      "We couldn't post to youtube for My Channel because you need to reconnect it. Please enable it and try again."
    );
    assert.equal(split.kind, 'warning');
    assert.equal(split.action, 'reconnect');
    assert.equal(split.url, '/channels?channel=youtube');
  });

  it('sends an unfinished connect to Open channel', () => {
    const split = splitNotificationContent(
      "We couldn't post to youtube for My Channel because connecting it was never finished. Open the channel to finish connecting it, then try again."
    );
    assert.equal(split.kind, 'warning');
    assert.equal(split.action, 'open_channel');
    assert.equal(split.url, '/channels?channel=youtube');
  });

  it('sends payment failures to Billing', () => {
    const split = splitNotificationContent(
      "We could not charge your card for PostQueen. Update your payment method from Billing and we'll try again — nothing is cancelled yet."
    );
    assert.equal(split.kind, 'warning');
    assert.equal(split.action, 'open_billing');
    assert.equal(split.url, '/billing');
  });

  it('sends a lapsed-subscription miss to Billing', () => {
    const split = splitNotificationContent(
      'Your post to My Channel was not published because your subscription is no longer active. Renew it from Billing, then reschedule the post from your calendar.'
    );
    assert.equal(split.kind, 'warning');
    assert.equal(split.action, 'open_billing');
    assert.equal(split.url, '/billing');
  });

  it('sends a plan-downgrade notice to Billing', () => {
    const split = splitNotificationContent(
      'Your plan now allows fewer channels, so YouTube was switched off and will not publish. Upgrade, or remove another channel, to turn it back on.'
    );
    assert.equal(split.kind, 'warning');
    assert.equal(split.action, 'open_billing');
    assert.equal(split.url, '/billing');
  });

  it('does not treat a published-post URL as Open link', () => {
    const split = splitNotificationContent(
      'Your post has been published on X at https://x.com/user/status/1'
    );
    assert.equal(split.action, 'view_post');
    assert.notEqual(split.action, 'open_link');
  });

  it('does not invent View post when publish text has only an app URL', () => {
    const split = splitNotificationContent(
      'Your post has been published on Facebook at https://app.postqueen.ai/launches'
    );
    assert.equal(split.action, null);
    assert.equal(split.url, null);
  });
});
