import {useFetch} from "@gitroom/helpers/utils/custom.fetch";
import {AddProviderComponent} from "@gitroom/frontend/components/launches/add.provider.component";

import {useModals} from '@mantine/modals';
import {useCallback} from 'react';

export const useAddProvider = (update?: () => void) => {
    const modal = useModals();
    const fetch = useFetch();
    return useCallback(async () => {
        const data = await (await fetch('/integrations')).json();
        modal.openModal({
            title: '',
            withCloseButton: false,
            classNames: {
                modal: 'bg-transparent text-textColor',
            },
            children: <AddProviderComponent update = {update}
        {...
            data
        }
        />,
        size: 'auto',
    })
        ;
    }, []);
};