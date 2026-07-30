import { PostsService } from './posts.service';

describe('PostsService.mapTypeToPost', () => {
  const mockDep = {} as any;
  const service = new PostsService(
    mockDep,
    mockDep,
    mockDep,
    mockDep,
    mockDep,
    mockDep,
    mockDep,
    mockDep
  );

  it('throws a clear error when posts array is missing', async () => {
    await expect(
      service.mapTypeToPost({ type: 'schedule', date: '2026-01-01' } as any, 'org-id')
    ).rejects.toThrow('Request body must include a non-empty "posts" array');
  });

  it('throws a clear error when posts array is empty', async () => {
    await expect(
      service.mapTypeToPost({ type: 'schedule', date: '2026-01-01', posts: [] } as any, 'org-id')
    ).rejects.toThrow('Request body must include a non-empty "posts" array');
  });

  it('throws the original error when posts exist but lack integration id', async () => {
    await expect(
      service.mapTypeToPost(
        { type: 'schedule', date: '2026-01-01', posts: [{}] } as any,
        'org-id'
      )
    ).rejects.toThrow('All posts must have an integration id');
  });
});
