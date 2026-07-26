'use client';

import React, { useCallback, useMemo, useState } from 'react';
import useSWR from 'swr';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { Button } from '@gitroom/react/form/button';
import { useModals } from '@gitroom/frontend/components/layout/new-modal';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { useT } from '@gitroom/react/translation/get.transation.service.client';

interface Customer {
  id: string;
  name: string;
  dbuClientName?: string | null;
}
interface Integration {
  id: string;
  name: string;
  picture?: string;
  providerIdentifier: string;
  disabled?: boolean;
  refreshNeeded?: boolean;
  customer?: { id: string; name: string } | null;
}
type Status = 'active' | 'attention' | 'empty';
interface Client extends Customer {
  accounts: Integration[];
  active: number;
  status: Status;
}

const STATUS_META: Record<Status, { label: string; cls: string }> = {
  active: { label: 'Active', cls: 'text-[#47b985] bg-[#47b985]/15' },
  attention: { label: 'Needs attention', cls: 'text-[#daa646] bg-[#daa646]/15' },
  empty: { label: 'No accounts', cls: 'text-textItemBlur bg-newBgLineColor' },
};

const AddClientModal = ({ onCreated }: { onCreated: () => void }) => {
  const fetch = useFetch();
  const modals = useModals();
  const toast = useToaster();
  const t = useT();
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  const save = useCallback(async () => {
    const clean = name.trim();
    if (!clean || saving) return;
    setSaving(true);
    try {
      const res = await fetch('/integrations/customer', {
        method: 'POST',
        body: JSON.stringify({ name: clean }),
      });
      if (res.ok) {
        onCreated();
        modals.closeAll();
        toast.show(t('client_created', 'Client created'));
      } else {
        toast.show(t('client_create_failed', 'Could not create client'));
      }
    } finally {
      setSaving(false);
    }
  }, [name, saving]);

  return (
    <div className="p-[16px] flex flex-col gap-[14px] min-w-[340px]">
      <div className="flex flex-col gap-[6px]">
        <label className="text-[12px] text-textItemBlur">
          {t('client_name', 'Client name')}
        </label>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') save();
          }}
          placeholder={t('client_name_ph', 'e.g. Époque')}
          className="w-full bg-newBgLineColor border border-newTableBorder rounded-[10px] px-[14px] py-[11px] text-newTextColor outline-none focus:border-btnPrimary"
        />
      </div>
      <div className="flex gap-[10px]">
        <Button onClick={save} disabled={saving || !name.trim()}>
          {saving ? t('creating', 'Creating…') : t('create_client', 'Create client')}
        </Button>
      </div>
    </div>
  );
};

const AccountRow = ({ a }: { a: Integration }) => (
  <div className="flex items-center gap-[10px] py-[8px]">
    <div className="relative">
      {a.picture ? (
        <img
          src={a.picture}
          alt={a.name}
          className="w-[26px] h-[26px] rounded-full object-cover"
        />
      ) : (
        <div className="w-[26px] h-[26px] rounded-full bg-newBgLineColor" />
      )}
      <span
        className={`absolute -bottom-[1px] -end-[1px] w-[9px] h-[9px] rounded-full border-2 border-newBgColorInner ${
          a.disabled || a.refreshNeeded ? 'bg-[#daa646]' : 'bg-[#47b985]'
        }`}
      />
    </div>
    <div className="flex-1 min-w-0">
      <div className="text-[12.5px] font-[600] truncate">{a.name}</div>
      <div className="text-[11px] text-textItemBlur capitalize">
        {a.providerIdentifier?.split('-')[0]}
      </div>
    </div>
    {(a.disabled || a.refreshNeeded) && (
      <span className="text-[10.5px] text-[#daa646]">
        {a.refreshNeeded ? 'Reconnect' : 'Disabled'}
      </span>
    )}
  </div>
);

