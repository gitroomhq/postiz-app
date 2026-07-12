import { PostsRepository } from './posts.repository';

describe('PostsRepository', () => {
  const postModel = {
    create: jest.fn(),
    update: jest.fn(),
    findFirst: jest.fn(),
    updateMany: jest.fn(),
  };
  const commentsModel = {
    create: jest.fn(),
  };
  const tagsModel = {
    update: jest.fn(),
    findMany: jest.fn(),
  };
  const tagsPostsModel = {
    deleteMany: jest.fn(),
  };

  const repository = new PostsRepository(
    { model: { post: postModel } } as any,
    { model: { popularPosts: {} } } as any,
    { model: { comments: commentsModel } } as any,
    { model: { tags: tagsModel } } as any,
    { model: { tagsPosts: tagsPostsModel } } as any,
    { model: { errors: {} } } as any
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('scopes post and group updates to the organization', async () => {
    postModel.update.mockResolvedValue({ id: 'post-1' });
    postModel.findFirst.mockResolvedValue({ id: 'previous-post' });
    postModel.updateMany.mockResolvedValue({ count: 1 });
    tagsPostsModel.deleteMany.mockResolvedValue({ count: 0 });

    await repository.createOrUpdatePost(
      'update',
      'org-1',
      '2026-07-13T10:00:00.000Z',
      {
        integration: { id: 'integration-1' },
        value: [
          {
            id: 'post-1',
            content: 'Updated post',
            image: [],
            delay: 0,
          },
        ],
        settings: {},
        group: 'group-1',
      } as any,
      [],
      'WEB'
    );

    expect(postModel.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 'post-1',
          organizationId: 'org-1',
        },
      })
    );
    expect(postModel.findFirst).toHaveBeenCalledWith({
      where: {
        group: 'group-1',
        organizationId: 'org-1',
        deletedAt: null,
        parentPostId: null,
      },
      select: {
        id: true,
      },
    });
    expect(postModel.updateMany).toHaveBeenCalledWith({
      where: {
        group: 'group-1',
        organizationId: 'org-1',
        deletedAt: null,
      },
      data: {
        parentPostId: null,
        deletedAt: expect.any(Date),
      },
    });
  });

  it('scopes tag edits to the organization', async () => {
    tagsModel.update.mockResolvedValue({ id: 'tag-1' });

    await repository.editTag('tag-1', 'org-1', {
      name: 'Product',
      color: '#ffffff',
    });

    expect(tagsModel.update).toHaveBeenCalledWith({
      where: {
        id: 'tag-1',
        orgId: 'org-1',
      },
      data: {
        name: 'Product',
        color: '#ffffff',
      },
    });
  });

  it('connects comments only to posts in the organization', async () => {
    commentsModel.create.mockResolvedValue({ id: 'comment-1' });

    await repository.createComment('org-1', 'user-1', 'post-1', 'Looks good');

    expect(commentsModel.create).toHaveBeenCalledWith({
      data: {
        content: 'Looks good',
        organization: {
          connect: {
            id: 'org-1',
          },
        },
        user: {
          connect: {
            id: 'user-1',
          },
        },
        post: {
          connect: {
            id: 'post-1',
            organizationId: 'org-1',
          },
        },
      },
    });
  });
});
