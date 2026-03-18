import { __awaiter } from "tslib";
import { useCallback, useEffect, useState } from 'react';
import Loading from 'react-loading';
import { useFetch } from "../../../../../libraries/helpers/src/utils/custom.fetch";
import { timer } from "../../../../../libraries/helpers/src/utils/timer";
import { useToaster } from "../../../../../libraries/react-shared-libraries/src/toaster/toaster";
import { useDecisionModal } from "./new-modal";
export const CheckPayment = (props) => {
    if (!props.check) {
        return <>{props.children}</>;
    }
    return <CheckPaymentInner {...props}/>;
};
export const CheckPaymentInner = (props) => {
    const [showLoader, setShowLoader] = useState(true);
    const fetch = useFetch();
    const toaster = useToaster();
    const modal = useDecisionModal();
    useEffect(() => {
        var _a, _b;
        if (showLoader) {
            (_a = document.querySelector('body')) === null || _a === void 0 ? void 0 : _a.classList.add('overflow-hidden');
            Array.from(document.querySelectorAll('.blurMe') || []).map((p) => p.classList.add('blur-xs', 'pointer-events-none'));
        }
        else {
            (_b = document.querySelector('body')) === null || _b === void 0 ? void 0 : _b.classList.remove('overflow-hidden');
            Array.from(document.querySelectorAll('.blurMe') || []).map((p) => p.classList.remove('blur-xs', 'pointer-events-none'));
        }
    }, [showLoader]);
    const checkSubscription = useCallback(() => __awaiter(void 0, void 0, void 0, function* () {
        const { status } = yield (yield fetch('/billing/check/' + props.check)).json();
        if (status === 0) {
            yield timer(1000);
            return checkSubscription();
        }
        if (status === 1) {
            modal.open({
                title: 'Invalid Payment',
                onlyApprove: true,
                approveLabel: 'OK',
                description: 'We could not validate your payment method, please try again',
            });
            setShowLoader(false);
        }
        if (status === 2) {
            setShowLoader(false);
            props.mutate();
        }
    }), []);
    useEffect(() => {
        checkSubscription();
    }, []);
    if (showLoader) {
        return (<div className="fixed bg-black/40 w-full h-full flex justify-center items-center z-[400]">
        <div>
          <Loading type="spin" color="#612AD5" height={250} width={250}/>
        </div>
      </div>);
    }
    return props.children;
};
//# sourceMappingURL=check.payment.js.map