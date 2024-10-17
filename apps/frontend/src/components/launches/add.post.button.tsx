import { Button } from '@gitroom/react/form/button';
import React, { FC } from 'react';
import { useCopilotAction, useCopilotReadable } from '@copilotkit/react-core';

import { ReactComponent as PlusRoundSvg } from '@gitroom/frontend/assets/plus-round.svg';

export const AddPostButton: FC<{ onClick: () => void; num: number }> = (
  props
) => {
  const { onClick, num } = props;

  useCopilotAction({
    name: 'addPost_' + num,
    description: 'Add a post after the post number ' + (num + 1),
    handler: () => {
      onClick();
    },
  });

  return (
    <Button
      onClick={onClick}
      className="!h-[24px] rounded-[3px] flex gap-[4px] w-[102px] text-[12px] font-[500]"
    >
      <div>
        <PlusRoundSvg />
      </div>
      <div className="text-white">Add comment</div>
    </Button>
  );
};
