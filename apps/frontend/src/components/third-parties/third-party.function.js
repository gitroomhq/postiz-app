import { __awaiter } from "tslib";
import { useThirdParty } from "./third-party.media";
import { useFetch } from "../../../../../libraries/helpers/src/utils/custom.fetch";
import { useCallback, useRef } from 'react';
import useSWR from 'swr';
export const useThirdPartySubmit = () => {
    const thirdParty = useThirdParty();
    const fetch = useFetch();
    return useCallback((data) => __awaiter(void 0, void 0, void 0, function* () {
        if (!thirdParty.id) {
            return;
        }
        const response = yield fetch(`/third-party/${thirdParty.id}/submit`, {
            body: JSON.stringify(data),
            method: 'POST',
        });
        return response.json();
    }), []);
};
export const useThirdPartyFunction = (type) => {
    const thirdParty = useThirdParty();
    const data = useRef(undefined);
    const fetch = useFetch();
    return useCallback((functionName, sendData) => __awaiter(void 0, void 0, void 0, function* () {
        if (data.current && type === 'ONCE') {
            return data.current;
        }
        data.current = yield (yield fetch(`/third-party/function/${thirdParty.id}/${functionName}`, Object.assign(Object.assign({}, (data ? { body: JSON.stringify(sendData) } : {})), { method: 'POST' }))).json();
        return data.current;
    }), [thirdParty, data]);
};
export const useThirdPartyFunctionSWR = (type, functionName, data) => {
    const thirdParty = useThirdParty();
    const fetch = useFetch();
    const callBack = useCallback((functionName, data) => __awaiter(void 0, void 0, void 0, function* () {
        return (yield fetch(`/third-party/function/${thirdParty.id}/${functionName}`, Object.assign(Object.assign({}, (data ? { body: JSON.stringify(data) } : {})), { method: 'POST' }))).json();
    }), [thirdParty]);
    return useSWR(`function-${thirdParty.id}-${functionName}`, () => {
        // @ts-ignore
        return callBack(functionName, Object.assign({}, data));
    }, Object.assign({}, (type === 'LOAD_ONCE'
        ? {
            revalidateOnMount: true,
            revalidateOnFocus: false,
            revalidateOnReconnect: false,
            refreshInterval: 0,
            refreshWhenHidden: false,
            refreshWhenOffline: false,
            revalidateIfStale: false,
        }
        : {})));
};
//# sourceMappingURL=third-party.function.js.map