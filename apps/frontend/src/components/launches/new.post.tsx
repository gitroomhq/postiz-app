import React, { useCallback } from 'react';
import { useModals } from '@mantine/modals';
import dayjs from 'dayjs';
import { useCalendar } from '@gitroom/frontend/components/launches/calendar.context';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { SetSelectionModal } from '@gitroom/frontend/components/launches/calendar';
import { AddEditModal } from '@gitroom/frontend/components/new-launch/add.edit.modal';

export const NewPost = () => {
  const fetch = useFetch();
  const modal = useModals();
  const { integrations, reloadCalendarView, sets } = useCalendar();
  const t = useT();

  const createAPost = useCallback(async () => {
    const date = (await (await fetch('/posts/find-slot')).json()).date;

    const set: any = !sets.length
      ? undefined
      : await new Promise((resolve) => {
          modal.openModal({
            title: t('select_set', 'Select a Set'),
            closeOnClickOutside: true,
            closeOnEscape: true,
            withCloseButton: true,
            onClose: () => resolve('exit'),
            classNames: {
              modal: 'bg-secondary text-textColor',
            },
            children: (
              <SetSelectionModal
                sets={sets}
                onSelect={(selectedSet) => {
                  resolve(selectedSet);
                  modal.closeAll();
                }}
                onContinueWithoutSet={() => {
                  resolve(undefined);
                  modal.closeAll();
                }}
              />
            ),
          });
        });

    if (set === 'exit') return;

    modal.openModal({
      closeOnClickOutside: false,
      closeOnEscape: false,
      withCloseButton: false,
      classNames: {
        modal: 'w-[100%] max-w-[1400px] bg-transparent text-textColor',
      },
      children: (
        <AddEditModal
          allIntegrations={integrations.map((p) => ({
            ...p,
          }))}
          {...(set?.content ? { set: JSON.parse(set.content) } : {})}
          reopenModal={createAPost}
          mutate={reloadCalendarView}
          integrations={integrations}
          date={dayjs.utc(date).local()}
        />
      ),
      size: '80%',
      title: ``,
    });
  }, [integrations, sets]);
  return (
    <button
      onClick={createAPost}
      className="p-[8px] rounded-md bg-green-900 flex justify-center items-center gap-[5px] outline-none text-white"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="25"
        height="25"
        viewBox="0 0 32 32"
        fill="none"
      >
        <path
          d="M21 4H11C9.14409 4.00199 7.36477 4.74012 6.05245 6.05245C4.74012 7.36477 4.00199 9.14409 4 11V21C4.00199 22.8559 4.74012 24.6352 6.05245 25.9476C7.36477 27.2599 9.14409 27.998 11 28H17C17.1075 27.9999 17.2142 27.9826 17.3162 27.9487C20.595 26.855 26.855 20.595 27.9487 17.3162C27.9826 17.2142 27.9999 17.1075 28 17V11C27.998 9.14409 27.2599 7.36477 25.9476 6.05245C24.6352 4.74012 22.8559 4.00199 21 4ZM17 25.9275V22C17 20.6739 17.5268 19.4021 18.4645 18.4645C19.4021 17.5268 20.6739 17 22 17H25.9275C24.77 19.6938 19.6938 24.77 17 25.9275Z"
          fill="white"
        />
      </svg>
      <div className="flex-1 text-start">
        {t('create_new_post', 'Create New Post')}
      </div>
    </button>
  );
};
