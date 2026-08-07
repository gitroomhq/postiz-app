'use client';

import { FC, useCallback } from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import useSWR from 'swr';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { deleteDialog } from '@gitroom/react/helpers/delete.dialog';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useDateFormat } from '@gitroom/frontend/components/launches/helpers/date.format';

const useApprovedApps = () => {
  const fetch = useFetch();
  const load = useCallback(async () => {
    return (await fetch('/user/approved-apps')).json();
  }, []);
  return useSWR('approved-apps', load, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    revalidateIfStale: false,
  });
};

export const ApprovedAppsComponent: FC = () => {
  const fetch = useFetch();
  const toaster = useToaster();
  const t = useT();
  const { formatDate } = useDateFormat();
  const { data: apps, mutate } = useApprovedApps();

  const revokeApp = useCallback(
    (app: any) => async () => {
      if (
        await deleteDialog(
          t(
            'are_you_sure_revoke_access',
            `Are you sure you want to revoke access for ${app.oauthApp?.name}?`,
            { name: app.oauthApp?.name }
          )
        )
      ) {
        try {
          await fetch(`/user/approved-apps/${app.id}`, {
            method: 'DELETE',
          });
          toaster.show(
            t('access_revoked', 'Access revoked successfully'),
            'success'
          );
          mutate();
        } catch {
          toaster.show(t('failed_to_revoke', 'Failed to revoke access'), 'warning');
        }
      }
    },
    []
  );

  if (apps === undefined) {
    return null;
  }

  return (
    <div className="flex flex-col">
      <div className="mt-[18px] overflow-hidden rounded-pqMd bg-pqPop shadow-[inset_0_0_0_1px_var(--border)]">
        {!apps?.length ? (
          <div className="p-[12px_15px] text-pqMuted">
            {t('no_approved_apps', 'No approved apps yet.')}
          </div>
        ) : (
          apps.map((app: any) => (
            <div
              key={app.id}
              className="flex items-center gap-[12px] border-b border-pqLine p-[12px_15px] last:border-b-0"
            >
              {app.oauthApp?.picture?.path ? (
                <img
                  src={app.oauthApp.picture.path}
                  alt={app.oauthApp.name}
                  className="h-[40px] w-[40px] shrink-0 rounded-full object-cover"
                />
              ) : (
                <div className="grid h-[40px] w-[40px] shrink-0 place-items-center rounded-full bg-pqSettings text-[15px] font-[600] text-pqMuted">
                  {app.oauthApp?.name?.[0]?.toUpperCase() || '?'}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="truncate text-[14px] font-[700]">
                  {app.oauthApp?.name}
                </div>
                {app.oauthApp?.description && (
                  <div className="text-[12px] text-pqMuted">
                    {app.oauthApp.description}
                  </div>
                )}
                <div className="text-[12px] text-pqMuted">
                  {t('authorized_on', 'Authorized on')}{' '}
                  {formatDate(app.createdAt)}
                </div>
              </div>
              <button
                type="button"
                onClick={revokeApp(app)}
                className="flex h-[30px] shrink-0 items-center rounded-[8px] bg-pqSettings px-[14px] text-[12.5px] font-[600] text-pqText transition-colors hover:text-pqWarn"
              >
                {t('revoke', 'Revoke')}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
