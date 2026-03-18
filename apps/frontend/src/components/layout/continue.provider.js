import { __awaiter } from "tslib";
import React, { useCallback, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { IntegrationContext } from "../launches/helpers/use.integration";
import useSWR, { useSWRConfig } from 'swr';
import { useFetch } from "../../../../../libraries/helpers/src/utils/custom.fetch";
import { continueProviderList } from "../new-launch/providers/continue-provider/list";
import { newDayjs } from "./set.timezone";
import { useModals } from "./new-modal";
export const Null = () => null;
export const ContinueProvider = () => {
    const { mutate } = useSWRConfig();
    const fetch = useFetch();
    const searchParams = useSearchParams();
    const added = searchParams.get('added');
    const continueId = searchParams.get('continue');
    const router = useRouter();
    const load = useCallback((path) => __awaiter(void 0, void 0, void 0, function* () {
        const list = (yield (yield fetch(path)).json()).integrations;
        return list;
    }), []);
    const { data: integrations } = useSWR('/integrations/list', load, {
        revalidateOnFocus: false,
        revalidateOnReconnect: false,
        revalidateIfStale: false,
        revalidateOnMount: true,
        refreshWhenHidden: false,
        refreshWhenOffline: false,
        fallbackData: [],
    });
    const refreshList = useCallback(() => {
        mutate('/integrations/list');
        const url = new URL(window.location.href);
        url.searchParams.delete('added');
        url.searchParams.delete('continue');
        router.push(url.toString());
    }, []);
    const Provider = useMemo(() => {
        if (!added) {
            return Null;
        }
        return (continueProviderList[added] || Null);
    }, [added]);
    if (!added || !continueId || !integrations) {
        return null;
    }
    return (<ContinueModal refreshList={refreshList} added={added} continueId={continueId} integrations={integrations.map((p) => p.internalId)} provider={Provider}/>);
};
const ModalContent = ({ continueId, added, provider: Provider, closeModal, integrations }) => {
    const fetch = useFetch();
    const onSave = useCallback((data) => __awaiter(void 0, void 0, void 0, function* () {
        yield fetch(`/integrations/provider/${continueId}/connect`, {
            method: 'POST',
            body: JSON.stringify(data),
        });
        closeModal();
    }), [continueId, closeModal]);
    return (<IntegrationContext.Provider value={{
            date: newDayjs(),
            value: [],
            allIntegrations: [],
            integration: {
                editor: 'normal',
                additionalSettings: '',
                display: '',
                time: [
                    {
                        time: 0,
                    },
                ],
                id: continueId,
                type: '',
                name: '',
                picture: '',
                inBetweenSteps: true,
                changeNickName: false,
                changeProfilePicture: false,
                identifier: added,
            },
        }}>
      <Provider onSave={onSave} existingId={integrations}/>
    </IntegrationContext.Provider>);
};
const ContinueModal = (props) => {
    const modals = useModals();
    useEffect(() => {
        modals.openModal({
            title: 'Configure Channel',
            children: (close) => (<ModalContent {...props} closeModal={() => {
                    props.refreshList();
                    close();
                }}/>),
        });
    }, []);
    return null;
};
//# sourceMappingURL=continue.provider.js.map