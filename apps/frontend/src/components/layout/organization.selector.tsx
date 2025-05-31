'use client';

import { useCallback, useMemo } from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import useSWR from 'swr';
import { useUser } from '@gitroom/frontend/components/layout/user.context';
export const OrganizationSelector = () => {
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
    <div className="bg-third h-[48px] flex items-center min-w-[172px] select-none relative group">
      <div className="border-tableBorder py-[8px] px-[12px] border w-full h-full flex items-center">
        <div className="flex-1">{current?.name || 'Loading...'}</div>
        {data?.length > 1 && (
          <div>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
            >
              <g clipPath="url(#clip0_140_1160)">
                <path
                  d="M3.33301 5.66669L7.99967 10.3334L12.6663 5.66669"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </g>
              <defs>
                <clipPath id="clip0_140_1160">
                  <rect width="16" height="16" fill="white" />
                </clipPath>
              </defs>
            </svg>
          </div>
        )}
      </div>
      {data?.length > 1 && (
        <div className="hidden py-[12px] px-[12px] group-hover:flex w-full absolute top-[100%] start-0 bg-third border-tableBorder border-x border-b gap-[12px] cursor-pointer flex-col">
          {withoutCurrent?.map((org: { name: string; id: string }) => (
            <div key={org.id} onClick={changeOrg(org)}>
              {org.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
