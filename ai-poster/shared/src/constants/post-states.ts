import { PostState } from '../types/post.types';

/** Valid state transitions for the post state machine */
export const POST_STATE_TRANSITIONS: Record<PostState, PostState[]> = {
  [PostState.DRAFT]: [PostState.PENDING_APPROVAL, PostState.SCHEDULED, PostState.PUBLISHING],
  [PostState.AI_GENERATED]: [PostState.PENDING_APPROVAL, PostState.DRAFT],
  [PostState.PENDING_APPROVAL]: [PostState.APPROVED, PostState.REJECTED, PostState.AI_GENERATED],
  [PostState.APPROVED]: [PostState.SCHEDULED, PostState.PUBLISHING, PostState.DRAFT],
  [PostState.REJECTED]: [PostState.AI_GENERATED, PostState.DRAFT],
  [PostState.SCHEDULED]: [PostState.PUBLISHING, PostState.DRAFT, PostState.APPROVED],
  [PostState.PUBLISHING]: [PostState.POSTED, PostState.FAILED],
  [PostState.POSTED]: [],
  [PostState.FAILED]: [PostState.SCHEDULED, PostState.DRAFT],
};

export function canTransition(from: PostState, to: PostState): boolean {
  return POST_STATE_TRANSITIONS[from]?.includes(to) ?? false;
}

export const POST_STATE_LABELS: Record<PostState, string> = {
  [PostState.DRAFT]: 'Draft',
  [PostState.AI_GENERATED]: 'AI Generated',
  [PostState.PENDING_APPROVAL]: 'Pending Approval',
  [PostState.APPROVED]: 'Approved',
  [PostState.REJECTED]: 'Rejected',
  [PostState.SCHEDULED]: 'Scheduled',
  [PostState.PUBLISHING]: 'Publishing',
  [PostState.POSTED]: 'Posted',
  [PostState.FAILED]: 'Failed',
};

export const POST_STATE_COLORS: Record<PostState, string> = {
  [PostState.DRAFT]: '#868e96',
  [PostState.AI_GENERATED]: '#fab005',
  [PostState.PENDING_APPROVAL]: '#fd7e14',
  [PostState.APPROVED]: '#40c057',
  [PostState.REJECTED]: '#e03131',
  [PostState.SCHEDULED]: '#4c6ef5',
  [PostState.PUBLISHING]: '#7950f2',
  [PostState.POSTED]: '#12b886',
  [PostState.FAILED]: '#fa5252',
};
