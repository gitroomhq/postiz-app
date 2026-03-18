'use client';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect } from 'react';
const ReturnUrlComponent = () => {
    const params = useSearchParams();
    const url = params.get('returnUrl');
    useEffect(() => {
        var _a;
        if (((_a = url === null || url === void 0 ? void 0 : url.indexOf) === null || _a === void 0 ? void 0 : _a.call(url, 'http')) > -1) {
            localStorage.setItem('returnUrl', url);
        }
    }, [url]);
    return null;
};
export const useReturnUrl = () => {
    return {
        getAndClear: useCallback(() => {
            const data = localStorage.getItem('returnUrl');
            localStorage.removeItem('returnUrl');
            return data;
        }, []),
    };
};
export default ReturnUrlComponent;
//# sourceMappingURL=return.url.component.js.map