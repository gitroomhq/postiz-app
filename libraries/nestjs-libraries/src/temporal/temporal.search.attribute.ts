import {
  defineSearchAttributeKey,
  SearchAttributeType,
} from '@temporalio/common';

export const organizationId = defineSearchAttributeKey(
  'organizationId',
  SearchAttributeType.TEXT
);

export const postId = defineSearchAttributeKey(
  'postId',
  SearchAttributeType.TEXT
);
