'use client';
import { __awaiter } from "tslib";
import 'reflect-metadata';
import React, { Fragment, useCallback, useState } from 'react';
import { useFetch } from "../../../../../libraries/helpers/src/utils/custom.fetch";
import useSWR from 'swr';
import { useUser } from "../layout/user.context";
import { Button } from "../../../../../libraries/react-shared-libraries/src/form/button";
import { Input } from "../../../../../libraries/react-shared-libraries/src/form/input";
import { useToaster } from "../../../../../libraries/react-shared-libraries/src/toaster/toaster";
import clsx from 'clsx';
import { deleteDialog } from "../../../../../libraries/react-shared-libraries/src/helpers/delete.dialog";
import { useT } from "../../../../../libraries/react-shared-libraries/src/translation/get.transation.service.client";
import { AddEditModal } from "../new-launch/add.edit.modal";
import { newDayjs } from "../layout/set.timezone";
import { useModals } from "../layout/new-modal";
const SaveSetModal = ({ postData, onSave, onCancel, initialValue }) => {
    const [name, setName] = useState(initialValue);
    const t = useT();
    const handleSubmit = (e) => {
        e.preventDefault();
        if (name.trim()) {
            onSave(name.trim());
        }
    };
    return (<form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <Input label="Set Name" translationKey="label_set_name" name="setName" value={name} disableForm={true} onChange={(e) => setName(e.target.value)} placeholder="Enter a name for this set" autoFocus/>
      </div>
      <div className="flex gap-2 justify-end">
        <Button type="button" secondary onClick={onCancel}>
          {t('cancel', 'Cancel')}
        </Button>
        <Button type="submit" disabled={!name.trim()}>
          {t('save', 'Save')}
        </Button>
      </div>
    </form>);
};
export const Sets = () => {
    const fetch = useFetch();
    const user = useUser();
    const modal = useModals();
    const toaster = useToaster();
    const load = useCallback((path) => __awaiter(void 0, void 0, void 0, function* () {
        return (yield (yield fetch(path)).json()).integrations;
    }), []);
    const { isLoading, data: integrations } = useSWR('/integrations/list', load, {
        revalidateOnFocus: false,
        revalidateOnReconnect: false,
        revalidateIfStale: false,
        revalidateOnMount: true,
        refreshWhenHidden: false,
        refreshWhenOffline: false,
        fallbackData: [],
    });
    const list = useCallback(() => __awaiter(void 0, void 0, void 0, function* () {
        return (yield fetch('/sets')).json();
    }), []);
    const { data, mutate } = useSWR('sets', list, {
        revalidateOnFocus: false,
        revalidateOnReconnect: false,
        revalidateIfStale: false,
        revalidateOnMount: true,
        refreshWhenHidden: false,
        refreshWhenOffline: false,
    });
    const addSet = useCallback((params) => () => {
        modal.openModal({
            id: 'add-edit-modal',
            closeOnClickOutside: false,
            removeLayout: true,
            closeOnEscape: false,
            withCloseButton: false,
            askClose: true,
            fullScreen: true,
            classNames: {
                modal: 'w-[100%] max-w-[1400px] text-textColor',
            },
            children: (<AddEditModal allIntegrations={integrations.map((p) => (Object.assign({}, p)))} {...((params === null || params === void 0 ? void 0 : params.id) ? { set: JSON.parse(params.content) } : {})} addEditSets={(data) => {
                    modal.openModal({
                        title: 'Save as Set',
                        children: (<SaveSetModal initialValue={(params === null || params === void 0 ? void 0 : params.name) || ''} postData={data} onSave={(name) => __awaiter(void 0, void 0, void 0, function* () {
                                try {
                                    yield fetch('/sets', {
                                        method: 'POST',
                                        body: JSON.stringify(Object.assign(Object.assign({}, ((params === null || params === void 0 ? void 0 : params.id) ? { id: params.id } : {})), { name, content: JSON.stringify(data) })),
                                    });
                                    modal.closeAll();
                                    mutate();
                                    toaster.show('Set saved successfully', 'success');
                                }
                                catch (error) {
                                    toaster.show('Failed to save set', 'warning');
                                }
                            })} onCancel={() => modal.closeAll()}/>),
                    });
                }} reopenModal={() => { }} mutate={() => { }} integrations={integrations} date={newDayjs()}/>),
            title: ``,
        });
    }, [integrations]);
    const deleteSet = useCallback((data) => () => __awaiter(void 0, void 0, void 0, function* () {
        if (yield deleteDialog(`Are you sure you want to delete ${data.name}?`)) {
            yield fetch(`/sets/${data.id}`, {
                method: 'DELETE',
            });
            mutate();
            toaster.show('Set deleted successfully', 'success');
        }
    }), []);
    const t = useT();
    return (<div className="flex flex-col">
      <h3 className="text-[20px]">Sets ({(data === null || data === void 0 ? void 0 : data.length) || 0})</h3>
      <div className="text-customColor18 mt-[4px]">
        Manage your content sets for easy reuse across posts.
      </div>
      <div className="my-[16px] mt-[16px] bg-sixth border-fifth items-center border rounded-[4px] p-[24px] flex gap-[24px]">
        <div className="flex flex-col w-full">
          {!!(data === null || data === void 0 ? void 0 : data.length) && (<div className="grid grid-cols-[2fr,1fr,1fr] w-full gap-y-[10px]">
              <div>{t('name', 'Name')}</div>
              <div>{t('edit', 'Edit')}</div>
              <div>{t('delete', 'Delete')}</div>
              {data === null || data === void 0 ? void 0 : data.map((p) => (<Fragment key={p.id}>
                  <div className="flex flex-col justify-center">{p.name}</div>
                  <div className="flex flex-col justify-center">
                    <div>
                      <Button onClick={addSet(p)}>{t('edit', 'Edit')}</Button>
                    </div>
                  </div>
                  <div className="flex flex-col justify-center">
                    <div>
                      <Button onClick={deleteSet(p)}>
                        {t('delete', 'Delete')}
                      </Button>
                    </div>
                  </div>
                </Fragment>))}
            </div>)}
          <div>
            <Button onClick={addSet()} className={clsx(((data === null || data === void 0 ? void 0 : data.length) || 0) > 0 && 'my-[16px]')}>
              Add a set
            </Button>
          </div>
        </div>
      </div>
    </div>);
};
//# sourceMappingURL=sets.js.map