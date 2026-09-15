'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useUser } from '@gitroom/frontend/components/layout/user.context';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { Button } from '@gitroom/react/form/button';
import { useSWRConfig } from 'swr';

const WorkspaceNameComponent = () => {
  const t = useT();
  const fetch = useFetch();
  const user = useUser();
  const toaster = useToaster();
  const { mutate } = useSWRConfig();
  const [name, setName] = useState(user?.orgName || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(user?.orgName || '');
  }, [user?.orgName]);

  const save = useCallback(async () => {
    const next = name.trim();
    if (next.length < 3 || next.length > 64) {
      toaster.show(
        t(
          'workspace_name_length',
          'Workspace name must be between 3 and 64 characters'
        ),
        'warning'
      );
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/settings/organization', {
        method: 'POST',
        body: JSON.stringify({ name: next }),
      });
      if (!res.ok) {
        const { message } = await res.json().catch(() => ({ message: '' }));
        toaster.show(
          message || t('could_not_save', 'Could not save'),
          'warning'
        );
        return;
      }
      const body = await res.json();
      setName(body.name);
      await mutate('/user/self');
      toaster.show(t('settings_updated', 'Settings updated'), 'success');
    } finally {
      setSaving(false);
    }
  }, [name, fetch, toaster, t, mutate]);

  if (user?.role !== 'SUPERADMIN') {
    return null;
  }

  return (
    <div className="rounded-pqMd bg-pqPop p-[15px_16px] shadow-[inset_0_0_0_1px_var(--border)]">
      <div className="text-[13.5px] font-[600] text-pqText">
        {t('workspace_name', 'Workspace name')}
      </div>
      <div className="mt-[2px] text-[12px] text-pqMuted">
        {t(
          'workspace_name_description',
          'Shown in the workspace switcher and on invoices.'
        )}
      </div>
      <input
        value={name}
        onChange={(event) => setName(event.target.value)}
        className="mt-[12px] h-[40px] w-full rounded-[10px] bg-pqTableHeader px-[12px] text-[14px] text-pqText outline-none shadow-[inset_0_0_0_1px_var(--border)] focus:shadow-[inset_0_0_0_1px_var(--brand)]"
      />
      <div className="mt-[12px]">
        <Button loading={saving} onClick={save}>
          {t('save', 'Save')}
        </Button>
      </div>
    </div>
  );
};

export default WorkspaceNameComponent;
