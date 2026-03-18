'use client';
import { __awaiter } from "tslib";
import React, { useCallback, useState } from 'react';
import useSWR from 'swr';
import { useFetch } from "../../../../../libraries/helpers/src/utils/custom.fetch";
import { useT } from "../../../../../libraries/react-shared-libraries/src/translation/get.transation.service.client";
import { useModals } from "../layout/new-modal";
import { LoadingComponent } from "../layout/loading";
import { useToaster } from "../../../../../libraries/react-shared-libraries/src/toaster/toaster";
import { Button } from "../../../../../libraries/react-shared-libraries/src/form/button";
import { StatisticsModal } from "./statistics";
export const MissingReleaseModal = ({ postId, onSuccess }) => {
    const t = useT();
    const fetch = useFetch();
    const modal = useModals();
    const toaster = useToaster();
    const [selected, setSelected] = useState(null);
    const [saving, setSaving] = useState(false);
    const loadMissingContent = useCallback(() => __awaiter(void 0, void 0, void 0, function* () {
        return (yield fetch(`/posts/${postId}/missing`)).json();
    }), [postId, fetch]);
    const { data, isLoading } = useSWR(`/posts/${postId}/missing`, loadMissingContent);
    const handleSave = useCallback(() => __awaiter(void 0, void 0, void 0, function* () {
        if (!selected)
            return;
        setSaving(true);
        try {
            yield fetch(`/posts/${postId}/release-id`, {
                method: 'PUT',
                body: JSON.stringify({ releaseId: selected }),
            });
            onSuccess();
            modal.closeAll();
            modal.openModal({
                title: t('statistics', 'Statistics'),
                closeOnClickOutside: true,
                closeOnEscape: true,
                withCloseButton: true,
                classNames: {
                    modal: 'w-[100%] max-w-[1400px]',
                },
                children: <StatisticsModal postId={postId}/>,
                size: '80%',
            });
        }
        catch (_a) {
            toaster.show(t('release_id_update_failed', 'Failed to connect post'), 'warning');
        }
        finally {
            setSaving(false);
        }
    }), [selected, postId, fetch, toaster, t, onSuccess, modal]);
    if (isLoading) {
        return (<div className="flex items-center justify-center py-[40px]">
        <LoadingComponent />
      </div>);
    }
    if (!data || data.length === 0) {
        return (<div className="text-center text-textColor py-[20px]">
        {t('no_missing_content', 'No content found from this provider. The provider may not support this feature.')}
      </div>);
    }
    return (<div className="flex flex-col gap-[16px]">
      <div className="text-[14px] text-textColor/70">
        {t('select_matching_content', 'Select the content that matches this post:')}
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-[10px] max-h-[400px] overflow-y-auto scrollbar scrollbar-thumb-fifth scrollbar-track-newBgColor p-[4px]">
        {data.map((item) => (<div key={item.id} onClick={() => setSelected(item.id)} className={`cursor-pointer rounded-[8px] overflow-hidden border-2 transition-all ${selected === item.id
                ? 'border-[#612BD3] scale-[1.02]'
                : 'border-transparent hover:border-textColor/20'}`}>
            <img src={item.url} alt={item.id} className="w-full aspect-square object-cover"/>
          </div>))}
      </div>
      <div className="flex justify-end gap-[10px] pt-[8px] border-t border-tableBorder">
        <Button type="button" onClick={() => modal.closeAll()} className="bg-transparent border border-tableBorder text-textColor">
          {t('cancel', 'Cancel')}
        </Button>
        <Button type="button" onClick={handleSave} disabled={!selected || saving} loading={saving}>
          {t('connect_post', 'Connect Post')}
        </Button>
      </div>
    </div>);
};
//# sourceMappingURL=missing-release.modal.js.map