'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import useSWR, { useSWRConfig } from 'swr';
import { Input } from '@gitroom/react/form/input';
import { Button } from '@gitroom/react/form/button';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useUser } from '@gitroom/frontend/components/layout/user.context';

export const useOrganizationName = () => {
  const fetch = useFetch();

  const load = useCallback(async () => {
    return (await fetch('/settings/organization-name')).json();
  }, []);

  return useSWR<{ name: string }>('organization-name', load, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    revalidateIfStale: false,
    revalidateOnMount: true,
    refreshWhenHidden: false,
    refreshWhenOffline: false,
  });
};

const OrganizationNameComponent = () => {
  const t = useT();
  const fetch = useFetch();
  const toaster = useToaster();
  const user = useUser();
  const { mutate: globalMutate } = useSWRConfig();
  const { data, isLoading, mutate } = useOrganizationName();
  const [name, setName] = useState('');

  useEffect(() => {
    setName(data?.name || '');
  }, [data]);

  const save = useCallback(async () => {
    const response = await fetch('/settings/organization-name', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
    if (!response.ok) {
      toaster.show(
        t('could_not_update_organization_name', 'Could not update organization name'),
        'warning'
      );
      return;
    }
    mutate({ name });
    globalMutate('organizations');
    toaster.show(t('settings_updated', 'Settings updated'), 'success');
  }, [name, mutate, toaster, t]);

  if (isLoading || user?.role === 'USER') {
    return null;
  }

  return (
    <div className="my-[16px] mt-[16px] bg-sixth border-fifth border rounded-[4px] p-[24px] flex flex-col gap-[24px]">
      <div className="mt-[4px]">
        {t('organization_settings', 'Organization Settings')}
      </div>
      <div className="flex items-center gap-[24px]">
        <div className="flex flex-col flex-1">
          <div className="text-[14px]">
            {t('organization_name', 'Organization name')}
          </div>
          <div className="text-[12px] text-customColor18">
            {t(
              'organization_name_description',
              'The name shown in the organization switcher.'
            )}
          </div>
        </div>
        <Input
          value={name}
          disableForm={true}
          removeError={true}
          onChange={(e) => setName(e.target.value)}
          name="name"
          label=""
        />
        <Button className="h-[44px] mt-[7px]" disabled={!name.trim()} onClick={save}>
          {t('save', 'Save')}
        </Button>
      </div>
    </div>
  );
};

export default OrganizationNameComponent;
