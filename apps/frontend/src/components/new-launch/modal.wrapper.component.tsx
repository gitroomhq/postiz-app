import { FC, ReactNode, useEffect, useRef } from 'react';
import { useModals } from '@gitroom/frontend/components/layout/new-modal';
import { deleteDialog } from '@gitroom/react/helpers/delete.dialog';
import { useT } from '@gitroom/react/translation/get.transation.service.client';

export const ModalWrapperComponent: FC<{
  title: string;
  children: ReactNode;
  customClose?: () => void;
  ask?: boolean;
}> = ({ title, children, ask, customClose }) => {
  const ref = useRef<HTMLDivElement>(null);
  const modal = useModals();
  const t = useT();
  const closeModal = async () => {
    if (
      ask &&
      !(await deleteDialog(
        t(
          'are_you_sure_you_want_to_close_the_window',
          'Are you sure you want to close the window?'
        ),
        t('yes_close', 'Yes, close')
      ))
    ) {
      return;
    }

    if (customClose) {
      customClose();
      return;
    }

    modal.closeAll();
  };

  useEffect(() => {
    ref?.current?.scrollIntoView({
      behavior: 'smooth',
    });
  }, []);

  return (
    <>
      <div className="relative">
        <div className="absolute -top-[30px] left-0" ref={ref} />
      </div>
      <div
        className="p-[32px] flex flex-col text-newTextColor bg-newBgColorInner rounded-[24px]"
      >
        <div className="flex items-start mb-[24px]">
          <div className="flex-1 text-[24px]">{title}</div>
          <div className="cursor-pointer" onClick={closeModal}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="21"
              height="21"
              viewBox="0 0 21 21"
              fill="none"
            >
              <path
                d="M16.5 4.5L4.5 16.5M4.5 4.5L16.5 16.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
        <div>{children}</div>
      </div>
    </>
  );
};
