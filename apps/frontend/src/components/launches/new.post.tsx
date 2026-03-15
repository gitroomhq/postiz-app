import React, { useCallback } from 'react';
import { useModals } from '@gitroom/frontend/components/layout/new-modal';
import dayjs from 'dayjs';
import { useCalendar } from '@gitroom/frontend/components/launches/calendar.context';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { SetSelectionModal } from '@gitroom/frontend/components/launches/calendar';
import { AddEditModal } from '@gitroom/frontend/components/new-launch/add.edit.modal';
import { ModalWrapperComponent } from '@gitroom/frontend/components/new-launch/modal.wrapper.component';

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
            withCloseButton: false,
            onClose: () => resolve('exit'),
            classNames: {
              modal: 'text-textColor',
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
      id: 'add-edit-modal',
      closeOnClickOutside: false,
      removeLayout: true,
      closeOnEscape: false,
      withCloseButton: false,
      askClose: true,
      fullScreen: true,
      classNames: {
        modal: 'w-[100%] max-w-[1400px] text-textColor',
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
      className="text-[#0a0e1a] flex-1 pt-[12px] pb-[14px] ps-[16px] pe-[20px] group-[.sidebar]:p-0 min-h-[46px] max-h-[46px] rounded-[14px] border border-sky-300/20 bg-[linear-gradient(135deg,#38bdf8,#a78bfa)] shadow-[0_18px_40px_rgba(56,189,248,0.22)] flex justify-center items-center gap-[5px] outline-none transition-all hover:-translate-y-[1px] hover:shadow-[0_24px_60px_rgba(56,189,248,0.28)]"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="21"
        height="20"
        viewBox="0 0 21 20"
        fill="none"
        className="min-w-[21px] min-h-[20px]"
      >
        <path
          d="M10.5001 4.16699V15.8337M4.66675 10.0003H16.3334"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <div className="flex-1 text-start text-[14px] font-[700] group-[.sidebar]:hidden">
        {t('create_new_post', 'Create Post')}
      </div>
    </button>
  );
};
