'use client';
import { __awaiter } from "tslib";
import { useFetch } from "../../../../../../libraries/helpers/src/utils/custom.fetch";
import { useCallback } from 'react';
import useSWR from 'swr';
export const useIntegrationList = () => {
    const fetch = useFetch();
    const load = useCallback((path) => __awaiter(void 0, void 0, void 0, function* () {
        return (yield (yield fetch(path)).json()).integrations;
    }), []);
    return useSWR('/integrations/list', load, {
        revalidateOnFocus: false,
        revalidateOnReconnect: false,
        revalidateIfStale: false,
        revalidateOnMount: true,
        refreshWhenHidden: false,
        refreshWhenOffline: false,
        fallbackData: [],
    });
};
//# sourceMappingURL=use.integration.list.js.map