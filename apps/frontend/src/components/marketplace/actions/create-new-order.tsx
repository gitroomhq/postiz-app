import React, {FC, useCallback} from 'react';
import {useModals} from '@mantine/modals';

export const CreateNewOrder: FC<{ group: string }> = (props) => {
    const {group} = props;
    const modals = useModals();

    const createOrder = useCallback(() => {
        modals.openModal({
            classNames: {
                modal: 'bg-transparent text-textColor',
            },
            withCloseButton: false,
            size: '100%',
            children: <NewOrder group={group}/>,
        });
    }, [group]);

    return (
        <div
            className="h-[28px] justify-center items-center bg-customColor42 text-[12px] px-[12px] flex rounded-[34px] font-[600] cursor-pointer"
            onClick={createOrder}
        >
            Create a new offer
        </div>
    );
};