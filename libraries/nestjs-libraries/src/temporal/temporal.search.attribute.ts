import {
  defineSearchAttributeKey,
  SearchAttributeType,
} from '@temporalio/common';

export const organizationId = defineSearchAttributeKey(
  'organizationId',
  SearchAttributeType.KEYWORD
);

export const postId = defineSearchAttributeKey(
  'postId',
  SearchAttributeType.KEYWORD
);
