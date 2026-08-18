'use client';

import React, { useCallback, useState } from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { deleteDialog } from '@gitroom/react/helpers/delete.dialog';
import { Button } from '@gitroom/react/form/button';
import { useVariables } from '@gitroom/react/helpers/variable.context';
import { setCookie } from '@gitroom/frontend/components/layout/layout.context';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { useT } from '@gitroom/react/translation/get.transation.service.client';

const DeleteAccountComponent = () => {
  const t = useT();
  const fetch = useFetch();
  const toaster = useToaster();
  const { isSecured } = useVariables();
  const [loading, setLoading] = useState(false);

  const deleteAccount = useCallback(async () => {
    if (
      !(await deleteDialog(
        t(
          'delete_account_confirm',
          'Your account, organizations, channels and posts will be deleted. This action cannot be undone, are you sure?'
        ),
        t('yes_delete_my_account', 'Yes, delete my account')
      ))
    ) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/user/delete-account', {
        method: 'POST',
      });

      if (response.status !== 200 && response.status !== 201) {
        const { message } = await response.json().catch(() => ({
          message: '',
        }));
        toaster.show(
          message ||
            t('could_not_delete_account', 'Could not delete your account'),
          'warning'
        );
        return;
      }

      if (!isSecured) {
        setCookie('auth', '', -10);
      }
      window.location.href = '/';
    } finally {
      setLoading(false);
    }
  }, [isSecured]);

  return (
    <div className="my-[16px] mt-[16px] bg-sixth border-fifth border rounded-[4px] p-[24px] flex flex-col gap-[24px]">
      {loading && (
        <div className="text-textColor fixed start-0 top-0 bg-primary/80 z-[500] w-full h-full animate-fade flex flex-col items-center justify-center gap-[24px]">
          <div className="w-[48px] h-[48px] border-[3px] border-forth border-t-transparent rounded-full animate-spin" />
          <div className="text-[20px] font-semibold">
            {t('deleting_your_account', 'Deleting your account...')}
          </div>
          <div className="text-[14px] text-textItemBlur">
            {t(
              'deleting_your_account_description',
              'We are removing your channels and posts, this can take a while. Please don’t close this window.'
            )}
          </div>
        </div>
      )}
      <div className="mt-[4px]">{t('delete_account', 'Delete Account')}</div>
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <div className="text-[14px]">
            {t('delete_your_account', 'Delete your account')}
          </div>
          <div className="text-[12px] text-textItemBlur">
            {t(
              'delete_account_description',
              'Your account, organizations and channels will be deleted permanently'
            )}
          </div>
        </div>
        <Button
          className="!bg-red-800"
          loading={loading}
          onClick={deleteAccount}
        >
          {t('delete_account', 'Delete Account')}
        </Button>
      </div>
    </div>
  );
};

export default DeleteAccountComponent;
