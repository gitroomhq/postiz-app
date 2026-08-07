'use client';

import React, { FC } from 'react';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { PostComment } from '@gitroom/frontend/components/new-launch/providers/high.order.provider';

/**
 * Adds another item to the compose thread.
 * - POST: next item is published as a reply chaining the thread (X / Threads / Bluesky).
 * - COMMENT: next item is published as a comment under the root post.
 * - ALL: global / mixed mode — continuation style depends on channel.
 *
 * WORK: one action appends one thread segment — not both a comment and a post.
 * ALL-mode label: "Add comment / post" (owner).
 */
export const AddPostButton: FC<{
  onClick: () => void;
  num: number;
  postComment: PostComment;
}> = (props) => {
  const { onClick } = props;
  const t = useT();

  const label =
    props.postComment === PostComment.ALL
      ? t('add_comment_or_post', 'Add comment / post')
      : props.postComment === PostComment.POST
      ? t('add_post', 'Continue thread')
      : t('add_comment', 'Add comment');

  return (
    <div className="flex">
      <button
        type="button"
        onClick={onClick}
        className="mt-[12px] flex h-[40px] cursor-pointer select-none items-center justify-center gap-[8px] rounded-[10px] bg-pqPink ps-[16px] pe-[18px] text-[13.5px] font-[600] text-white transition-opacity hover:opacity-90"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M8.00065 3.33301V12.6663M3.33398 7.99967H12.6673"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {label}
      </button>
    </div>
  );
};
