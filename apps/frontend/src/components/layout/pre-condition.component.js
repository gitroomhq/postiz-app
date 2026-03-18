import React, { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useModals } from "./new-modal";
import { Button } from "../../../../../libraries/react-shared-libraries/src/form/button";
export const PreConditionComponentModal = () => {
    const modal = useModals();
    return (<div className="flex flex-col gap-[16px]">
      <div className="whitespace-pre-line">
        This social channel was connected previously to another Postiz account.
        {'\n'}
        To continue, please fast-track your trial for an immediate charge.{'\n'}
        {'\n'}
        ** Please be advised that the account will not eligible for a refund,
        and the charge is final.
      </div>
      <div className="flex gap-[2px] justify-center">
        <Button onClick={() => (window.location.href = '/billing?finishTrial=true')}>
          Fast track - Charge me now
        </Button>
        <Button onClick={modal.closeCurrent} secondary={true}>Cancel</Button>
      </div>
    </div>);
};
export const PreConditionComponent = () => {
    const modal = useModals();
    const query = useSearchParams();
    useEffect(() => {
        if (query.get('precondition')) {
            modal.openModal({
                title: 'Suspicious activity detected',
                withCloseButton: true,
                classNames: {
                    modal: 'text-textColor',
                },
                children: <PreConditionComponentModal />,
            });
        }
    }, []);
    return null;
};
//# sourceMappingURL=pre-condition.component.js.map