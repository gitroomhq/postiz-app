import { __awaiter } from "tslib";
import React, { useCallback } from 'react';
import { useModals } from "../layout/new-modal";
import dayjs from 'dayjs';
import { useCalendar } from "./calendar.context";
import { useFetch } from "../../../../../libraries/helpers/src/utils/custom.fetch";
import { useT } from "../../../../../libraries/react-shared-libraries/src/translation/get.transation.service.client";
import { SetSelectionModal } from "./calendar";
import { AddEditModal } from "../new-launch/add.edit.modal";
export const NewPost = () => {
    const fetch = useFetch();
    const modal = useModals();
    const { integrations, reloadCalendarView, sets } = useCalendar();
    const t = useT();
    const createAPost = useCallback(() => __awaiter(void 0, void 0, void 0, function* () {
        const date = (yield (yield fetch('/posts/find-slot')).json()).date;
        const set = !sets.length
            ? undefined
            : yield new Promise((resolve) => {
                modal.openModal({
                    title: t('select_set', 'Select a Set'),
                    closeOnClickOutside: true,
                    closeOnEscape: true,
                    withCloseButton: false,
                    onClose: () => resolve('exit'),
                    classNames: {
                        modal: 'text-textColor',
                    },
                    children: (<SetSelectionModal sets={sets} onSelect={(selectedSet) => {
                            resolve(selectedSet);
                            modal.closeAll();
                        }} onContinueWithoutSet={() => {
                            resolve(undefined);
                            modal.closeAll();
                        }}/>),
                });
            });
        if (set === 'exit')
            return;
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
            children: (<AddEditModal allIntegrations={integrations.map((p) => (Object.assign({}, p)))} {...((set === null || set === void 0 ? void 0 : set.content) ? { set: JSON.parse(set.content) } : {})} reopenModal={createAPost} mutate={reloadCalendarView} integrations={integrations} date={dayjs.utc(date).local()}/>),
            size: '80%',
            title: ``,
        });
    }), [integrations, sets]);
    return (<button onClick={createAPost} className="text-white flex-1 pt-[12px] pb-[14px] ps-[16px] pe-[20px] group-[.sidebar]:p-0 min-h-[44px] max-h-[44px] rounded-md bg-btnPrimary flex justify-center items-center gap-[5px] outline-none">
      <svg xmlns="http://www.w3.org/2000/svg" width="21" height="20" viewBox="0 0 21 20" fill="none" className="min-w-[21px] min-h-[20px]">
        <path d="M10.5001 4.16699V15.8337M4.66675 10.0003H16.3334" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      <div className="flex-1 text-start text-[14px] group-[.sidebar]:hidden">
        {t('create_new_post', 'Create Post')}
      </div>
    </button>);
};
//# sourceMappingURL=new.post.js.map