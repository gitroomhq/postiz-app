import React, { FC, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { ModalWrapperComponent } from '@gitroom/frontend/components/new-launch/modal.wrapper.component';
import { useModals } from '@mantine/modals';
import { Button } from '@gitroom/react/form/button';

export const PreConditionComponentModal: FC = () => {
  return (
    <div className="flex flex-col gap-[16px]">
      <div className="whitespace-pre-line">
        This social channel was connected previously to another Postiz account.{'\n'}
        To continue, please fast-track your trial for an immediate charge.{'\n'}{'\n'}
        ** Please be advised that the account will not eligible for a refund, and the charge is final.
      </div>
      <div className="flex gap-[2px] justify-center">
        <Button onClick={() => window.location.href='/billing?finishTrial=true'}>Fast track - Charge me now</Button>
        <Button secondary={true}>Cancel</Button>
      </div>
    </div>
  );
};
export const PreConditionComponent: FC = () => {
  const modal = useModals();
  const query = useSearchParams();
  useEffect(() => {
    if (query.get('precondition')) {
      modal.openModal({
        title: '',
        withCloseButton: false,
        classNames: {
          modal: 'text-textColor',
        },
        size: 'auto',
        children: (
          <ModalWrapperComponent title="Suspicious activity detected">
            <PreConditionComponentModal />
          </ModalWrapperComponent>
        ),
      });
    }
  }, []);
  return null;
};
