'use client';

import React, { FC, useCallback, useMemo } from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import useSWR from 'swr';
import { useUser } from '@gitroom/frontend/components/layout/user.context';
import clsx from 'clsx';
export const OrganizationSelector: FC<{ asOpenSelect?: boolean }> = ({
  asOpenSelect,
}) => {
  const fetch = useFetch();
  const user = useUser();
  const load = useCallback(async () => {
    return await (await fetch('/user/organizations')).json();
  }, []);
  const { isLoading, data } = useSWR('organizations', load, {
    revalidateIfStale: false,
    revalidateOnFocus: false,
    refreshWhenOffline: false,
    refreshWhenHidden: false,
    revalidateOnReconnect: false,
  });
  const current = useMemo(() => {
    return data?.find((d: any) => d.id === user?.orgId);
  }, [data]);
  const withoutCurrent = useMemo(() => {
    return data?.filter((d: any) => d.id !== user?.orgId);
  }, [current, data]);
  const changeOrg = useCallback(
    (org: { name: string; id: string }) => async () => {
      await fetch('/user/change-org', {
        method: 'POST',
        body: JSON.stringify({
          id: org.id,
        }),
      });
      window.location.reload();
    },
    []
  );
  if (isLoading || (!isLoading && data?.length === 1)) {
    return null;
  }
  return (
    <>
      <div className="hover:text-newTextColor">
        <div className="group text-[12px] relative">
          {asOpenSelect && (
            <div className="bg-btnPrimary !flex !relative max-w-[500px] mx-auto py-[12px] px-[12px]">Select Organization</div>
          )}
          {!asOpenSelect && (
            <div className="flex items-center">
              <svg
                width="24"
                height="24"
                viewBox="0 0 26 26"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M13 0.25C10.4783 0.25 8.01321 0.997774 5.91648 2.39876C3.81976 3.79975 2.18556 5.79103 1.22054 8.12079C0.255524 10.4505 0.00303191 13.0141 0.494993 15.4874C0.986955 17.9607 2.20127 20.2325 3.98439 22.0156C5.76751 23.7987 8.03935 25.0131 10.5126 25.505C12.9859 25.997 15.5495 25.7445 17.8792 24.7795C20.209 23.8144 22.2003 22.1802 23.6012 20.0835C25.0022 17.9868 25.75 15.5217 25.75 13C25.746 9.61971 24.4015 6.379 22.0112 3.98877C19.621 1.59854 16.3803 0.25397 13 0.25ZM5.93001 21.75C6.66349 20.5303 7.70003 19.5212 8.93889 18.8206C10.1777 18.12 11.5768 17.7518 13 17.7518C14.4232 17.7518 15.8223 18.12 17.0611 18.8206C18.3 19.5212 19.3365 20.5303 20.07 21.75C18.0705 23.3714 15.5743 24.2563 13 24.2563C10.4257 24.2563 7.92955 23.3714 5.93001 21.75ZM8.75001 12C8.75001 11.1594 8.99926 10.3377 9.46626 9.63883C9.93326 8.93992 10.597 8.39518 11.3736 8.07351C12.1502 7.75184 13.0047 7.66768 13.8291 7.83166C14.6536 7.99565 15.4108 8.40042 16.0052 8.9948C16.5996 9.58917 17.0044 10.3464 17.1683 11.1709C17.3323 11.9953 17.2482 12.8498 16.9265 13.6264C16.6048 14.403 16.0601 15.0668 15.3612 15.5337C14.6623 16.0007 13.8406 16.25 13 16.25C11.8728 16.25 10.7918 15.8022 9.9948 15.0052C9.19777 14.2082 8.75001 13.1272 8.75001 12ZM21.1888 20.705C20.0103 18.8727 18.2489 17.4908 16.1888 16.7825C17.216 16.0983 17.9959 15.1016 18.413 13.9399C18.8301 12.7783 18.8623 11.5132 18.5049 10.3318C18.1475 9.15035 17.4194 8.11531 16.4282 7.37968C15.4371 6.64404 14.2356 6.24686 13.0013 6.24686C11.767 6.24686 10.5654 6.64404 9.57429 7.37968C8.58316 8.11531 7.85505 9.15035 7.49762 10.3318C7.14019 11.5132 7.17241 12.7783 7.58952 13.9399C8.00662 15.1016 8.78647 16.0983 9.81376 16.7825C7.75358 17.4908 5.99217 18.8727 4.81376 20.705C3.30729 19.1064 2.30179 17.1017 1.92131 14.9382C1.54082 12.7748 1.80201 10.5474 2.67264 8.53066C3.54327 6.51396 4.98524 4.79624 6.82066 3.58946C8.65609 2.38267 10.8046 1.7396 13.0013 1.7396C15.1979 1.7396 17.3464 2.38267 19.1818 3.58946C21.0173 4.79624 22.4592 6.51396 23.3299 8.53066C24.2005 10.5474 24.4617 12.7748 24.0812 14.9382C23.7007 17.1017 22.6952 19.1064 21.1888 20.705Z"
                  fill="currentColor"
                />
              </svg>
            </div>
          )}
          {data?.length > 1 && (
            <div
              className={clsx(
                'hidden py-[12px] px-[12px] group-hover:flex absolute top-[100%] end-0 bg-third border-tableBorder border gap-[12px] cursor-pointer flex-col',
                asOpenSelect ? '!flex !relative max-w-[500px] mx-auto mb-[10px]' : '',
              )}
            >
              {data?.map((org: { name: string; id: string }) => (
                <div key={org.id} onClick={changeOrg(org)}>
                  {org.name}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      {!asOpenSelect && <div className="w-[1px] h-[20px] bg-blockSeparator" />}
    </>
  );
};
