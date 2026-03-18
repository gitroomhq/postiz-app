'use client';
import { __awaiter, __rest } from "tslib";
import { usePlugs, } from "./plugs.context";
import { Button } from "../../../../../libraries/react-shared-libraries/src/form/button";
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useFetch } from "../../../../../libraries/helpers/src/utils/custom.fetch";
import useSWR from 'swr';
import { useModals } from "../layout/new-modal";
import { FormProvider, useForm, useFormContext, } from 'react-hook-form';
import { Input } from "../../../../../libraries/react-shared-libraries/src/form/input";
import { CopilotTextarea } from '@copilotkit/react-textarea';
import clsx from 'clsx';
import { string, object } from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
import { Slider } from "../../../../../libraries/react-shared-libraries/src/form/slider";
import { useToaster } from "../../../../../libraries/react-shared-libraries/src/toaster/toaster";
import { useT } from "../../../../../libraries/react-shared-libraries/src/translation/get.transation.service.client";
export function convertBackRegex(s) {
    const matches = s.match(/\/(.*)\/([a-z]*)/);
    const pattern = (matches === null || matches === void 0 ? void 0 : matches[1]) || '';
    const flags = (matches === null || matches === void 0 ? void 0 : matches[2]) || '';
    return new RegExp(pattern, flags);
}
export const TextArea = (props) => {
    var _a, _b, _c;
    const form = useFormContext();
    const _d = form.register(props.name), { onChange, onBlur } = _d, all = __rest(_d, ["onChange", "onBlur"]);
    const value = form.watch(props.name);
    return (<>
      <textarea className="hidden" {...all}></textarea>
      <CopilotTextarea disableBranding={true} placeholder={props.placeHolder} value={value} className={clsx('!min-h-40 !max-h-80 p-[24px] overflow-hidden bg-customColor2 outline-none rounded-[4px] border-fifth border')} onChange={(e) => {
            onChange({
                target: {
                    name: props.name,
                    value: e.target.value,
                },
            });
        }} autosuggestionsConfig={{
            textareaPurpose: `Assist me in writing social media posts.`,
            chatApiConfigs: {},
        }}/>
      <div className="text-red-400 text-[12px]">
        {(_c = (_b = (_a = form === null || form === void 0 ? void 0 : form.formState) === null || _a === void 0 ? void 0 : _a.errors) === null || _b === void 0 ? void 0 : _b[props.name]) === null || _c === void 0 ? void 0 : _c.message}
      </div>
    </>);
};
export const PlugPop = (props) => {
    const { plug, settings, data } = props;
    const { closeAll } = useModals();
    const fetch = useFetch();
    const toaster = useToaster();
    const values = useMemo(() => {
        if (!(data === null || data === void 0 ? void 0 : data.data)) {
            return {};
        }
        return JSON.parse(data.data).reduce((acc, current) => {
            return Object.assign(Object.assign({}, acc), { [current.name]: current.value });
        }, {});
    }, []);
    const yupSchema = useMemo(() => {
        return object(plug.fields.reduce((acc, field) => {
            return Object.assign(Object.assign({}, acc), { [field.name]: field.validation
                    ? string().matches(convertBackRegex(field.validation), {
                        message: 'Invalid value',
                    })
                    : null });
        }, {}));
    }, []);
    const form = useForm({
        resolver: yupResolver(yupSchema),
        values,
        mode: 'all',
    });
    const submit = useCallback((data) => __awaiter(void 0, void 0, void 0, function* () {
        yield fetch(`/integrations/${settings.providerId}/plugs`, {
            method: 'POST',
            body: JSON.stringify({
                func: plug.methodName,
                fields: Object.keys(data).map((key) => ({
                    name: key,
                    value: data[key],
                })),
            }),
        });
        toaster.show('Plug updated', 'success');
        closeAll();
    }), []);
    const t = useT();
    return (<FormProvider {...form}>
      <form onSubmit={form.handleSubmit(submit)}>
        <div className="relative mx-auto">
          <div className="my-[20px]">{plug.description}</div>
          <div>
            {plug.fields.map((field) => (<div key={field.name}>
                {field.type === 'richtext' ? (<TextArea name={field.name} placeHolder={field.placeholder}/>) : (<Input name={field.name} label={field.description} className="w-full mt-[8px] p-[8px] border border-tableBorder rounded-md text-black" placeholder={field.placeholder} type={field.type}/>)}
              </div>))}
          </div>
          <div className="mt-[20px]">
            <Button type="submit">{t('activate', 'Activate')}</Button>
          </div>
        </div>
      </form>
    </FormProvider>);
};
export const PlugItem = (props) => {
    const { plug, addPlug, data } = props;
    const [activated, setActivated] = useState(!!(data === null || data === void 0 ? void 0 : data.activated));
    useEffect(() => {
        setActivated(!!(data === null || data === void 0 ? void 0 : data.activated));
    }, [data === null || data === void 0 ? void 0 : data.activated]);
    const fetch = useFetch();
    const changeActivated = useCallback((status) => __awaiter(void 0, void 0, void 0, function* () {
        yield fetch(`/integrations/plugs/${data === null || data === void 0 ? void 0 : data.id}/activate`, {
            body: JSON.stringify({
                status: status === 'on',
            }),
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
        });
        setActivated(status === 'on');
    }), [activated]);
    return (<div onClick={() => addPlug(data)} key={plug.title} className="w-full h-[300px] rounded-[8px] bg-newTableHeader hover:bg-newTableBorder">
      <div key={plug.title} className="p-[16px] h-full flex flex-col flex-1">
        <div className="flex">
          <div className="text-[20px] mb-[8px] flex-1">{plug.title}</div>
          {!!data && (<div onClick={(e) => e.stopPropagation()}>
              <Slider value={activated ? 'on' : 'off'} onChange={changeActivated} fill={true}/>
            </div>)}
        </div>
        <div className="flex-1">{plug.description}</div>
        <Button>{!data ? 'Set Plug' : 'Edit Plug'}</Button>
      </div>
    </div>);
};
export const Plug = () => {
    const plug = usePlugs();
    const modals = useModals();
    const fetch = useFetch();
    const load = useCallback(() => __awaiter(void 0, void 0, void 0, function* () {
        return (yield fetch(`/integrations/${plug.providerId}/plugs`)).json();
    }), [plug.providerId]);
    const { data, isLoading, mutate } = useSWR(`plugs-${plug.providerId}`, load);
    const addEditPlug = useCallback((p) => (data) => {
        modals.openModal({
            withCloseButton: false,
            onClose() {
                mutate();
            },
            size: '500px',
            title: `Auto Plug: ${p.title}`,
            children: (<PlugPop plug={p} data={data} settings={{
                    identifier: plug.identifier,
                    providerId: plug.providerId,
                    name: plug.name,
                }}/>),
        });
    }, [data]);
    if (isLoading) {
        return null;
    }
    return (<div className="grid grid-cols-3 gap-[30px]">
      {plug.plugs.map((p) => (<PlugItem key={p.title + '-' + plug.providerId} addPlug={addEditPlug(p)} plug={p} data={data === null || data === void 0 ? void 0 : data.find((a) => a.plugFunction === p.methodName)}/>))}
    </div>);
};
//# sourceMappingURL=plug.js.map