'use client';

import React, { FC, useCallback, useState } from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { deleteDialog } from '@gitroom/react/helpers/delete.dialog';
import { Button } from '@gitroom/react/form/button';
import { useVariables } from '@gitroom/react/helpers/variable.context';
import { setCookie } from '@gitroom/frontend/components/layout/layout.context';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { Spinner } from '@gitroom/react/ui/spinner';
import { TrashIcon } from '@gitroom/frontend/components/ui/icons';
import { useUser } from '@gitroom/frontend/components/layout/user.context';
import { useRouter } from 'next/navigation';

const DeleteAccountComponent: FC<{ isLink?: boolean }> = ({ isLink }) => {
  const t = useT();
  const fetch = useFetch();
  const toaster = useToaster();
  const user = useUser();
  const router = useRouter();
  const { isSecured } = useVariables();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const goToAccount = useCallback(() => {
    router.push('/settings?tab=account');
  }, [router]);

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
        body: JSON.stringify({
          email,
          password: password || undefined,
        }),
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
  }, [fetch, isSecured, t, toaster, email, password]);

  const loadingOverlay = loading && (
    <div className="text-textColor fixed start-0 top-0 bg-primary/80 z-[500] w-full h-full animate-fade flex flex-col items-center justify-center gap-[24px]">
      <Spinner width={48} height={48} borderWidth={3} className="text-pqBrand" />
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
  );

  if (isLink) {
    return (
      <>
        {loadingOverlay}
        <button
          type="button"
          className="cursor-pointer flex items-center gap-[8px] text-pqDanger hover:opacity-80 transition-opacity text-[14px]"
          onClick={goToAccount}
        >
          <TrashIcon size={16} />
          <div>{t('delete_account', 'Delete Account')}</div>
        </button>
      </>
    );
  }

  return (
    <div className="rounded-pqMd bg-pqPop shadow-[inset_0_0_0_1px_var(--border)] p-[15px_16px]">
      {loadingOverlay}
      <div className="text-[13.5px] font-[600] text-pqText">
        {t('delete_account', 'Delete Account')}
      </div>
      <div className="mt-[3px] text-[12.5px] text-pqMuted">
        {t(
          'delete_account_description',
          'Your account, organizations and channels will be deleted permanently'
        )}
      </div>
      <div className="mt-[12px] flex min-w-0 flex-col gap-[10px]">
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder={t('type_your_email', 'Type your email to confirm')}
          className="h-[40px] min-w-0 w-full rounded-[10px] bg-pqTableHeader px-[12px] text-[14px] text-pqText outline-none shadow-[inset_0_0_0_1px_var(--border)] focus:shadow-[inset_0_0_0_1px_var(--brand)]"
        />
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder={t('current_password', 'Current password')}
          className="h-[40px] min-w-0 w-full rounded-[10px] bg-pqTableHeader px-[12px] text-[14px] text-pqText outline-none shadow-[inset_0_0_0_1px_var(--border)] focus:shadow-[inset_0_0_0_1px_var(--brand)]"
        />
        <p className="text-[12px] leading-[1.4] text-pqMuted">
          {t(
            'delete_account_password_hint',
            'Or re-authenticate with a connected account instead of a password.'
          )}
        </p>
      </div>
      <div className="mt-[14px] flex justify-end">
        <Button
          variant="danger"
          className="shrink-0"
          loading={loading}
          disabled={!user?.email || email.trim().toLowerCase() !== user.email.toLowerCase()}
          onClick={deleteAccount}
        >
          {t('delete_account', 'Delete Account')}
        </Button>
      </div>
    </div>
  );
};

export default DeleteAccountComponent;
