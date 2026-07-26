'use client';

import React, { FC, useCallback, useMemo } from 'react';
import useSWR from 'swr';
import { useRouter } from 'next/navigation';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { expandPostsList } from '@gitroom/helpers/utils/posts.list.minify';

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
interface PostItem {
  id: string;
  content: string;
  publishDate: string;
  releaseURL?: string;
  state: string;
  integration?: {
    id: string;
    providerIdentifier: string;
    name: string;
    picture?: string;
  };
}

type Health = 'active' | 'reconnect' | 'setup' | 'disabled';
const healthOf = (a: Integration): Health => {
  if (a.inBetweenSteps) return 'setup';
  if (a.refreshNeeded) return 'reconnect';
  if (a.disabled) return 'disabled';
  return 'active';
};
const HEALTH_META: Record<Health, { label: string; chip: string }> = {
  active: { label: 'Active', chip: 'text-[#47b985] bg-[#47b985]/15' },
  reconnect: { label: 'Reconnect', chip: 'text-[#daa646] bg-[#daa646]/15' },
  setup: { label: 'Finish setup', chip: 'text-[#daa646] bg-[#daa646]/15' },
  disabled: { label: 'Disabled', chip: 'text-textItemBlur bg-newBgLineColor' },
};

const stripHtml = (s?: string) =>
  (s || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

const fmtDate = (iso?: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};
const relativeTime = (iso?: string) => {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return null;
  const diff = then - Date.now();
  const abs = Math.abs(diff);
  const mins = Math.round(abs / 60000);
  const dir = diff >= 0 ? 'in ' : '';
  const ago = diff >= 0 ? '' : ' ago';
  if (mins < 1) return 'now';
  if (mins < 60) return `${dir}${mins}m${ago}`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${dir}${hours}h${ago}`;
  const days = Math.round(hours / 24);
  return `${dir}${days}d${ago}`;
};

const PlatformAvatar: FC<{ p?: PostItem['integration']; size?: number; dim?: boolean }> = ({
  p,
  size = 34,
  dim,
}) => (
  <div className="relative shrink-0" style={{ width: size, height: size }}>
    <img
      src={p?.picture || '/no-picture.jpg'}
      alt=""
      onError={(e) => {
        (e.currentTarget as HTMLImageElement).src = '/no-picture.jpg';
      }}
      className={`rounded-[10px] object-cover border border-newTableBorder w-full h-full ${
        dim ? 'opacity-50 grayscale' : ''
      }`}
    />
    {p?.providerIdentifier && (
      <img
        src={`/icons/platforms/${
          p.providerIdentifier === 'youtube'
            ? 'youtube.svg'
            : `${p.providerIdentifier}.png`
        }`}
        alt=""
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).style.display = 'none';
        }}
        className="absolute -bottom-[3px] -end-[3px] w-[15px] h-[15px] rounded-[5px] border border-newBgColorInner bg-newBgColorInner object-contain"
      />
    )}
  </div>
);

const StatCard: FC<{
  label: string;
  value: React.ReactNode;
  sub?: string;
  accent?: string;
  onClick?: () => void;
}> = ({ label, value, sub, accent, onClick }) => (
  <div
    onClick={onClick}
    className={`glass-surface rounded-[16px] p-[16px] ${
      onClick ? 'cursor-pointer hover:border-btnPrimary/40 transition-colors' : ''
    }`}
  >
    <div className={`text-[26px] font-[700] tabular-nums leading-none ${accent || ''}`}>
      {value}
    </div>
    <div className="text-[12px] text-textItemBlur mt-[7px]">{label}</div>
    {sub && <div className="text-[11px] text-textItemBlur mt-[2px]">{sub}</div>}
  </div>
);

const Card: FC<{ title: string; action?: React.ReactNode; children: React.ReactNode }> = ({
  title,
  action,
  children,
}) => (
  <div className="glass-surface rounded-[16px] overflow-hidden flex flex-col">
    <div className="flex items-center gap-[10px] px-[16px] py-[13px] border-b border-newTableBorder">
      <div className="text-[13px] font-[600] flex-1">{title}</div>
      {action}
    </div>
    <div className="flex-1">{children}</div>
  </div>
);

const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
};

export const DashboardComponent: FC = () => {
  const fetch = useFetch();
  const t = useT();
  const router = useRouter();
  const toast = useToaster();

  const load = useCallback(async (url: string) => (await fetch(url)).json(), []);
  const loadPosts = useCallback(
    async (url: string) => expandPostsList(await (await fetch(url)).json()),
    []
  );

  const { data: integrationsRaw } = useSWR('/integrations/list', load);
  const { data: customers } = useSWR<Customer[]>('/integrations/customers', load);
  const { data: lastPublished } = useSWR<Record<string, string>>(
    '/integrations/last-published',
    load
  );
  const { data: scheduled } = useSWR('/posts/list?state=scheduled&page=0&limit=100', loadPosts);
  const { data: published } = useSWR('/posts/list?state=published&page=0&limit=100', loadPosts);
  const { data: drafts } = useSWR('/posts/list?state=draft&page=0&limit=50', loadPosts);

  const channels: Integration[] = useMemo(
    () => integrationsRaw?.integrations || integrationsRaw || [],
    [integrationsRaw]
  );
  const scheduledPosts: PostItem[] = scheduled?.posts || [];
  const publishedPosts: PostItem[] = published?.posts || [];

  const activeChannels = channels.filter((c) => !c.disabled).length;
  const attention = channels.filter(
    (c) => c.refreshNeeded || c.disabled || c.inBetweenSteps
  ).length;

  const published30 = useMemo(() => {
    const cutoff = Date.now() - 30 * 24 * 3600 * 1000;
    return publishedPosts.filter(
      (p) => new Date(p.publishDate).getTime() >= cutoff
    ).length;
  }, [publishedPosts]);

  const upNext = useMemo(
    () =>
      [...scheduledPosts]
        .filter((p) => new Date(p.publishDate).getTime() >= Date.now())
        .sort(
          (a, b) =>
            new Date(a.publishDate).getTime() - new Date(b.publishDate).getTime()
        )
        .slice(0, 6),
    [scheduledPosts]
  );

  const recent = useMemo(
    () =>
      [...publishedPosts]
        .sort(
          (a, b) =>
            new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime()
        )
        .slice(0, 6),
    [publishedPosts]
  );

  const sortedChannels = useMemo(
    () =>
      [...channels].sort((a, b) => {
        const rank = (c: Integration) =>
          c.refreshNeeded || c.inBetweenSteps ? 0 : c.disabled ? 2 : 1;
        return rank(a) - rank(b);
      }),
    [channels]
  );

  const reconnect = useCallback(
    async (a: Integration) => {
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
      }
    },
    [fetch, toast, t]
  );

  const today = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="flex-1 flex flex-col gap-[18px] p-[22px] overflow-y-auto">
      {/* Greeting */}
      <div>
        <h1 className="text-[26px] font-[600] leading-tight">
          {t(`greeting_${greeting().toLowerCase().replace(' ', '_')}`, greeting())}
        </h1>
        <p className="text-[13px] text-textItemBlur mt-[3px]">{today}</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-[12px]">
        <StatCard
          label={t('connected_accounts', 'Connected accounts')}
          value={
            <>
              {activeChannels}
              <span className="text-textItemBlur text-[16px]"> / {channels.length}</span>
            </>
          }
          onClick={() => router.push('/accounts')}
        />
        <StatCard
          label={t('scheduled', 'Scheduled')}
          value={scheduled?.total ?? scheduledPosts.length}
          onClick={() => router.push('/launches')}
        />
        <StatCard
          label={t('published_30d', 'Published (30d)')}
          value={published30}
          accent="text-[#47b985]"
        />
        <StatCard
          label={t('drafts', 'Drafts')}
          value={drafts?.total ?? 0}
        />
        <StatCard
          label={t('clients', 'Clients')}
          value={customers?.length ?? 0}
          onClick={() => router.push('/clients')}
        />
        <StatCard
          label={t('needs_attention', 'Needs attention')}
          value={attention}
          accent={attention ? 'text-[#daa646]' : ''}
          onClick={() => router.push('/accounts')}
        />
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-[16px] items-start">
        {/* Left: up next + recent */}
        <div className="lg:col-span-2 flex flex-col gap-[16px]">
          <Card
            title={t('up_next', 'Up next')}
            action={
              <button
                onClick={() => router.push('/launches')}
                className="text-[11.5px] text-btnPrimary hover:underline"
              >
                {t('open_calendar', 'Open calendar')}
              </button>
            }
          >
            {!scheduled ? (
              <div className="px-[16px] py-[28px] text-center text-textItemBlur text-[12.5px]">
                {t('loading', 'Loading…')}
              </div>
            ) : upNext.length === 0 ? (
              <div className="px-[16px] py-[28px] text-center text-textItemBlur text-[12.5px]">
                {t('nothing_scheduled', 'Nothing scheduled yet.')}
              </div>
            ) : (
              upNext.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-[12px] px-[16px] py-[11px] border-b border-newTableBorder last:border-b-0"
                >
                  <PlatformAvatar p={p.integration} size={34} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[12.5px] truncate">
                      {stripHtml(p.content) || (
                        <span className="text-textItemBlur italic">
                          {t('no_text_content', 'No text content')}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-textItemBlur mt-[2px]">
                      {p.integration?.name} · {fmtDate(p.publishDate)}
                    </div>
                  </div>
                  <span className="text-[11px] text-btnPrimary shrink-0">
                    {relativeTime(p.publishDate)}
                  </span>
                </div>
              ))
            )}
          </Card>

          <Card title={t('recent_activity', 'Recent activity')}>
            {!published ? (
              <div className="px-[16px] py-[28px] text-center text-textItemBlur text-[12.5px]">
                {t('loading', 'Loading…')}
              </div>
            ) : recent.length === 0 ? (
              <div className="px-[16px] py-[28px] text-center text-textItemBlur text-[12.5px]">
                {t('no_published_yet', 'No published posts yet.')}
              </div>
            ) : (
              recent.map((p) => (
                <div
                  key={p.id}
                  onClick={() =>
                    p.releaseURL
                      ? window.open(p.releaseURL, '_blank')
                      : window.open(`/p/${p.id}?share=true`, '_blank')
                  }
                  className="flex items-center gap-[12px] px-[16px] py-[11px] border-b border-newTableBorder last:border-b-0 cursor-pointer hover:bg-newBgLineColor/40 transition-colors"
                >
                  <PlatformAvatar p={p.integration} size={34} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[12.5px] truncate">
                      {stripHtml(p.content) || (
                        <span className="text-textItemBlur italic">
                          {t('no_text_content', 'No text content')}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-textItemBlur mt-[2px]">
                      {p.integration?.name} · {fmtDate(p.publishDate)}
                    </div>
                  </div>
                  <span className="text-[10px] font-[700] px-[8px] py-[3px] rounded-full text-[#47b985] bg-[#47b985]/15 shrink-0">
                    {t('published', 'Published')}
                  </span>
                </div>
              ))
            )}
          </Card>
        </div>

        {/* Right: accounts health + clients */}
        <div className="flex flex-col gap-[16px]">
          <Card
            title={t('accounts_health', 'Accounts health')}
            action={
              <button
                onClick={() => router.push('/accounts')}
                className="text-[11.5px] text-btnPrimary hover:underline"
              >
                {t('all', 'All')}
              </button>
            }
          >
            {!integrationsRaw ? (
              <div className="px-[16px] py-[24px] text-center text-textItemBlur text-[12.5px]">
                {t('loading', 'Loading…')}
              </div>
            ) : channels.length === 0 ? (
              <div className="px-[16px] py-[24px] text-center text-textItemBlur text-[12.5px]">
                {t('no_accounts_yet', 'No accounts connected yet.')}
              </div>
            ) : (
              sortedChannels.slice(0, 6).map((c) => {
                const h = healthOf(c);
                const meta = HEALTH_META[h];
                const last = relativeTime(lastPublished?.[c.id]);
                return (
                  <div
                    key={c.id}
                    className="flex items-center gap-[10px] px-[16px] py-[10px] border-b border-newTableBorder last:border-b-0"
                  >
                    <PlatformAvatar
                      p={{
                        id: c.id,
                        providerIdentifier: c.identifier,
                        name: c.name,
                        picture: c.picture,
                      }}
                      size={30}
                      dim={c.disabled}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-[12.5px] font-[600] truncate">{c.name}</div>
                      {last && (
                        <div className="text-[11px] text-textItemBlur">
                          {t('last', 'last')} {last}
                        </div>
                      )}
                    </div>
                    {c.refreshNeeded ? (
                      <button
                        onClick={() => reconnect(c)}
                        className="shrink-0 px-[9px] py-[5px] rounded-[8px] text-[11px] font-[700] bg-[#daa646] text-black hover:brightness-110 transition"
                      >
                        {t('reconnect', 'Reconnect')}
                      </button>
                    ) : (
                      <span className={`shrink-0 text-[10px] font-[700] px-[8px] py-[3px] rounded-full ${meta.chip}`}>
                        {meta.label}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </Card>

          <Card
            title={t('your_clients', 'Your clients')}
            action={
              <button
                onClick={() => router.push('/clients')}
                className="text-[11.5px] text-btnPrimary hover:underline"
              >
                {t('all', 'All')}
              </button>
            }
          >
            {!customers ? (
              <div className="px-[16px] py-[24px] text-center text-textItemBlur text-[12.5px]">
                {t('loading', 'Loading…')}
              </div>
            ) : customers.length === 0 ? (
              <div className="px-[16px] py-[24px] text-center text-textItemBlur text-[12.5px]">
                {t('no_clients_yet', 'No clients yet.')}
              </div>
            ) : (
              customers.slice(0, 6).map((c) => {
                const accts = channels.filter((i) => i.customer?.id === c.id);
                return (
                  <div
                    key={c.id}
                    onClick={() => router.push(`/clients/${c.id}`)}
                    className="flex items-center gap-[11px] px-[16px] py-[10px] border-b border-newTableBorder last:border-b-0 cursor-pointer hover:bg-newBgLineColor/40 transition-colors"
                  >
                    <div className="w-[30px] h-[30px] rounded-[9px] bg-newBgLineColor border border-newTableBorder flex items-center justify-center text-[11px] font-[700] shrink-0">
                      {c.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0 text-[12.5px] font-[600] truncate">
                      {c.name}
                    </div>
                    <span className="text-[11px] text-textItemBlur shrink-0">
                      {accts.length} {t('accounts_lc', 'accounts')}
                    </span>
                  </div>
                );
              })
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};
