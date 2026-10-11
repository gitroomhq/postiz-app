import {
  enrichWebhookTestPayload,
  shapeWebhookPosts,
} from './webhook.payload';

describe('shapeWebhookPosts', () => {
  it('parses image and settings JSON strings into objects', () => {
    const [post] = shapeWebhookPosts([
      {
        id: 'cmv3hqb2g0003o97o6myva21v',
        content: '<p>test</p>',
        image:
          '[{"id":"vid-1","path":"https://postiz.londonparkour.com/uploads/video.mp4"}]',
        settings:
          '{"__type":"youtube","title":"Parkour video","type":"public"}',
        publishDate: new Date('2026-10-11T07:17:00.000Z'),
        releaseURL: 'https://www.youtube.com/watch?v=VBlkPXbxId4',
        state: 'PUBLISHED',
      },
    ]);

    expect(post.content).toBe('<p>test</p>');
    expect(post.image).toEqual([
      {
        id: 'vid-1',
        path: 'https://postiz.londonparkour.com/uploads/video.mp4',
      },
    ]);
    expect(post.settings).toEqual({
      __type: 'youtube',
      title: 'Parkour video',
      type: 'public',
    });
  });

  it('falls back to empty image array and settings object', () => {
    const [post] = shapeWebhookPosts([
      {
        id: 'empty',
        content: 'hello',
        image: null,
        settings: 'not-json',
      },
    ]);

    expect(post.image).toEqual([]);
    expect(post.settings).toEqual({});
  });
});

describe('enrichWebhookTestPayload', () => {
  it('adds image and settings when Send Test omits them', () => {
    const [post] = enrichWebhookTestPayload([
      {
        id: 'cm6tcts4f0005qcwit25cis26',
        content: 'This is the first post to instagram',
        publishDate: '2025-02-06T13:09:00.000Z',
        releaseURL: 'https://facebook.com/release/release',
        state: 'PUBLISHED',
      },
    ]) as Record<string, unknown>[];

    expect(Array.isArray(post.image)).toBe(true);
    expect((post.image as { path: string }[])[0].path).toContain('http');
    expect(post.settings).toEqual(
      expect.objectContaining({
        __type: expect.any(String),
      })
    );
    expect(post.content).toBe('This is the first post to instagram');
  });

  it('keeps image and settings the frontend already sent', () => {
    const image = [{ id: 'vid-1', path: 'https://example.com/video.mp4' }];
    const settings = { __type: 'youtube', title: 'Parkour video' };
    const [post] = enrichWebhookTestPayload([
      { content: 'hello', image, settings },
    ]) as Record<string, unknown>[];

    expect(post.image).toEqual(image);
    expect(post.settings).toEqual(settings);
  });
});
