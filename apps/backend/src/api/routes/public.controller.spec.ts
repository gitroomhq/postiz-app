import { HttpException } from '@nestjs/common';
import { PublicController } from './public.controller';

describe('PublicController review routes', () => {
  const reviewService = {
    getReviewByToken: jest.fn(),
    decide: jest.fn(),
  } as any;

  const controller = new PublicController(
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    reviewService
  );

  const req = {
    headers: {
      'x-forwarded-for': '8.8.8.8',
      'user-agent': 'jest-agent',
    },
    ip: '127.0.0.1',
    socket: { remoteAddress: '127.0.0.1' },
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.EXTERNAL_REVIEW_ENABLED = 'true';
  });

  it('returns review payload for valid token', async () => {
    reviewService.getReviewByToken.mockResolvedValue({
      status: 'PENDING',
      posts: [{ id: 'p1' }],
    });

    const result = await controller.getReview('good-token', req);

    expect(result.status).toBe('PENDING');
    expect(reviewService.getReviewByToken).toHaveBeenCalledWith(
      'good-token',
      expect.objectContaining({ ip: '8.8.8.8' })
    );
  });

  it('throws 404 for invalid token', async () => {
    reviewService.getReviewByToken.mockResolvedValue(null);

    await expect(controller.getReview('bad-token', req)).rejects.toBeInstanceOf(
      HttpException
    );
  });

  it('passes reviewer identity on approve', async () => {
    reviewService.decide.mockResolvedValue({
      ok: true,
      status: 'APPROVED',
    });

    const result = await controller.approveReview('token-1', req, {
      reviewerName: 'Alice',
      reviewerEmail: 'alice@example.com',
    });

    expect(result.status).toBe('APPROVED');
    expect(reviewService.decide).toHaveBeenCalledWith(
      'token-1',
      'approve',
      undefined,
      expect.objectContaining({
        reviewerName: 'Alice',
        reviewerEmail: 'alice@example.com',
      })
    );
  });

  it('passes feedback and reviewer identity on reject', async () => {
    reviewService.decide.mockResolvedValue({
      ok: true,
      status: 'REJECTED',
      feedback: 'Needs edits',
    });

    const result = await controller.rejectReview('token-1', req, {
      feedback: 'Needs edits',
      reviewerName: 'Bob',
      reviewerEmail: 'bob@example.com',
    });

    expect(result.status).toBe('REJECTED');
    expect(result.feedback).toBe('Needs edits');
    expect(reviewService.decide).toHaveBeenCalledWith(
      'token-1',
      'reject',
      'Needs edits',
      expect.objectContaining({
        reviewerName: 'Bob',
        reviewerEmail: 'bob@example.com',
      })
    );
  });

  it('returns not found when external review feature flag is disabled', async () => {
    process.env.EXTERNAL_REVIEW_ENABLED = 'false';
    await expect(controller.getReview('good-token', req)).rejects.toBeInstanceOf(
      HttpException
    );
  });
});
