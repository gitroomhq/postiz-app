'use client';

import React, { FC, useCallback, useState } from 'react';
import useSWR from 'swr';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useModals } from '@gitroom/frontend/components/layout/new-modal';
import { LoadingComponent } from '@gitroom/frontend/components/layout/loading';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { Button } from '@gitroom/react/form/button';
import { StatisticsModal } from '@gitroom/frontend/components/launches/statistics';

export const MissingReleaseModal: FC<{
  postId: string;
  onSuccess: () => void;
}> = ({ postId, onSuccess }) => {
  const t = useT();
  const fetch = useFetch();
  const modal = useModals();
  const toaster = useToaster();
  const [selected, setSelected] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const loadMissingContent = useCallback(async () => {
    return (await fetch(`/posts/${postId}/missing`)).json();
  }, [postId, fetch]);

  const { data, isLoading } = useSWR(
    `/posts/${postId}/missing`,
    loadMissingContent
  );

  const handleSave = useCallback(async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await fetch(`/posts/${postId}/release-id`, {
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
        children: <StatisticsModal postId={postId} />,
        size: '80%',
      });
    } catch {
      toaster.show(
        t('release_id_update_failed', 'Failed to connect post'),
        'warning'
      );
    } finally {
      setSaving(false);
    }
  }, [selected, postId, fetch, toaster, t, onSuccess, modal]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-[40px]">
        <LoadingComponent />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="text-center text-textColor py-[20px]">
        {t(
          'no_missing_content',
          'No content found from this provider. The provider may not support this feature.'
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-[16px]">
      <div className="text-[14px] text-textColor/70">
        {t(
          'select_matching_content',
          'Select the content that matches this post:'
        )}
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-[10px] max-h-[400px] overflow-y-auto scrollbar scrollbar-thumb-fifth scrollbar-track-newBgColor p-[4px]">
        {data.map((item: { id: string; url: string }) => (
          <div
            key={item.id}
            onClick={() => setSelected(item.id)}
            className={`cursor-pointer rounded-[8px] overflow-hidden border-2 transition-all ${
              selected === item.id
                ? 'border-[#612BD3] scale-[1.02]'
                : 'border-transparent hover:border-textColor/20'
            }`}
          >
            <img
              src={item.url}
              alt={item.id}
              className="w-full aspect-square object-cover"
            />
          </div>
        ))}
      </div>
      <div className="flex justify-end gap-[10px] pt-[8px] border-t border-tableBorder">
        <Button
          type="button"
          onClick={() => modal.closeAll()}
          className="bg-transparent border border-tableBorder text-textColor"
        >
          {t('cancel', 'Cancel')}
        </Button>
        <Button
          type="button"
          onClick={handleSave}
          disabled={!selected || saving}
          loading={saving}
        >
          {t('connect_post', 'Connect Post')}
        </Button>
      </div>
    </div>
  );
};
