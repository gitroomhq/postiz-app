// postmonster: unified publication statuses for the UI (PRD 7.3).
// The database only knows QUEUE / PUBLISHED / ERROR / DRAFT (Prisma enum State);
// everything else (Publishing, Needs check) is derived from the row.

export type PublicationStatus =
  | 'draft'
  | 'scheduled'
  | 'publishing'
  | 'published'
  | 'failed'
  | 'needs_check';

export interface PostStatusInput {
  state: string;
  publishDate: string | Date;
  error?: string | null;
}

// "Needs check" is how the workflow marks a post the platform accepted but we
// could not confirm (see markUnconfirmed in post.workflow.v1.1.2). The same
// markers drive the Prisma filter in the publications query, keep both in sync.
export const UNCONFIRMED_ERROR_MARKERS = [
  'could not confirm',
  "couldn't confirm",
  'unable to confirm',
];

export const isUnconfirmedError = (error?: string | null): boolean =>
  !!error &&
  UNCONFIRMED_ERROR_MARKERS.some((marker) =>
    error.toLowerCase().includes(marker)
  );

export const mapPostStatus = (
  post: PostStatusInput,
  now: Date = new Date()
): PublicationStatus => {
  switch (post.state) {
    case 'DRAFT':
      return 'draft';
    case 'PUBLISHED':
      return 'published';
    case 'ERROR':
      return isUnconfirmedError(post.error) ? 'needs_check' : 'failed';
    case 'QUEUE':
    default:
      const publishDate = new Date(post.publishDate);
      return publishDate.getTime() <= now.getTime() ? 'publishing' : 'scheduled';
  }
};

export const publicationStatusLabel: Record<PublicationStatus, string> = {
  draft: 'Draft',
  scheduled: 'Scheduled',
  publishing: 'Publishing',
  published: 'Published',
  failed: 'Failed',
  needs_check: 'Needs check',
};
