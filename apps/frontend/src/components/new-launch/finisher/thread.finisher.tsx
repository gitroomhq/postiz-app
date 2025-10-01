'use client';

import { Slider } from '@gitroom/react/form/slider';
import clsx from 'clsx';
import { Editor } from '@gitroom/frontend/components/new-launch/editor';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useIntegration } from '@gitroom/frontend/components/launches/helpers/use.integration';
import { useSettings } from '@gitroom/frontend/components/launches/helpers/use.values';
import { useLaunchStore } from '@gitroom/frontend/components/new-launch/store';

export const ThreadFinisher = () => {
  const integration = useIntegration();
  const { register, watch, setValue } = useSettings();
  const dummy = useLaunchStore((p) => p.dummy);
  const t = useT();

  register('active_thread_finisher', {
    value: false,
  });

  register('thread_finisher', {
    value: t('that_a_wrap', {
      username:
        integration.integration?.display || integration.integration?.name,
    }),
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
      <div className="w-full mt-[20px]">
        <div
          className={clsx(
            !slider && 'relative opacity-25 pointer-events-none editor'
          )}
        >
          <div>
            <div className="flex gap-[4px]">
              <div className="flex-1 editor text-textColor">
                <Editor
                  chars={{}}
                  selectedIntegration={[]}
                  onChange={(val) => setValue('thread_finisher', val)}
                  value={value}
                  totalPosts={1}
                  dummy={dummy}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
