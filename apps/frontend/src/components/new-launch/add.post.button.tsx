'use client';

import { Button } from '@gitroom/react/form/button';
import React, { FC } from 'react';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { PostComment } from '@gitroom/frontend/components/new-launch/providers/high.order.provider';
export const AddPostButton: FC<{
  onClick: () => void;
  num: number;
  postComment: PostComment;
}> = (props) => {
  const { onClick, num } = props;
  const t = useT();

  return (
    <div className="flex">
      <div
        onClick={onClick}
        className="select-none cursor-pointer h-[34px] rounded-[6px] flex bg-[#D82D7E] gap-[8px] justify-center items-center pl-[16px] pr-[20px] text-[13px] font-[600] mt-[12px]"
      >
        <div>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
          >
            <path
              d="M8.00065 3.33301V12.6663M3.33398 7.99967H12.6673"
              stroke="white"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div className="!text-white">
          {t(
            ...(props.postComment === PostComment.ALL
              ? ['add_comment_or_post', 'Add comment or post']
              : props.postComment === PostComment.POST
              ? ['add_post', 'Add post']
              : ['add_comment', 'Add comment'])
          )}
        </div>
      </div>
    </div>
  );
};
