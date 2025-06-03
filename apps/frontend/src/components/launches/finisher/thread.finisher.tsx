import { Slider } from '@gitroom/react/form/slider';
import clsx from 'clsx';
import { useState } from 'react';
import { Editor } from '@gitroom/frontend/components/launches/editor';
import { useIntegration } from '@gitroom/frontend/components/launches/helpers/use.integration';
import { useSettings } from '@gitroom/frontend/components/launches/helpers/use.values';

export const ThreadFinisher = () => {
  const integration = useIntegration();
  const { register, watch, setValue } = useSettings();
  register('active_thread_finisher', {
    value: false,
  });

  register('thread_finisher', {
    value: `That's a wrap!

If you enjoyed this thread:

1. Follow me @${integration.integration?.display || integration.integration?.name} for more of these
2. RT the tweet below to share this thread with your audience`,
  });

  const slider = watch('active_thread_finisher');
  const value = watch('thread_finisher');

  return (
    <div className="flex flex-col gap-[10px] border-tableBorder border p-[15px] rounded-lg mb-5">
      <div className="flex items-center">
        <div className="flex-1">Add a thread finisher</div>
        <div>
          <Slider
            value={slider ? 'on' : 'off'}
            onChange={(p) => setValue('active_thread_finisher', p === 'on')}
            fill={true}
          />
        </div>
      </div>
      <div className="w-full mt-[40px]">
        <div
          className={clsx(
            !slider && 'relative opacity-25 pointer-events-none editor'
          )}
        >
          <div>
            <div className="flex gap-[4px]">
              <div className="flex-1 editor text-textColor">
                <Editor
                  onChange={(val) => setValue('thread_finisher', val)}
                  value={value}
                  height={150}
                  totalPosts={1}
                  order={1}
                  preview="edit"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
