'use client';

import React, {
  FC,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import useSWR from 'swr';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { useT } from '@gitroom/react/translation/get.transation.service.client';

interface Customer {
  id: string;
  name: string;
}
interface Integration {
  id: string;
  internalId: string;
  name: string;
  picture?: string;
  identifier: string;
  disabled?: boolean;
  refreshNeeded?: boolean;
  inBetweenSteps?: boolean;
  customer?: { id: string; name: string } | null;
}

type Health = 'active' | 'reconnect' | 'setup' | 'disabled';
type FilterKey = 'all' | 'active' | 'attention' | 'unassigned';

const HEALTH_META: Record<Health, { label: string; dot: string; chip: string }> =
  {
    active: {
      label: 'Active',
      dot: 'bg-[#47b985]',
      chip: 'text-[#47b985] bg-[#47b985]/15',
    },
    reconnect: {
      label: 'Reconnect needed',
      dot: 'bg-[#daa646]',
      chip: 'text-[#daa646] bg-[#daa646]/15',
    },
    setup: {
      label: 'Finish setup',
      dot: 'bg-[#daa646]',
      chip: 'text-[#daa646] bg-[#daa646]/15',
    },
    disabled: {
      label: 'Disabled',
      dot: 'bg-textItemBlur',
      chip: 'text-textItemBlur bg-newBgLineColor',
    },
  };

const healthOf = (a: Integration): Health => {
  if (a.inBetweenSteps) return 'setup';
  if (a.refreshNeeded) return 'reconnect';
  if (a.disabled) return 'disabled';
  return 'active';
};

const providerLabel = (identifier?: string) => {
  if (!identifier) return '';
  const base = identifier.split('-')[0];
  return base.charAt(0).toUpperCase() + base.slice(1);
};

const relativeTime = (iso?: string) => {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return null;
  const diff = Date.now() - then;
  if (diff < 0) return 'Scheduled';
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
};

const PlatformAvatar: FC<{ a: Integration }> = ({ a }) => (
  <div className="relative shrink-0">
    <img
      src={a.picture || '/no-picture.jpg'}
      alt={a.name}
      onError={(e) => {
        (e.currentTarget as HTMLImageElement).src = '/no-picture.jpg';
      }}
      className={`w-[44px] h-[44px] rounded-[12px] object-cover border border-newTableBorder ${
        a.disabled ? 'opacity-50 grayscale' : ''
      }`}
    />
    <img
      src={`/icons/platforms/${
        a.identifier === 'youtube' ? 'youtube.svg' : `${a.identifier}.png`
      }`}
      alt={a.identifier}
      onError={(e) => {
        (e.currentTarget as HTMLImageElement).style.display = 'none';
      }}
      className="absolute -bottom-[4px] -end-[4px] w-[19px] h-[19px] rounded-[6px] border border-newBgColorInner bg-newBgColorInner object-contain"
    />
  </div>
);

const AssignMenu: FC<{
  account: Integration;
  customers: Customer[];
  onAssign: (name: string) => void;
  busy: boolean;
}> = ({ account, customers, onAssign, busy }) => {
  const t = useT();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const current = account.customer?.id;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        disabled={busy}
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-[6px] px-[10px] py-[6px] rounded-[9px] text-[12px] font-[600] bg-newBgLineColor hover:bg-newTableBorder text-newTextColor transition-colors disabled:opacity-60"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M19 8v6M22 11h-6" />
        </svg>
        {account.customer?.name
          ? account.customer.name
          : t('assign_client', 'Assign client')}
      </button>
      {open && (
        <div className="absolute z-30 mt-[6px] end-0 min-w-[200px] max-h-[260px] overflow-auto bg-newBgColorInner border border-newTableBorder rounded-[12px] shadow-xl p-[6px]">
          {customers.length === 0 && (
            <div className="px-[10px] py-[8px] text-[12px] text-textItemBlur">
              {t('no_clients_create_first', 'No clients yet. Create one on the Clients page.')}
            </div>
          )}
          {customers.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                setOpen(false);
                if (c.id !== current) onAssign(c.name);
              }}
              className={`w-full text-start flex items-center justify-between gap-[8px] px-[10px] py-[8px] rounded-[8px] text-[12.5px] transition-colors hover:bg-newBgLineColor ${
                c.id === current ? 'text-btnPrimary font-[600]' : 'text-newTextColor'
              }`}
            >
              <span className="truncate">{c.name}</span>
              {c.id === current && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              )}
            </button>
          ))}
          {account.customer && (
            <>
              <div className="h-px bg-newTableBorder my-[4px]" />
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onAssign('');
                }}
                className="w-full text-start px-[10px] py-[8px] rounded-[8px] text-[12.5px] text-[#daa646] hover:bg-newBgLineColor transition-colors"
              >
                {t('unassign', 'Unassign')}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

