'use client';

import React, { FC, useCallback, useState } from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { Button } from '@gitroom/react/form/button';
import { Input } from '@gitroom/react/form/input';
import { useVariables } from '@gitroom/react/helpers/variable.context';
import { setCookie } from '@gitroom/frontend/components/layout/layout.context';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useModals } from '@gitroom/frontend/components/layout/new-modal';
import { useUser } from '@gitroom/frontend/components/layout/user.context';
import { TrashIcon } from '@gitroom/frontend/components/ui/icons';

// postmonster: Delete account (PRD 9) - the deletion is confirmed by typing
// the account email in a modal, then the backend wipes the account in one
// transaction and sends a confirmation email

const DeleteAccountModal: FC<{
  email: string;
  onDeleted: () => void;
}> = ({ email, onDeleted }) => {
  const t = useT();
  const fetch = useFetch();
  const toaster = useToaster();
  const modals = useModals();
  const [typed, setTyped] = useState('');
  const [loading, setLoading] = useState(false);

  const confirmed = typed.trim().toLowerCase() === (email || '').toLowerCase();

  return (
    <div className="rounded-[4px] border border-newTableBorder bg-newBgColorInner p-[16px] flex flex-col gap-[12px] min-w-[380px]">
      <div className="text-[16px] font-[600]">
        {t('delete_account_title', 'Delete your account?')}
      </div>
      <div className="text-[13px] opacity-80">
        {t(
          'delete_account_warning',
          'Your account, its workspaces, channels, posts and media will be deleted. Connected channels are disconnected and their access revoked. This cannot be undone.'
        )}
      </div>
      <Input
        label={t('delete_account_confirm_email', 'Type your email to confirm')}
        translationKey="delete_account_confirm_email"
        name="delete-account-email"
        value={typed}
        disableForm
        onChange={(e: any) => setTyped(e.target.value)}
        placeholder={email}
      />
      <div className="flex gap-[8px] justify-end">
        <Button secondary onClick={() => modals.closeCurrent()}>
          {t('cancel', 'Cancel')}
        </Button>
        <Button
          className="!bg-red-800"
          disabled={!confirmed}
          loading={loading}
          onClick={async () => {
            setLoading(true);
            try {
              const response = await fetch('/user/delete-account', {
                method: 'POST',
                body: JSON.stringify({ email: typed.trim() }),
              });
              if (response.status !== 200 && response.status !== 201) {
                const { message } = await response.json().catch(() => ({
                  message: '',
                }));
                toaster.show(
                  message ||
                    t(
                      'could_not_delete_account',
                      'Could not delete your account'
                    ),
                  'warning'
                );
                return;
              }
              modals.closeCurrent();
              onDeleted();
            } finally {
              setLoading(false);
            }
          }}
        >
          {t('delete_account', 'Delete Account')}
        </Button>
      </div>
    </div>
  );
};

const DeleteAccountComponent: FC<{ isLink?: boolean }> = ({ isLink }) => {
  const t = useT();
  const user = useUser();
  const modals = useModals();
  const { isSecured } = useVariables();

  const afterDelete = useCallback(() => {
    if (!isSecured) {
      setCookie('auth', '', -10);
    }
    window.location.href = '/';
  }, [isSecured]);

  const openDeleteModal = useCallback(async () => {
    modals.openModal({
      title: '',
      closeOnClickOutside: true,
      closeOnEscape: true,
      classNames: {
        modal: 'text-textColor',
      },
      children: (
        <DeleteAccountModal
          email={user?.email || ''}
          onDeleted={afterDelete}
        />
      ),
    });
  }, [modals, afterDelete, user?.email]);

  if (isLink) {
    return (
      <div
        className="cursor-pointer flex items-center gap-[8px] text-red-400 hover:text-red-500 text-[14px]"
        onClick={openDeleteModal}
      >
        <TrashIcon size={16} />
        <div>{t('delete_account', 'Delete Account')}</div>
      </div>
    );
  }

  return (
    <div className="my-[16px] mt-[16px] bg-sixth border-fifth border rounded-[4px] p-[24px] flex flex-col gap-[24px]">
      <div className="mt-[4px]">{t('delete_account', 'Delete Account')}</div>
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <div className="text-[14px]">
            {t('delete_your_account', 'Delete your account')}
          </div>
          <div className="text-[12px] text-textItemBlur">
            {t(
              'delete_account_description',
              'Your account, its workspaces, channels, posts and media will be deleted permanently'
            )}
          </div>
        </div>
        <Button
          className="!bg-red-800"
          onClick={openDeleteModal}
        >
          {t('delete_account', 'Delete Account')}
        </Button>
      </div>
    </div>
  );
};

export default DeleteAccountComponent;
