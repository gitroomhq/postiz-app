import { useCallback } from 'react';
import { SignaturesComponent } from "./settings/signatures.component";
import { useModals } from "./layout/new-modal";
export const SignatureBox = ({ editor }) => {
    const modals = useModals();
    const appendValue = (val) => {
        var _a, _b;
        (_a = editor === null || editor === void 0 ? void 0 : editor.commands) === null || _a === void 0 ? void 0 : _a.insertContent('\n\n' + val);
        (_b = editor === null || editor === void 0 ? void 0 : editor.commands) === null || _b === void 0 ? void 0 : _b.focus();
    };
    const addSignature = useCallback(() => {
        modals.openModal({
            title: 'Add Signature',
            withCloseButton: true,
            children: (close) => (<SignatureModal appendSignature={appendValue} close={close}/>),
        });
    }, [appendValue]);
    return (<>
      <div onClick={addSignature} data-tooltip-id="tooltip" data-tooltip-content="Add Signature" className="select-none cursor-pointer rounded-[6px] w-[30px] h-[30px] bg-newColColor flex justify-center items-center">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
          <g clipPath="url(#clip0_2352_53073)">
            <path d="M1.61528 13.4634C4.98807 11.1708 6.12853 2.72516 2.42576 2.54001C-0.271332 2.40515 1.52719 6.99029 4.04454 11.4405C4.43518 12.1311 5.08312 12.0221 5.35096 11.8873C6.23825 11.4405 6.49355 9.29898 6.95238 8.8935C7.41122 8.48802 7.98909 8.45521 8.49293 9.16322C9.12361 10.0494 9.65463 9.91856 10.0456 9.70264C10.6103 9.39078 11.3197 8.22463 12.1949 9.16322C12.7765 9.78692 12.5068 10.4612 14.9173 10.1915" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
            <path d="M7.16602 12.917H13.8327" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
          </g>
          <defs>
            <clipPath id="clip0_2352_53073">
              <rect width="16" height="16" fill="white"/>
            </clipPath>
          </defs>
        </svg>
      </div>
    </>);
};
export const SignatureModal = (props) => {
    const { appendSignature } = props;
    return <SignaturesComponent appendSignature={appendSignature}/>;
};
//# sourceMappingURL=signature.js.map