const AccountCard: FC<{
  a: Integration;
  customers: Customer[];
  lastPublished?: string;
  onChanged: () => void;
}> = ({ a, customers, lastPublished, onChanged }) => {
  const fetch = useFetch();
  const toast = useToaster();
  const t = useT();
  const [busy, setBusy] = useState(false);
  const health = healthOf(a);
  const meta = HEALTH_META[health];
  const last = relativeTime(lastPublished);

  const reconnect = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch(
        `/integrations/social/${a.identifier}?refresh=${a.internalId}`,
        { method: 'GET' }
      );
      const { url } = await res.json();
      if (url) {
        window.location.href = url;
        return;
      }
      toast.show(t('reconnect_failed', 'Could not start reconnect'), 'warning');
    } catch {
      toast.show(t('reconnect_failed', 'Could not start reconnect'), 'warning');
    } finally {
      setBusy(false);
    }
  }, [a.identifier, a.internalId, busy]);

  const toggleDisabled = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch(
        a.disabled ? '/integrations/enable' : '/integrations/disable',
        { method: 'POST', body: JSON.stringify({ id: a.id }) }
      );
      if (res.ok) {
        toast.show(
          a.disabled
            ? t('account_enabled', 'Account enabled')
            : t('account_disabled', 'Account disabled')
        );
        onChanged();
      } else {
        toast.show(t('action_failed', 'Action failed'), 'warning');
      }
    } catch {
      toast.show(t('action_failed', 'Action failed'), 'warning');
    } finally {
      setBusy(false);
    }
  }, [a.id, a.disabled, busy, onChanged]);

  const assign = useCallback(
    async (name: string) => {
      if (busy) return;
      setBusy(true);
      try {
        const res = await fetch(`/integrations/${a.id}/customer-name`, {
          method: 'PUT',
          body: JSON.stringify({ name }),
        });
        if (res.ok) {
          toast.show(
            name
              ? t('account_assigned', 'Assigned to client')
              : t('account_unassigned', 'Unassigned from client')
          );
          onChanged();
        } else {
          toast.show(t('action_failed', 'Action failed'), 'warning');
        }
      } catch {
        toast.show(t('action_failed', 'Action failed'), 'warning');
      } finally {
        setBusy(false);
      }
    },
    [a.id, busy, onChanged]
  );

  return (
    <div className="glass-surface bg-newBgColorInner border border-newTableBorder rounded-[16px] p-[16px] flex flex-col gap-[14px] hover:border-btnPrimary/40 transition-colors">
      <div className="flex items-start gap-[12px]">
        <PlatformAvatar a={a} />
        <div className="flex-1 min-w-0">
          <div className="text-[14px] font-[600] truncate">{a.name}</div>
          <div className="text-[12px] text-textItemBlur">
            {providerLabel(a.identifier)}
          </div>
        </div>
        <span className={`shrink-0 w-[8px] h-[8px] rounded-full ${meta.dot}`} />
      </div>

      <div className="flex items-center gap-[8px] flex-wrap">
        <span className={`text-[10.5px] font-[700] px-[9px] py-[4px] rounded-full ${meta.chip}`}>
          {t(`health_${health}`, meta.label)}
        </span>
        {a.customer ? (
          <span className="text-[11px] text-textItemBlur">
            {t('client_label', 'Client')}:{' '}
            <span className="text-newTextColor font-[600]">
              {a.customer.name}
            </span>
          </span>
        ) : (
          <span className="text-[11px] text-[#daa646]">
            {t('unassigned', 'Unassigned')}
          </span>
        )}
      </div>

      <div className="flex items-center gap-[7px] text-[11.5px] text-textItemBlur">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
        {last ? (
          <>
            {t('last_publish', 'Last publish')}:{' '}
            <span className="text-newTextColor">{last}</span>
          </>
        ) : (
          t('no_publishes_yet', 'No posts published yet')
        )}
      </div>

      <div className="h-px bg-newTableBorder" />

      <div className="flex items-center gap-[8px] flex-wrap">
        {a.refreshNeeded && (
          <button
            type="button"
            disabled={busy}
            onClick={reconnect}
            className="flex items-center gap-[6px] px-[10px] py-[6px] rounded-[9px] text-[12px] font-[700] bg-[#daa646] text-black hover:brightness-110 transition disabled:opacity-60"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 4v6h-6M1 20v-6h6" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
            {t('reconnect', 'Reconnect')}
          </button>
        )}
        {a.inBetweenSteps && !a.refreshNeeded && (
          <a
            href={`/launches?added=${a.identifier}&continue=${a.id}`}
            className="flex items-center gap-[6px] px-[10px] py-[6px] rounded-[9px] text-[12px] font-[700] bg-[#daa646] text-black hover:brightness-110 transition"
          >
            {t('finish_setup', 'Finish setup')}
          </a>
        )}

        <AssignMenu
          account={a}
          customers={customers}
          onAssign={assign}
          busy={busy}
        />

        <button
          type="button"
          disabled={busy}
          onClick={toggleDisabled}
          className="ms-auto flex items-center gap-[6px] px-[10px] py-[6px] rounded-[9px] text-[12px] font-[600] bg-newBgLineColor hover:bg-newTableBorder text-newTextColor transition-colors disabled:opacity-60"
        >
          {a.disabled ? t('enable', 'Enable') : t('disable', 'Disable')}
        </button>
      </div>
    </div>
  );
};

