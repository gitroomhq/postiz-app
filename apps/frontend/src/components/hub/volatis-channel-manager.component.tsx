'use client';

import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useCallback, useState } from 'react';
import { mutate } from 'swr';
import { useAllIntegrations } from '@gitroom/frontend/components/hub/use-all-integrations.hook';
import { useClientsAll } from '@gitroom/frontend/components/hub/crm/use-clients-all.hook';
import { Settings2 } from 'lucide-react';

const ChannelRow = ({
  integration,
  clients,
}: {
  integration: { id: string; name: string; picture: string; identifier: string; disabled: boolean; crmClientId: string | null };
  clients: Array<{ id: string; name: string }>;
}) => {
  const fetch = useFetch();
  const [saving, setSaving] = useState(false);

  const assign = useCallback(
    async (clientId: string | null) => {
      setSaving(true);
      try {
        await fetch(`/integrations/${integration.id}/crm-client`, {
          method: 'PUT',
          body: JSON.stringify({ clientId }),
          headers: { 'Content-Type': 'application/json' },
        });
        await mutate((key: string) => typeof key === 'string' && key.startsWith('/integrations/list'));
      } finally {
        setSaving(false);
      }
    },
    [fetch, integration.id]
  );

  return (
    <div
      className="flex items-center gap-[12px] px-[16px] py-[10px]"
      style={{ borderBottom: '1px solid var(--new-border)' }}
    >
      <img
        src={integration.picture || '/no-picture.jpg'}
        alt={integration.name}
        width={32}
        height={32}
        className="rounded-[8px] shrink-0"
      />
      <img
        src={`/icons/platforms/${integration.identifier}.png`}
        alt={integration.identifier}
        width={16}
        height={16}
        className="rounded-[4px] -ml-[20px] mb-[-12px] z-10 shrink-0 self-end"
      />
      <span className="text-[13px] font-[600] flex-1 truncate text-newTextColor">
        {integration.name}
      </span>

      <select
        disabled={saving}
        value={integration.crmClientId ?? ''}
        onChange={(e) => assign(e.target.value || null)}
        className="text-[12px] px-[8px] py-[5px] rounded-[8px] outline-none cursor-pointer bg-newBgColor border border-newBorder text-newTextColor"
        style={{ opacity: saving ? 0.5 : 1 }}
      >
        <option value="">— Sem cliente —</option>
        {clients.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
    </div>
  );
};

export const VolatisChannelManager = () => {
  const [open, setOpen] = useState(false);
  const { data: integrations } = useAllIntegrations();
  const { data: clients } = useClientsAll();

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-[6px] px-[12px] h-[36px] rounded-[10px] text-[12px] font-[600] border border-newBorder transition-colors text-newTextColor hover:bg-boxHover"
        style={{ background: open ? 'var(--new-box-hover)' : 'var(--new-bgColor)' }}
      >
        <Settings2 size={13} />
        Canais
      </button>

      {open && (
        <div className="absolute top-[42px] right-0 z-50 w-[380px] rounded-[14px] flex flex-col overflow-hidden bg-newBgColorInner border border-newBorder shadow-[0_8px_30px_rgba(0,0,0,0.5)]">
          <div className="px-[16px] py-[10px] text-[11px] font-[700] uppercase tracking-[0.1em] text-textItemBlur border-b border-newBorder">
            Atribuir canais a clientes
          </div>

          {!integrations?.length ? (
            <div className="px-[16px] py-[20px] text-[13px] text-textItemBlur">
              Nenhum canal conectado.
            </div>
          ) : (
            <div className="max-h-[340px] overflow-y-auto">
              {integrations.map((i) => (
                <ChannelRow key={i.id} integration={i} clients={clients ?? []} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
