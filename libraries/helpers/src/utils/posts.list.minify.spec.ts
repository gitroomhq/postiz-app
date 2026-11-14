import { describe, expect, it } from 'vitest';
import {
  expandPosts,
  expandPostsList,
  minifyPosts,
  minifyPostsList,
} from './posts.list.minify';

// The backend minifies and the frontend expands, so a key map that drifts on
// one side silently empties the calendar for everyone.
const post = () => ({
  id: 'post-1',
  content: 'hello',
  publishDate: '2026-01-01T00:00:00.000Z',
  releaseURL: 'https://mastodon.test/statuses/1',
  state: 'PUBLISHED',
  group: 'group-1',
  intervalInDays: 0,
  integration: {
    id: 'integration-1',
    providerIdentifier: 'mastodon',
    name: 'Test Mastodon',
    picture: 'https://mastodon.test/avatar.png',
  },
  tags: [
    {
      tag: {
        id: 'tag-1',
        name: 'launch',
        color: '#fff',
        orgId: 'org-1',
      },
    },
  ],
});

describe('posts list minification', () => {
  it('round-trips a paginated list', () => {
    const data = { posts: [post()], total: 1, page: 1, limit: 10, hasMore: false };

    expect(expandPostsList(minifyPostsList(data))).toEqual(data);
  });

  it('round-trips the calendar shape', () => {
    const data = { posts: [post(), post()] };

    expect(expandPosts(minifyPosts(data))).toEqual(data);
  });

  it('actually shortens the payload', () => {
    const data = { posts: [post()], total: 1, page: 1, limit: 10, hasMore: false };

    expect(JSON.stringify(minifyPostsList(data)).length).toBeLessThan(
      JSON.stringify(data).length
    );
  });

  it('round-trips a post with no integration and no tags', () => {
    const data = {
      posts: [{ id: 'post-1', content: 'bare' }],
      total: 1,
      page: 1,
      limit: 10,
      hasMore: false,
    };

    expect(expandPostsList(minifyPostsList(data))).toEqual(data);
  });

  it('passes unmapped keys through untouched', () => {
    const data = {
      posts: [{ id: 'post-1', somethingNew: 'kept' }],
      total: 1,
      page: 1,
      limit: 10,
      hasMore: false,
    };

    expect(expandPostsList(minifyPostsList(data)).posts[0].somethingNew).toBe('kept');
  });

  it('keeps the nested key maps separate despite colliding short keys', () => {
    // POST_ITEM_KEYS.id and INTEGRATION_KEYS.id are both 'i', and
    // POST_ITEM_KEYS.integration is 'n' while INTEGRATION_KEYS.name is also
    // 'n'. The maps are level-scoped, so values that happen to look like short
    // keys must still survive.
    const data = {
      posts: [{ id: 'i', content: 'n', integration: { id: 'n', name: 'i' } }],
      total: 1,
      page: 1,
      limit: 10,
      hasMore: false,
    };

    expect(expandPostsList(minifyPostsList(data))).toEqual(data);
  });

  it('expands an empty payload to an empty list', () => {
    expect(expandPostsList({})).toEqual({ posts: [] });
  });
});