export const AccountsComponent: FC = () => {
  const fetch = useFetch();
  const t = useT();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterKey>('all');

  const load = useCallback(
    async (url: string) => (await fetch(url)).json(),
    []
  );

  const { data: integrationsRaw, mutate: mutateList } = useSWR(
    '/integrations/list',
    load
  );
  const { data: customers } = useSWR<Customer[]>('/integrations/customers', load);
  const { data: lastPublished } = useSWR<Record<string, string>>(
    '/integrations/last-published',
    load
  );

  const integrations: Integration[] = useMemo(
    () => integrationsRaw?.integrations || integrationsRaw || [],
    [integrationsRaw]
  );

  const stats = useMemo(() => {
    let attention = 0;
    let unassigned = 0;
    for (const a of integrations) {
      const h = healthOf(a);
      if (h === 'reconnect' || h === 'setup' || h === 'disabled') attention++;
      if (!a.customer) unassigned++;
    }
    return { total: integrations.length, attention, unassigned };
  }, [integrations]);

  const filtered = useMemo(() => {
    return integrations
      .filter(
        (a) =>
          !search ||
          a.name.toLowerCase().includes(search.toLowerCase()) ||
          a.identifier.toLowerCase().includes(search.toLowerCase()) ||
          a.customer?.name.toLowerCase().includes(search.toLowerCase())
      )
      .filter((a) => {
        if (filter === 'all') return true;
        const h = healthOf(a);
        if (filter === 'active') return h === 'active';
        if (filter === 'attention')
          return h === 'reconnect' || h === 'setup' || h === 'disabled';
        if (filter === 'unassigned') return !a.customer;
        return true;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [integrations, search, filter]);

  const loading = !integrationsRaw;

  const FILTERS: { key: FilterKey; label: string }[] = [
    { key: 'all', label: t('all', 'All') },
    { key: 'active', label: t('active', 'Active') },
    { key: 'attention', label: t('attention', 'Attention') },
    { key: 'unassigned', label: t('unassigned', 'Unassigned') },
  ];

  return (
    <div className="flex-1 flex flex-col gap-[16px] p-[20px]">
      {/* Header */}
      <div className="flex items-center gap-[16px] flex-wrap">
        <div className="flex-1 min-w-[240px]">
          <h1 className="text-[22px] font-[600]">{t('accounts', 'Accounts')}</h1>
          <p className="text-[13px] text-textItemBlur mt-[2px]">
            {t(
              'accounts_sub',
              'Every connected social account across your clients — health, ownership and status.'
            )}
          </p>
        </div>
        <div className="flex items-center gap-[10px]">
          <div className="px-[14px] py-[9px] rounded-[12px] bg-newBgColorInner border border-newTableBorder text-center min-w-[74px]">
            <div className="text-[18px] font-[700] tabular-nums leading-none">
              {stats.total}
            </div>
            <div className="text-[10.5px] text-textItemBlur mt-[3px]">
              {t('accounts', 'Accounts')}
            </div>
          </div>
          <div className="px-[14px] py-[9px] rounded-[12px] bg-newBgColorInner border border-newTableBorder text-center min-w-[74px]">
            <div
              className={`text-[18px] font-[700] tabular-nums leading-none ${
                stats.attention ? 'text-[#daa646]' : ''
              }`}
            >
              {stats.attention}
            </div>
            <div className="text-[10.5px] text-textItemBlur mt-[3px]">
              {t('attention', 'Attention')}
            </div>
          </div>
          <div className="px-[14px] py-[9px] rounded-[12px] bg-newBgColorInner border border-newTableBorder text-center min-w-[74px]">
            <div className="text-[18px] font-[700] tabular-nums leading-none">
              {stats.unassigned}
            </div>
            <div className="text-[10.5px] text-textItemBlur mt-[3px]">
              {t('unassigned', 'Unassigned')}
            </div>
          </div>
        </div>
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
            placeholder={t('search_accounts', 'Search accounts…')}
            className="bg-transparent outline-none text-[13px] flex-1 text-newTextColor"
          />
        </div>
        <div className="flex items-center gap-[4px] bg-newBgColorInner border border-newTableBorder rounded-[12px] p-[4px]">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-[12px] py-[6px] rounded-[9px] text-[12px] font-[600] transition-colors ${
                filter === f.key
                  ? 'bg-btnPrimary text-white'
                  : 'text-textItemBlur hover:text-newTextColor'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {loading && (
        <div className="py-[60px] text-center text-textItemBlur text-[13px]">
          {t('loading', 'Loading…')}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="bg-newBgColorInner border border-newTableBorder rounded-[16px] px-[18px] py-[52px] text-center">
          <div className="text-[14px] font-[600]">
            {integrations.length === 0
              ? t('no_accounts_yet', 'No accounts connected yet')
              : t('no_matching_accounts', 'No accounts match your filters')}
          </div>
          <div className="text-[12.5px] text-textItemBlur mt-[5px]">
            {integrations.length === 0
              ? t(
                  'no_accounts_help',
                  'Connect a social account from the calendar to see it here.'
                )
              : t('try_clearing_filters', 'Try clearing the search or filter.')}
          </div>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-[14px]">
          {filtered.map((a) => (
            <AccountCard
              key={a.id}
              a={a}
              customers={customers || []}
              lastPublished={lastPublished?.[a.id]}
              onChanged={() => mutateList()}
            />
          ))}
        </div>
      )}
    </div>
  );
};
