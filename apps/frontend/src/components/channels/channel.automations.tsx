'use client';

import { FC, useCallback, useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useModals } from '@gitroom/frontend/components/layout/new-modal';
import {
  PlugsContext,
  PlugsInterface,
} from '@gitroom/frontend/components/plugs/plugs.context';
import { PlugPop } from '@gitroom/frontend/components/plugs/plug';
import { Slider } from '@gitroom/react/form/slider';
import clsx from 'clsx';

/**
 * Design chPlugs — compact automations list on the Channels detail pane.
 * Same activate / edit APIs as /plugs; layout is row cards, not the 300px grid.
 */

const ChannelPlugRow: FC<{
  plug: PlugsInterface;
  providerId: string;
  identifier: string;
  name: string;
  data?: {
    activated: boolean;
    data: string;
    id: string;
    integrationId: string;
    organizationId: string;
    plugFunction: string;
  };
  mutate: () => void;
}> = ({ plug, providerId, identifier, name, data, mutate }) => {
  const t = useT();
  const fetch = useFetch();
  const modals = useModals();
  const [activated, setActivated] = useState(!!data?.activated);

  useEffect(() => {
    setActivated(!!data?.activated);
  }, [data?.activated]);

  const changeActivated = useCallback(
    async (status: 'on' | 'off') => {
      if (!data?.id) return;
      await fetch(`/integrations/plugs/${data.id}/activate`, {
        body: JSON.stringify({ status: status === 'on' }),
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
      });
      setActivated(status === 'on');
    },
    [data?.id, fetch]
  );

  const openEdit = useCallback(() => {
    modals.openModal({
      withCloseButton: false,
      onClose() {
        mutate();
      },
      size: '500px',
      title: `${t('auto_plug', 'Auto Plug')}: ${plug.title}`,
      children: (
        <PlugPop
          plug={plug}
          data={data}
          settings={{ identifier, providerId, name }}
        />
      ),
    });
  }, [data, identifier, modals, mutate, name, plug, providerId, t]);

  return (
    <div className="flex flex-col gap-[9px] border-b border-pqLine px-[15px] py-[14px] last:border-b-0">
      <div className="flex items-center gap-[11px]">
        <span className="grid size-[30px] shrink-0 place-items-center rounded-[9px] bg-pqBrandSoft text-pqFocused">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none">
            <path
              d="M13 2 4.5 13.5H11l-1 8.5 8.5-11.5H12l1-8.5Z"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <span className="min-w-0 flex-1 truncate text-[13.5px] font-[600] text-pqText">
          {plug.title}
        </span>
        <span
          className={clsx(
            'grid h-[20px] shrink-0 place-items-center rounded-full px-[8px] text-[11px] font-[600]',
            data
              ? activated
                ? 'bg-pqOkSoft text-pqOk'
                : 'bg-pqSettings text-pqMuted'
              : 'bg-pqSettings text-pqSoft'
          )}
        >
          {data
            ? activated
              ? t('active', 'Active')
              : t('paused', 'Paused')
            : t('not_set', 'Not set')}
        </span>
        {!!data && (
          <div onClick={(e) => e.stopPropagation()}>
            <Slider
              value={activated ? 'on' : 'off'}
              onChange={changeActivated}
              fill={true}
            />
          </div>
        )}
      </div>
      <div className="text-[12.5px] leading-[1.55] text-pqMuted">
        {plug.description}
      </div>
      <button
        type="button"
        onClick={openEdit}
        className={clsx(
          'h-[30px] self-start rounded-pqSm px-[12px] text-[12.5px] font-[600]',
          data
            ? 'bg-pqBtnSimple text-pqText hover:bg-pqHover'
            : 'bg-pqBrand text-pqOnBrand'
        )}
      >
        {data ? t('edit', 'Edit') : t('set_plug', 'Set Plug')}
      </button>
    </div>
  );
};

export const ChannelAutomations: FC<{ integration: any }> = ({
  integration,
}) => {
  const t = useT();
  const fetch = useFetch();

  const loadCatalog = useCallback(async (path: string) => {
    return await (await fetch(path)).json();
  }, [fetch]);

  const { data: plugList } = useSWR('/integrations/plug/list', loadCatalog, {
    revalidateOnFocus: false,
  });

  const match = useMemo(() => {
    return plugList?.plugs?.find(
      (f: any) => f.identifier === integration.identifier
    );
  }, [integration.identifier, plugList]);

  const loadActive = useCallback(async () => {
    return (await fetch(`/integrations/${integration.id}/plugs`)).json();
  }, [fetch, integration.id]);

  const { data: active, mutate } = useSWR(
    match ? `plugs-${integration.id}` : null,
    loadActive
  );

  if (!match?.plugs?.length) {
    return null;
  }

  const ctx = {
    providerId: integration.id,
    name: integration.name,
    identifier: integration.identifier,
    plugs: match.plugs as PlugsInterface[],
  };

  return (
    <div data-channel-automations="1" className="flex flex-col gap-[8px]">
      <div className="px-[2px] text-[10.5px] font-[600] uppercase tracking-[0.07em] text-pqSoft">
        {t('automations', 'Automations')}
      </div>
      <div className="overflow-hidden rounded-pqMd bg-pqPop shadow-[inset_0_0_0_1px_var(--border)]">
        <PlugsContext.Provider value={ctx}>
          {match.plugs.map((plug: PlugsInterface) => (
            <ChannelPlugRow
              key={plug.methodName}
              plug={plug}
              providerId={integration.id}
              identifier={integration.identifier}
              name={integration.name}
              data={active?.find(
                (a: any) => a.plugFunction === plug.methodName
              )}
              mutate={mutate}
            />
          ))}
        </PlugsContext.Provider>
      </div>
    </div>
  );
};
