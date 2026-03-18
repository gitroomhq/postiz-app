import { __awaiter } from "tslib";
import { useEffect, useRef } from 'react';
import { useModals } from "../layout/new-modal";
import { deleteDialog } from "../../../../../libraries/react-shared-libraries/src/helpers/delete.dialog";
import { useT } from "../../../../../libraries/react-shared-libraries/src/translation/get.transation.service.client";
export const ModalWrapperComponent = ({ title, children, ask, customClose }) => {
    const ref = useRef(null);
    const modal = useModals();
    const t = useT();
    const closeModal = () => __awaiter(void 0, void 0, void 0, function* () {
        if (ask &&
            !(yield deleteDialog(t('are_you_sure_you_want_to_close_the_window', 'Are you sure you want to close the window?'), t('yes_close', 'Yes, close')))) {
            return;
        }
        if (customClose) {
            customClose();
            return;
        }
        modal.closeAll();
    });
    useEffect(() => {
        var _a;
        (_a = ref === null || ref === void 0 ? void 0 : ref.current) === null || _a === void 0 ? void 0 : _a.scrollIntoView({
            behavior: 'smooth',
        });
    }, []);
    return (<>
      <div className="relative">
        <div className="absolute -top-[30px] left-0" ref={ref}/>
      </div>
      <div className="p-[32px] flex flex-col text-newTextColor bg-newBgColorInner rounded-[24px]">
        <div className="flex items-start mb-[24px]">
          <div className="flex-1 text-[24px]">{title}</div>
          <div className="cursor-pointer" onClick={closeModal}>
            <svg xmlns="http://www.w3.org/2000/svg" width="21" height="21" viewBox="0 0 21 21" fill="none">
              <path d="M16.5 4.5L4.5 16.5M4.5 4.5L16.5 16.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>
        <div>{children}</div>
      </div>
    </>);
};
//# sourceMappingURL=modal.wrapper.component.js.map