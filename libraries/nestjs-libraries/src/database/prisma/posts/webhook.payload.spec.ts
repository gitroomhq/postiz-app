import { shapeWebhookPosts } from './webhook.payload';

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
