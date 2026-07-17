'use client';

import { FC, useCallback, useMemo } from 'react';
import useSWR from 'swr';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useIntegration } from '@gitroom/frontend/components/launches/helpers/use.integration';
import { Select } from '@gitroom/react/form/select';
import { useSettings } from '@gitroom/frontend/components/launches/helpers/use.values';
import { useT } from '@gitroom/react/translation/get.transation.service.client';

export const AutomationSelect: FC = () => {
  const { integration } = useIntegration();
  const fetch = useFetch();
  const { register } = useSettings();
  const t = useT();
  const load = useCallback(async () => {
    return (
      await fetch(`/automations?platform=${integration?.identifier}`)
    ).json();
  }, [integration?.identifier]);
  const { data } = useSWR(`automations-${integration?.identifier}`, load, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    revalidateIfStale: false,
    revalidateOnMount: true,
    refreshWhenHidden: false,
    refreshWhenOffline: false,
    fallbackData: [],
  });
  const loadWebhooks = useCallback(async () => {
    return (await fetch('/automations/list')).json();
  }, []);
  const { data: webhookList } = useSWR('/automations/list', loadWebhooks, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    revalidateIfStale: false,
    revalidateOnMount: true,
    refreshWhenHidden: false,
    refreshWhenOffline: false,
    fallbackData: { webhooks: [] },
  });

  const { automations, missingPermissions } = useMemo(() => {
    const activated = (data || []).filter(
      (automation: any) => automation.activated
    );
    const integrationScopes: string[] = (integration as any)?.scopes || [];
    const platformWebhooks =
      webhookList?.webhooks?.find(
        (platform: any) => platform.identifier === integration?.identifier
      )?.webhooks || [];

    // only automations whose webhook scopes are covered by the permissions
    // the channel was connected with can be selected
    const allowedFunctions = platformWebhooks
      .filter((webhook: any) =>
        (webhook.scopes || []).every((scope: string) =>
          integrationScopes.includes(scope)
        )
      )
      .map((webhook: any) => webhook.methodName);

    const allowed = activated.filter((automation: any) =>
      allowedFunctions.includes(automation.automationFunction)
    );

    return {
      automations: allowed,
      missingPermissions: activated.length - allowed.length,
    };
  }, [data, webhookList, integration]);

  if (!automations.length && !missingPermissions) {
    return null;
  }

  return (
    <div className="flex flex-col gap-[10px] border-tableBorder border p-[15px] rounded-lg mb-[10px]">
      <div>{t('automation', 'Automation')}</div>
      {!!automations.length && (
        <Select label="" hideErrors={true} {...register('automationId')}>
          <option value="">{t('no_automation', 'No automation')}</option>
          {automations.map((automation: any) => (
            <option key={automation.id} value={automation.id}>
              {automation.name}
            </option>
          ))}
        </Select>
      )}
      {!!missingPermissions && (
        <div className="text-[13px] text-red-400">
          {t(
            'automation_missing_permissions',
            "Some automations can't be added to this channel because it's missing new permissions, please reconnect the channel to use them"
          )}
        </div>
      )}
    </div>
  );
};
