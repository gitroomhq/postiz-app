'use client';
import { __awaiter } from "tslib";
import { useFetch } from "../../../../../libraries/helpers/src/utils/custom.fetch";
import useSWR from 'swr';
import React, { useCallback, useState } from 'react';
import { Button } from "../../../../../libraries/react-shared-libraries/src/form/button";
import { useRouter } from 'next/navigation';
import { useModals } from "../layout/new-modal";
import { FormProvider, useForm } from 'react-hook-form';
import { useT } from "../../../../../libraries/react-shared-libraries/src/translation/get.transation.service.client";
import { Input } from "../../../../../libraries/react-shared-libraries/src/form/input";
import { useToaster } from "../../../../../libraries/react-shared-libraries/src/toaster/toaster";
export const ApiModal = (props) => {
    const { title, identifier, update } = props;
    const fetch = useFetch();
    const router = useRouter();
    const modal = useModals();
    const toaster = useToaster();
    const [loading, setLoading] = useState(false);
    const closePopup = useCallback(() => {
        modal.closeAll();
    }, []);
    const methods = useForm({
        mode: 'onChange',
    });
    const close = useCallback(() => {
        if (closePopup) {
            return closePopup();
        }
        modal.closeAll();
    }, []);
    const submit = useCallback((data) => __awaiter(void 0, void 0, void 0, function* () {
        setLoading(true);
        const add = yield fetch(`/third-party/${identifier}`, {
            method: 'POST',
            body: JSON.stringify({
                api: data.api,
            }),
        });
        if (add.ok) {
            toaster.show('Integration added successfully', 'success');
            if (closePopup) {
                closePopup();
            }
            else {
                modal.closeAll();
            }
            router.refresh();
            if (update)
                update();
            return;
        }
        const { message } = yield add.json();
        methods.setError('api', {
            message,
        });
        setLoading(false);
    }), [props]);
    const t = useT();
    return (<div className="relative">
      <FormProvider {...methods}>
        <form className="gap-[8px] flex flex-col" onSubmit={methods.handleSubmit(submit)}>
          <div className="pt-[10px]">
            <Input label="API Key" name="api"/>
          </div>
          <div>
            <Button loading={loading} type="submit">
              {t('add_integration', 'Add Integration')}
            </Button>
          </div>
        </form>
      </FormProvider>
    </div>);
};
export const ThirdPartyListComponent = (props) => {
    const fetch = useFetch();
    const modals = useModals();
    const { reload } = props;
    const integrationsList = useCallback(() => __awaiter(void 0, void 0, void 0, function* () {
        return (yield fetch('/third-party/list')).json();
    }), []);
    const { data } = useSWR('third-party-list', integrationsList, {
        revalidateOnFocus: false,
        revalidateOnReconnect: false,
        revalidateIfStale: false,
        revalidateOnMount: true,
        refreshWhenHidden: false,
        refreshWhenOffline: false,
    });
    const addApiKey = useCallback((title, identifier) => () => {
        modals.openModal({
            title: `Add API key for ${title}`,
            withCloseButton: false,
            children: (<ApiModal identifier={identifier} title={title} update={reload}/>),
        });
    }, []);
    return (<div className="grid grid-cols-4 gap-[10px] justify-items-center justify-center">
      {data === null || data === void 0 ? void 0 : data.map((p) => (<div onClick={addApiKey(p.title, p.identifier)} key={p.identifier} className="w-full h-full p-[20px] min-h-[100px] text-[14px] bg-newTableHeader hover:bg-newTableBorder rounded-[8px] transition-all text-textColor relative flex flex-col gap-[15px] cursor-pointer">
          <div>
            <img className="w-[32px] h-[32px]" src={`/icons/third-party/${p.identifier}.png`}/>
          </div>
          <div className="whitespace-pre-wrap text-left text-lg">{p.title}</div>
          <div className="whitespace-pre-wrap text-left">{p.description}</div>
          <div className="w-full flex">
            <Button className="w-full">Add</Button>
          </div>
        </div>))}
    </div>);
};
//# sourceMappingURL=third-party.list.component.js.map