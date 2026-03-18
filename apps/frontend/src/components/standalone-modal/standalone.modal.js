'use client';
import { __awaiter } from "tslib";
import 'reflect-metadata';
import { useCallback } from 'react';
import useSWR from 'swr';
import { useFetch } from "../../../../../libraries/helpers/src/utils/custom.fetch";
import dayjs from 'dayjs';
import { useParams } from 'next/navigation';
import { AddEditModal } from "../new-launch/add.edit.modal";
import { newDayjs } from "../layout/set.timezone";
export const StandaloneModal = () => {
    const fetch = useFetch();
    const params = useParams();
    const load = useCallback((path) => __awaiter(void 0, void 0, void 0, function* () {
        return (yield (yield fetch(path)).json()).integrations;
    }), []);
    const loadDate = useCallback(() => __awaiter(void 0, void 0, void 0, function* () {
        if (params.platform === 'all') {
            return newDayjs().utc().format('YYYY-MM-DDTHH:mm:ss');
        }
        return (yield (yield fetch('/posts/find-slot')).json()).date;
    }), []);
    const { isLoading, data: integrations, mutate, } = useSWR('/integrations/list', load, {
        revalidateOnFocus: false,
        revalidateOnReconnect: false,
        revalidateIfStale: false,
        revalidateOnMount: true,
        refreshWhenHidden: false,
        refreshWhenOffline: false,
        fallbackData: [],
    });
    const { isLoading: isLoading2, data } = useSWR('/posts/find-slot', loadDate, {
        fallbackData: [],
    });
    if (isLoading || isLoading2) {
        return null;
    }
    return (<AddEditModal dummy={params.platform === 'all'} customClose={() => {
            window.parent.postMessage({
                action: 'closeIframe',
            }, '*');
        }} mutate={() => { }} integrations={integrations} reopenModal={() => { }} allIntegrations={integrations} date={dayjs.utc(data).local()}/>);
};
//# sourceMappingURL=standalone.modal.js.map