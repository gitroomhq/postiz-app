import {
  isUnconfirmedError,
  mapPostStatus,
  publicationStatusLabel,
} from '@gitroom/helpers/postmonster/post-status';

describe('postmonster publication status mapping (PRD 7.3)', () => {
  const now = new Date('2026-09-28T12:00:00Z');
  const past = '2026-09-28T10:00:00Z';
  const future = '2026-09-28T14:00:00Z';

  it('maps DRAFT to draft', () => {
    expect(mapPostStatus({ state: 'DRAFT', publishDate: past }, now)).toBe(
      'draft'
    );
    expect(mapPostStatus({ state: 'DRAFT', publishDate: future }, now)).toBe(
      'draft'
    );
  });

  it('maps PUBLISHED to published', () => {
    expect(mapPostStatus({ state: 'PUBLISHED', publishDate: past }, now)).toBe(
      'published'
    );
  });

  it('maps future QUEUE to scheduled', () => {
    expect(mapPostStatus({ state: 'QUEUE', publishDate: future }, now)).toBe(
      'scheduled'
    );
  });

  it('maps past or current QUEUE to publishing', () => {
    expect(mapPostStatus({ state: 'QUEUE', publishDate: past }, now)).toBe(
      'publishing'
    );
    expect(
      mapPostStatus({ state: 'QUEUE', publishDate: now.toISOString() }, now)
    ).toBe('publishing');
  });

  it('maps ERROR to failed with the stored reason', () => {
    expect(
      mapPostStatus(
        { state: 'ERROR', publishDate: past, error: 'TikTok rejected the video' },
        now
      )
    ).toBe('failed');
  });

  it('maps an unconfirmed ERROR to needs_check', () => {
    expect(
      mapPostStatus(
        {
          state: 'ERROR',
          publishDate: past,
          error: 'Could not confirm the post status',
        },
        now
      )
    ).toBe('needs_check');
    expect(
      mapPostStatus(
        {
          state: 'ERROR',
          publishDate: past,
          error: "We couldn't confirm it was published",
        },
        now
      )
    ).toBe('needs_check');
  });

  it('treats an ERROR without a message as failed', () => {
    expect(mapPostStatus({ state: 'ERROR', publishDate: past }, now)).toBe(
      'failed'
    );
  });

  it('has a label for every status', () => {
    expect(publicationStatusLabel).toEqual({
      draft: 'Draft',
      scheduled: 'Scheduled',
      publishing: 'Publishing',
      published: 'Published',
      failed: 'Failed',
      needs_check: 'Needs check',
    });
  });

  it('isUnconfirmedError only matches the confirm markers', () => {
    expect(isUnconfirmedError('Could not confirm the post status')).toBe(true);
    expect(isUnconfirmedError("couldn't confirm it")).toBe(true);
    expect(isUnconfirmedError('unable to confirm the result')).toBe(true);
    expect(isUnconfirmedError('Invalid access token')).toBe(false);
    expect(isUnconfirmedError(null)).toBe(false);
    expect(isUnconfirmedError('')).toBe(false);
  });
});
