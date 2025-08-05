'use client';

import React, { FC, useCallback } from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { Button } from '@gitroom/react/form/button';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { deleteDialog } from '@gitroom/react/helpers/delete.dialog';

export const UserComponent: FC = () => {
  const fetch = useFetch();
  const toast = useToaster();
  const t = useT();

  const deleteAccount = useCallback(async () => {
    try {
      const res = await fetch('/user/delete', {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete account');

      toast.show(
        t('account_deleted', 'Account deleted successfully.'),
        'success'
      );
      window.location.href = '/';
    } catch (err) {
      toast.show(
        t(
          'delete_account_failed',
          'Failed to delete account. Please try again.'
        ),
        'warning'
      );
    }
  }, []);

  const confirmDelete = useCallback(async () => {
    const confirmed = await deleteDialog(
      t(
        'delete_account_confirmation',
        'Are you sure you want to delete your account? This action cannot be undone.'
      ),
      t('delete', 'Delete')
    );

    if (confirmed) deleteAccount();
  }, [deleteAccount]);

  return (
    <div className="flex flex-col">
      <h3 className="text-[20px]">{t('delete_account', 'Delete Account')}</h3>
      <div className="text-customColor18 mt-[4px]">
        {t(
          'delete_account_description',
          'Permanently delete your account and all associated data. This cannot be undone.'
        )}
      </div>
      <div className="my-[16px] bg-sixth border-red-500 border rounded-[4px] p-[24px] flex items-center justify-between">
        <div className="flex flex-col">
          <div className="text-[16px] font-medium text-red-600">
            {t('are_you_sure', 'Are you sure?')}
          </div>
          <div className="text-customColor18 text-sm">
            {t(
              'delete_warning',
              'Deleting your account will remove all data permanently. This cannot be undone.'
            )}
          </div>
        </div>
        <Button onClick={confirmDelete}>
          {t('delete_account_button', 'Delete Account')}
        </Button>
      </div>
    </div>
  );
};
