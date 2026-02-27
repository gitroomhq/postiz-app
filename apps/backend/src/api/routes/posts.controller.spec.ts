import { HttpException } from '@nestjs/common';
import { PostsController } from './posts.controller';

describe('PostsController review-link routes', () => {
  const reviewService = {
    createReviewLink: jest.fn(),
    revokeActiveReview: jest.fn(),
  } as any;

  const controller = new PostsController(
    {} as any,
    {} as any,
    {} as any,
    reviewService
  );

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.EXTERNAL_REVIEW_ENABLED = 'true';
  });

  it('creates review link for a post', async () => {
    reviewService.createReviewLink.mockResolvedValue({
      token: 'abc',
      status: 'PENDING',
      url: 'http://localhost:4200/share/abc',
    });

    const result = await controller.createReviewLink(
      { id: 'org-1' } as any,
      'post-1'
    );

    expect(result.status).toBe('PENDING');
    expect(reviewService.createReviewLink).toHaveBeenCalledWith('org-1', 'post-1');
  });

  it('throws 404 when post does not exist', async () => {
    reviewService.createReviewLink.mockResolvedValue(null);

    await expect(
      controller.createReviewLink({ id: 'org-1' } as any, 'missing-post')
    ).rejects.toBeInstanceOf(HttpException);
  });

  it('revokes active review link', async () => {
    reviewService.revokeActiveReview.mockResolvedValue({
      ok: true,
      code: 200,
      status: 'REVOKED',
    });

    const result = await controller.revokeReviewLink(
      { id: 'org-1' } as any,
      'post-1'
    );

    expect(result.ok).toBe(true);
    expect(result.status).toBe('REVOKED');
    expect(reviewService.revokeActiveReview).toHaveBeenCalledWith(
      'org-1',
      'post-1'
    );
  });

  it('throws when revoke fails', async () => {
    reviewService.revokeActiveReview.mockResolvedValue({
      ok: false,
      code: 404,
      message: 'No active review link found',
    });

    await expect(
      controller.revokeReviewLink({ id: 'org-1' } as any, 'post-1')
    ).rejects.toBeInstanceOf(HttpException);
  });

  it('throws not found when feature flag is disabled', async () => {
    process.env.EXTERNAL_REVIEW_ENABLED = 'false';
    await expect(
      controller.createReviewLink({ id: 'org-1' } as any, 'post-1')
    ).rejects.toBeInstanceOf(HttpException);
  });
});