export const ClientsComponent = () => {
  const fetch = useFetch();
  const t = useT();
  const modals = useModals();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | Status>('all');
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(
    async (url: string) => (await fetch(url)).json(),
    []
  );
  const { data: customers, mutate: mutateCustomers } = useSWR<Customer[]>(
    '/integrations/customers',
    load
  );
  const { data: integrationsRaw } = useSWR('/integrations/list', load);
  const integrations: Integration[] = useMemo(
    () => integrationsRaw?.integrations || integrationsRaw || [],
    [integrationsRaw]
  );

  const clients: Client[] = useMemo(() => {
    return (customers || []).map((c) => {
      const accounts = integrations.filter((i) => i.customer?.id === c.id);
      const active = accounts.filter((a) => !a.disabled).length;
      const attention = accounts.some((a) => a.refreshNeeded || a.disabled);
      const s: Status =
        accounts.length === 0 ? 'empty' : attention ? 'attention' : 'active';
      return { ...c, accounts, active, status: s };
    });
  }, [customers, integrations]);

  const filtered = useMemo(
    () =>
      clients
        .filter(
          (c) =>
            !search || c.name.toLowerCase().includes(search.toLowerCase())
        )
        .filter((c) => status === 'all' || c.status === status)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [clients, search, status]
  );

  const addClient = useCallback(() => {
    modals.openModal({
      title: t('add_client', 'Add Client'),
      withCloseButton: true,
      classNames: { modal: 'bg-newBgColorInner text-newTextColor' },
      children: <AddClientModal onCreated={() => mutateCustomers()} />,
    });
  }, [t, mutateCustomers]);

  const loading = !customers;
  const ungrouped = integrations.filter((i) => !i.customer?.id).length;

  return (
    <div className="flex-1 flex flex-col gap-[16px] p-[20px]">
      {/* Header */}
      <div className="flex items-center gap-[16px]">
        <div className="flex-1">
          <h1 className="text-[22px] font-[600]">{t('clients', 'Clients')}</h1>
          <p className="text-[13px] text-textItemBlur mt-[2px]">
            {t(
              'clients_sub',
              'Manage all your clients and their social media operations'
            )}
          </p>
        </div>
        <Button onClick={addClient}>+ {t('add_client', 'Add Client')}</Button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-[10px] flex-wrap">
        <div className="flex items-center gap-[8px] bg-newBgColorInner border border-newTableBorder rounded-[12px] px-[14px] py-[9px] flex-1 min-w-[220px] max-w-[380px]">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-textItemBlur">
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4-4" />
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('search_clients', 'Search clients…')}
            className="bg-transparent outline-none text-[13px] flex-1 text-newTextColor"
          />
        </div>
        <div className="flex items-center gap-[4px] bg-newBgColorInner border border-newTableBorder rounded-[12px] p-[4px]">
          {(['all', 'active', 'attention', 'empty'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`px-[12px] py-[6px] rounded-[9px] text-[12px] font-[600] capitalize transition-colors ${
                status === s
                  ? 'bg-btnPrimary text-white'
                  : 'text-textItemBlur hover:text-newTextColor'
              }`}
            >
              {s === 'all'
                ? t('all', 'All')
                : s === 'attention'
                ? t('attention', 'Attention')
                : s === 'empty'
                ? t('no_accounts', 'No accounts')
                : t('active', 'Active')}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-newBgColorInner border border-newTableBorder rounded-[16px] overflow-hidden">
        <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,2fr)_120px_140px_40px] gap-[10px] px-[18px] py-[11px] text-[10px] uppercase tracking-wider text-textItemBlur font-[600] border-b border-newTableBorder">
          <div>{t('client', 'Client')}</div>
          <div>{t('connected_accounts', 'Connected accounts')}</div>
          <div>{t('accounts', 'Accounts')}</div>
          <div>{t('status', 'Status')}</div>
          <div />
        </div>

        {loading && (
          <div className="px-[18px] py-[40px] text-center text-textItemBlur text-[13px]">
            {t('loading', 'Loading…')}
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="px-[18px] py-[44px] text-center">
            <div className="text-[14px] font-[600]">
              {t('no_clients_yet', 'No clients yet')}
            </div>
            <div className="text-[12.5px] text-textItemBlur mt-[4px] mb-[16px]">
              {t(
                'no_clients_help',
                'Create your first client, then connect their social accounts.'
              )}
            </div>
            <Button onClick={addClient}>+ {t('add_client', 'Add Client')}</Button>
          </div>
        )}

        {!loading &&
          filtered.map((c) => {
            const meta = STATUS_META[c.status];
            const isOpen = expanded === c.id;
            return (
              <div key={c.id} className="border-b border-newTableBorder last:border-b-0">
                <div
                  onClick={() => setExpanded(isOpen ? null : c.id)}
                  className="grid grid-cols-[minmax(0,2fr)_minmax(0,2fr)_120px_140px_40px] gap-[10px] px-[18px] py-[13px] items-center cursor-pointer hover:bg-newBgLineColor/40 transition-colors"
                >
                  <div className="flex items-center gap-[11px] min-w-0">
                    <div className="w-[36px] h-[36px] rounded-[10px] bg-newBgLineColor border border-newTableBorder flex items-center justify-center text-[13px] font-[700] shrink-0">
                      {c.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="text-[13.5px] font-[600] truncate">
                        {c.name}
                      </div>
                      {c.dbuClientName && (
                        <div className="text-[11px] text-btnPrimary truncate">
                          {t('linked_dbu', 'Linked to DBU')}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-[-6px] min-w-0">
                    {c.accounts.slice(0, 6).map((a, i) => (
                      <div
                        key={a.id}
                        className="w-[24px] h-[24px] rounded-full border-2 border-newBgColorInner bg-newBgLineColor overflow-hidden shrink-0"
                        style={{ marginInlineStart: i === 0 ? 0 : -7 }}
                        title={a.name}
                      >
                        {a.picture ? (
                          <img
                            src={a.picture}
                            alt={a.name}
                            className="w-full h-full object-cover"
                          />
                        ) : null}
                      </div>
                    ))}
                    {c.accounts.length === 0 && (
                      <span className="text-[12px] text-textItemBlur">
                        {t('none', 'None')}
                      </span>
                    )}
                    {c.accounts.length > 6 && (
                      <span className="text-[11px] text-textItemBlur ms-[8px]">
                        +{c.accounts.length - 6}
                      </span>
                    )}
                  </div>

                  <div className="text-[13px] tabular-nums">
                    <span className="font-[600]">{c.active}</span>
                    <span className="text-textItemBlur">
                      {' '}
                      / {c.accounts.length}
                    </span>
                  </div>

                  <div>
                    <span
                      className={`text-[10.5px] font-[700] px-[9px] py-[4px] rounded-full ${meta.cls}`}
                    >
                      {meta.label}
                    </span>
                  </div>

                  <div className="text-textItemBlur text-center">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className={`inline transition-transform ${
                        isOpen ? 'rotate-90' : ''
                      }`}
                    >
                      <path d="m9 6 6 6-6 6" />
                    </svg>
                  </div>
                </div>

                {isOpen && (
                  <div className="px-[18px] pb-[14px] ps-[65px]">
                    {c.accounts.length === 0 ? (
                      <div className="text-[12.5px] text-textItemBlur py-[6px]">
                        {t(
                          'no_accounts_connected',
                          'No social accounts connected to this client yet.'
                        )}
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-x-[24px]">
                        {c.accounts.map((a) => (
                          <AccountRow key={a.id} a={a} />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
      </div>

      {ungrouped > 0 && (
        <div className="text-[12px] text-textItemBlur">
          {t('ungrouped_note_a', '{n} account(s) are not assigned to a client yet.').replace(
            '{n}',
            String(ungrouped)
          )}{' '}
          {t(
            'ungrouped_note_b',
            'Assign them from Accounts to see them here.'
          )}
        </div>
      )}
    </div>
  );
};
