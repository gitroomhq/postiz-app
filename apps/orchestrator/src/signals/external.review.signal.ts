import { defineSignal } from '@temporalio/workflow';

export const externalReviewResolvedSignal = defineSignal<
  [{ status: 'APPROVED' | 'REJECTED' | 'EXPIRED' | 'REVOKED' }]
>('externalReviewResolved');

