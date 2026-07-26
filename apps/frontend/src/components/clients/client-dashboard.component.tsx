'use client';

import React, { FC, useCallback, useMemo, useState } from 'react';
import useSWR from 'swr';
import { useParams, useRouter } from 'next/navigation';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { expandPostsList } from '@gitroom/helpers/utils/posts.list.minify';

interface Customer {
  id: string;
  name: string;
  dbuClientName?: string | null;
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

type Tab = 'overview' | 'accounts' | 'content' | 'analytics';
type Health = 'active' | 'reconnect' | 'setup' | 'disabled';

const healthOf = (a: Integration): Health => {
  if (a.inBetweenSteps) return 'setup';
  if (a.refreshNeeded) return 'reconnect';
  if (a.disabled) return 'disabled';
  return 'active';
};
const HEALTH_META: Record<Health, { label: string; dot: string; chip: string }> =
  {
    active: { label: 'Active', dot: 'bg-[#47b985]', chip: 'text-[#47b985] bg-[#47b985]/15' },
    reconnect: { label: 'Reconnect', dot: 'bg-[#daa646]', chip: 'text-[#daa646] bg-[#daa646]/15' },
    setup: { label: 'Finish setup', dot: 'bg-[#daa646]', chip: 'text-[#daa646] bg-[#daa646]/15' },
    disabled: { label: 'Disabled', dot: 'bg-textItemBlur', chip: 'text-textItemBlur bg-newBgLineColor' },
  };

const providerLabel = (id?: string) => {
  if (!id) return '';
  const b = id.split('-')[0];
  return b.charAt(0).toUpperCase() + b.slice(1);
};
const stripHtml = (s?: string) =>
  (s || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

const fmtDate = (iso?: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, {
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
  const diff = Date.now() - then;
  const abs = Math.abs(diff);
  const mins = Math.floor(abs / 60000);
  const suffix = diff >= 0 ? 'ago' : 'from now';
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ${suffix}`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ${suffix}`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ${suffix}`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ${suffix}`;
  return `${Math.floor(months / 12)}y ${suffix}`;
};

const PlatformAvatar: FC<{
  picture?: string;
  identifier?: string;
  size?: number;
  dim?: boolean;
}> = ({ picture, identifier, size = 40, dim }) => (
  <div className="relative shrink-0" style={{ width: size, height: size }}>
    <img
      src={picture || '/no-picture.jpg'}
      alt=""
      onError={(e) => {
        (e.currentTarget as HTMLImageElement).src = '/no-picture.jpg';
      }}
      className={`rounded-[11px] object-cover border border-newTableBorder w-full h-full ${
        dim ? 'opacity-50 grayscale' : ''
      }`}
    />
    {identifier && (
      <img
        src={`/icons/platforms/${
          identifier === 'youtube' ? 'youtube.svg' : `${identifier}.png`
        }`}
        alt=""
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).style.display = 'none';
        }}
        className="absolute -bottom-[4px] -end-[4px] w-[17px] h-[17px] rounded-[5px] border border-newBgColorInner bg-newBgColorInner object-contain"
      />
    )}
  </div>
);

const StatCard: FC<{ label: string; value: React.ReactNode; accent?: string }> = ({
  label,
  value,
  accent,
}) => (
  <div className="glass-surface bg-newBgColorInner border border-newTableBorder rounded-[16px] p-[16px]">
    <div
      className={`text-[26px] font-[700] tabular-nums leading-none ${accent || ''}`}
    >
      {value}
    </div>
    <div className="text-[12px] text-textItemBlur mt-[7px]">{label}</div>
  </div>
);

const PostRow: FC<{ p: PostItem; t: (k: string, d: string) => string }> = ({
  p,
  t,
}) => {
  const snippet = stripHtml(p.content);
  const stateMeta: Record<string, { label: string; cls: string }> = {
    PUBLISHED: { label: t('published', 'Published'), cls: 'text-[#47b985] bg-[#47b985]/15' },
    QUEUE: { label: t('scheduled', 'Scheduled'), cls: 'text-btnPrimary bg-btnPrimary/15' },
    DRAFT: { label: t('draft', 'Draft'), cls: 'text-textItemBlur bg-newBgLineColor' },
    ERROR: { label: t('failed', 'Failed'), cls: 'text-[#d16a6a] bg-[#d16a6a]/15' },
  };
  const sm = stateMeta[p.state] || stateMeta.DRAFT;
  return (
    <div className="flex items-center gap-[12px] px-[14px] py-[11px] border-b border-newTableBorder last:border-b-0">
      <PlatformAvatar
        picture={p.integration?.picture}
        identifier={p.integration?.providerIdentifier}
        size={34}
      />
      <div className="flex-1 min-w-0">
        <div className="text-[12.5px] text-newTextColor truncate">
          {snippet || (
            <span className="text-textItemBlur italic">
              {t('no_text_content', 'No text content')}
            </span>
          )}
        </div>
        <div className="text-[11px] text-textItemBlur mt-[2px]">
          {p.integration?.name} · {fmtDate(p.publishDate)}
        </div>
      </div>
      {p.releaseURL && (
        <a
          href={p.releaseURL}
          target="_blank"
          rel="noreferrer"
          className="text-textItemBlur hover:text-btnPrimary transition-colors"
          title={t('view_post', 'View post')}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <path d="M15 3h6v6M10 14 21 3" />
          </svg>
        </a>
      )}
      <span className={`shrink-0 text-[10px] font-[700] px-[8px] py-[3px] rounded-full ${sm.cls}`}>
        {sm.label}
      </span>
    </div>
  );
};

export const ClientDashboardComponent: FC = () => {
  const params = useParams<{ id: string }>();
  const clientId = params.id;
  const fetch = useFetch();
  const router = useRouter();
  const toast = useToaster();
  const t = useT();
  const [tab, setTab] = useState<Tab>('overview');
  const [contentFilter, setContentFilter] = useState<'all' | 'scheduled' | 'published' | 'draft'>('all');

  const load = useCallback(async (url: string) => (await fetch(url)).json(), []);
  const loadPosts = useCallback(
    async (url: string) => expandPostsList(await (await fetch(url)).json()),
    []
  );

  const { data: customers } = useSWR<Customer[]>('/integrations/customers', load);
  const { data: integrationsRaw } = useSWR('/integrations/list', load);
  const { data: lastPublished } = useSWR<Record<string, string>>(
    '/integrations/last-published',
    load
  );

  const client = useMemo(
    () => (customers || []).find((c) => c.id === clientId),
    [customers, clientId]
  );
  const channels: Integration[] = useMemo(() => {
    const all: Integration[] = integrationsRaw?.integrations || integrationsRaw || [];
    return all.filter((i) => i.customer?.id === clientId);
  }, [integrationsRaw, clientId]);

  const q = `customer=${clientId}&page=0`;
  const { data: scheduled } = useSWR(
    `/posts/list?${q}&state=scheduled&limit=100`,
    loadPosts
  );
  const { data: published } = useSWR(
    `/posts/list?${q}&state=published&limit=100`,
    loadPosts
  );
  const { data: drafts } = useSWR(`/posts/list?${q}&state=draft&limit=50`, loadPosts);

  const scheduledPosts: PostItem[] = scheduled?.posts || [];
  const publishedPosts: PostItem[] = published?.posts || [];
  const draftPosts: PostItem[] = drafts?.posts || [];

  const counts = {
    scheduled: scheduled?.total ?? scheduledPosts.length,
    published: published?.total ?? publishedPosts.length,
    drafts: drafts?.total ?? draftPosts.length,
  };
  const activeChannels = channels.filter((c) => !c.disabled).length;
  const attention = channels.filter(
    (c) => c.refreshNeeded || c.disabled || c.inBetweenSteps
  ).length;

  const nextPost = useMemo(() => {
    const upcoming = [...scheduledPosts]
      .filter((p) => new Date(p.publishDate).getTime() >= Date.now())
      .sort(
        (a, b) =>
          new Date(a.publishDate).getTime() - new Date(b.publishDate).getTime()
      );
    return upcoming[0];
  }, [scheduledPosts]);

  // DB-derived analytics (no live provider calls — IG-safe).
  const perChannelPublished = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of publishedPosts) {
      const key = p.integration?.id || 'unknown';
      map.set(key, (map.get(key) || 0) + 1);
    }
    return channels
      .map((c) => ({ channel: c, count: map.get(c.id) || 0 }))
      .sort((a, b) => b.count - a.count);
  }, [publishedPosts, channels]);

  const perMonth = useMemo(() => {
    const now = new Date();
    const buckets: { key: string; label: string; count: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      buckets.push({
        key: `${d.getFullYear()}-${d.getMonth()}`,
        label: d.toLocaleDateString(undefined, { month: 'short' }),
        count: 0,
      });
    }
    const idx = new Map(buckets.map((b, i) => [b.key, i]));
    for (const p of publishedPosts) {
      const d = new Date(p.publishDate);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const i = idx.get(key);
      if (i !== undefined) buckets[i].count++;
    }
    return buckets;
  }, [publishedPosts]);
  const maxMonth = Math.max(1, ...perMonth.map((b) => b.count));

  const filteredContent: PostItem[] = useMemo(() => {
    let list: PostItem[];
    if (contentFilter === 'scheduled') list = scheduledPosts;
    else if (contentFilter === 'published') list = publishedPosts;
    else if (contentFilter === 'draft') list = draftPosts;
    else list = [...scheduledPosts, ...draftPosts, ...publishedPosts];
    return [...list].sort(
      (a, b) =>
        new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime()
    );
  }, [contentFilter, scheduledPosts, publishedPosts, draftPosts]);

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

  const loadingClient = !customers;

  if (!loadingClient && !client) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-[12px] p-[40px]">
        <div className="text-[15px] font-[600]">
          {t('client_not_found', 'Client not found')}
        </div>
        <button
          onClick={() => router.push('/clients')}
          className="text-[13px] text-btnPrimary hover:underline"
        >
          {t('back_to_clients', '← Back to Clients')}
        </button>
      </div>
    );
  }

  const TABS: { key: Tab; label: string }[] = [
    { key: 'overview', label: t('overview', 'Overview') },
    { key: 'accounts', label: t('accounts', 'Accounts') },
    { key: 'content', label: t('content', 'Content') },
    { key: 'analytics', label: t('analytics', 'Analytics') },
  ];
  const CONTENT_FILTERS: { key: typeof contentFilter; label: string }[] = [
    { key: 'all', label: t('all', 'All') },
    { key: 'scheduled', label: t('scheduled', 'Scheduled') },
    { key: 'published', label: t('published', 'Published') },
    { key: 'draft', label: t('drafts', 'Drafts') },
  ];

  return (
    <div className="flex-1 flex flex-col gap-[18px] p-[20px]">
      {/* Header */}
      <div className="flex items-center gap-[14px] flex-wrap">
        <button
          onClick={() => router.push('/clients')}
          className="w-[36px] h-[36px] rounded-[10px] bg-newBgColorInner border border-newTableBorder flex items-center justify-center text-textItemBlur hover:text-newTextColor transition-colors shrink-0"
          title={t('back_to_clients', 'Back to Clients')}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>
        <div className="w-[46px] h-[46px] rounded-[13px] bg-newBgLineColor border border-newTableBorder flex items-center justify-center text-[16px] font-[700] shrink-0">
          {(client?.name || '··').slice(0, 2).toUpperCase()}
        </div>
        <div className="flex-1 min-w-[200px]">
          <h1 className="text-[22px] font-[600] leading-tight">
            {client?.name || t('loading', 'Loading…')}
          </h1>
          <div className="flex items-center gap-[10px] mt-[3px]">
            <span className="text-[12.5px] text-textItemBlur">
              {channels.length} {t('accounts_lc', 'accounts')} · {activeChannels}{' '}
              {t('active_lc', 'active')}
            </span>
            {attention > 0 && (
              <span className="text-[11.5px] text-[#daa646]">
                {attention} {t('need_attention_lc', 'need attention')}
              </span>
            )}
            {client?.dbuClientName && (
              <span className="text-[11px] text-btnPrimary font-[600]">
                {t('linked_dbu', 'Linked to DBU')}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={() => router.push(`/launches?customer=${clientId}`)}
          className="flex items-center gap-[7px] px-[13px] py-[9px] rounded-[11px] text-[12.5px] font-[600] bg-btnPrimary text-white hover:brightness-110 transition"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <path d="M16 2v4M8 2v4M3 10h18" />
          </svg>
          {t('open_calendar', 'Open calendar')}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-[4px] bg-newBgColorInner border border-newTableBorder rounded-[12px] p-[4px] w-fit">
        {TABS.map((tb) => (
          <button
            key={tb.key}
            onClick={() => setTab(tb.key)}
            className={`px-[16px] py-[7px] rounded-[9px] text-[12.5px] font-[600] transition-colors ${
              tab === tb.key
                ? 'bg-btnPrimary text-white'
                : 'text-textItemBlur hover:text-newTextColor'
            }`}
          >
            {tb.label}
          </button>
        ))}
      </div>

      {/* OVERVIEW */}
      {tab === 'overview' && (
        <div className="flex flex-col gap-[16px]">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-[12px]">
            <StatCard
              label={t('accounts', 'Accounts')}
              value={
                <>
                  {activeChannels}
                  <span className="text-textItemBlur text-[16px]">
                    {' '}
                    / {channels.length}
                  </span>
                </>
              }
            />
            <StatCard label={t('scheduled', 'Scheduled')} value={counts.scheduled} />
            <StatCard
              label={t('published', 'Published')}
              value={counts.published}
              accent="text-[#47b985]"
            />
            <StatCard
              label={t('needs_attention', 'Needs attention')}
              value={attention}
              accent={attention ? 'text-[#daa646]' : ''}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-[16px]">
            {/* Next scheduled */}
            <div className="glass-surface bg-newBgColorInner border border-newTableBorder rounded-[16px] p-[16px]">
              <div className="text-[13px] font-[600] mb-[12px]">
                {t('next_scheduled_post', 'Next scheduled post')}
              </div>
              {nextPost ? (
                <div className="flex items-center gap-[12px]">
                  <PlatformAvatar
                    picture={nextPost.integration?.picture}
                    identifier={nextPost.integration?.providerIdentifier}
                    size={40}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-[12.5px] text-newTextColor truncate">
                      {stripHtml(nextPost.content) ||
                        t('no_text_content', 'No text content')}
                    </div>
                    <div className="text-[11.5px] text-btnPrimary mt-[2px]">
                      {fmtDate(nextPost.publishDate)} ·{' '}
                      {relativeTime(nextPost.publishDate)}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-[12.5px] text-textItemBlur py-[6px]">
                  {t('nothing_scheduled', 'Nothing scheduled yet.')}
                </div>
              )}
            </div>

            {/* Channels summary */}
            <div className="glass-surface bg-newBgColorInner border border-newTableBorder rounded-[16px] p-[16px]">
              <div className="text-[13px] font-[600] mb-[12px]">
                {t('connected_accounts', 'Connected accounts')}
              </div>
              {channels.length === 0 ? (
                <div className="text-[12.5px] text-textItemBlur py-[6px]">
                  {t('no_accounts_connected', 'No accounts connected to this client yet.')}
                </div>
              ) : (
                <div className="flex flex-col gap-[10px]">
                  {channels.slice(0, 5).map((c) => {
                    const meta = HEALTH_META[healthOf(c)];
                    return (
                      <div key={c.id} className="flex items-center gap-[10px]">
                        <PlatformAvatar
                          picture={c.picture}
                          identifier={c.identifier}
                          size={30}
                          dim={c.disabled}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-[12.5px] font-[600] truncate">
                            {c.name}
                          </div>
                        </div>
                        <span className={`text-[10px] font-[700] px-[8px] py-[3px] rounded-full ${meta.chip}`}>
                          {meta.label}
                        </span>
                      </div>
                    );
                  })}
                  {channels.length > 5 && (
                    <button
                      onClick={() => setTab('accounts')}
                      className="text-[11.5px] text-btnPrimary hover:underline text-start"
                    >
                      +{channels.length - 5} {t('more', 'more')}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Recent activity */}
          <div className="glass-surface bg-newBgColorInner border border-newTableBorder rounded-[16px] overflow-hidden">
            <div className="text-[13px] font-[600] px-[14px] py-[12px] border-b border-newTableBorder">
              {t('recent_activity', 'Recent activity')}
            </div>
            {publishedPosts.length === 0 ? (
              <div className="text-[12.5px] text-textItemBlur px-[14px] py-[20px]">
                {t('no_published_yet', 'No published posts yet.')}
              </div>
            ) : (
              publishedPosts
                .slice()
                .sort(
                  (a, b) =>
                    new Date(b.publishDate).getTime() -
                    new Date(a.publishDate).getTime()
                )
                .slice(0, 5)
                .map((p) => <PostRow key={p.id} p={p} t={t} />)
            )}
          </div>
        </div>
      )}

      {/* ACCOUNTS */}
      {tab === 'accounts' && (
        <div className="flex flex-col gap-[12px]">
          {channels.length === 0 ? (
            <div className="bg-newBgColorInner border border-newTableBorder rounded-[16px] px-[18px] py-[44px] text-center">
              <div className="text-[14px] font-[600]">
                {t('no_accounts_connected_title', 'No accounts connected')}
              </div>
              <div className="text-[12.5px] text-textItemBlur mt-[4px]">
                {t('assign_from_accounts', 'Assign channels to this client from the Accounts page.')}
              </div>
              <button
                onClick={() => router.push('/accounts')}
                className="mt-[14px] px-[14px] py-[8px] rounded-[10px] text-[12.5px] font-[600] bg-btnPrimary text-white hover:brightness-110 transition"
              >
                {t('go_to_accounts', 'Go to Accounts')}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-[12px]">
              {channels.map((c) => {
                const meta = HEALTH_META[healthOf(c)];
                const last = relativeTime(lastPublished?.[c.id]);
                return (
                  <div
                    key={c.id}
                    className="glass-surface bg-newBgColorInner border border-newTableBorder rounded-[14px] p-[14px] flex items-center gap-[12px]"
                  >
                    <PlatformAvatar
                      picture={c.picture}
                      identifier={c.identifier}
                      size={42}
                      dim={c.disabled}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-[13.5px] font-[600] truncate">
                        {c.name}
                      </div>
                      <div className="text-[11.5px] text-textItemBlur">
                        {providerLabel(c.identifier)}
                        {last ? ` · ${t('last', 'last')} ${last}` : ''}
                      </div>
                    </div>
                    {c.refreshNeeded ? (
                      <button
                        onClick={() => reconnect(c)}
                        className="shrink-0 px-[10px] py-[6px] rounded-[9px] text-[11.5px] font-[700] bg-[#daa646] text-black hover:brightness-110 transition"
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
              })}
            </div>
          )}
        </div>
      )}

      {/* CONTENT */}
      {tab === 'content' && (
        <div className="flex flex-col gap-[12px]">
          <div className="flex items-center gap-[4px] bg-newBgColorInner border border-newTableBorder rounded-[12px] p-[4px] w-fit">
            {CONTENT_FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setContentFilter(f.key)}
                className={`px-[13px] py-[6px] rounded-[9px] text-[12px] font-[600] transition-colors ${
                  contentFilter === f.key
                    ? 'bg-btnPrimary text-white'
                    : 'text-textItemBlur hover:text-newTextColor'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="glass-surface bg-newBgColorInner border border-newTableBorder rounded-[16px] overflow-hidden">
            {filteredContent.length === 0 ? (
              <div className="text-[12.5px] text-textItemBlur px-[14px] py-[30px] text-center">
                {t('no_posts_here', 'No posts in this view.')}
              </div>
            ) : (
              filteredContent
                .slice(0, 100)
                .map((p) => <PostRow key={p.id} p={p} t={t} />)
            )}
          </div>
        </div>
      )}

      {/* ANALYTICS (DB-derived, no external calls) */}
      {tab === 'analytics' && (
        <div className="flex flex-col gap-[16px]">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-[12px]">
            <StatCard
              label={t('total_published', 'Total published')}
              value={counts.published}
              accent="text-[#47b985]"
            />
            <StatCard label={t('scheduled', 'Scheduled')} value={counts.scheduled} />
            <StatCard label={t('drafts', 'Drafts')} value={counts.drafts} />
            <StatCard
              label={t('active_channels', 'Active channels')}
              value={activeChannels}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-[16px]">
            {/* Published per month */}
            <div className="glass-surface bg-newBgColorInner border border-newTableBorder rounded-[16px] p-[16px]">
              <div className="text-[13px] font-[600] mb-[16px]">
                {t('published_last_6_months', 'Published — last 6 months')}
              </div>
              <div className="flex items-end justify-between gap-[10px] h-[130px]">
                {perMonth.map((b) => (
                  <div
                    key={b.key}
                    className="flex-1 flex flex-col items-center gap-[8px] h-full justify-end"
                  >
                    <div className="text-[11px] text-textItemBlur tabular-nums">
                      {b.count}
                    </div>
                    <div
                      className="w-full max-w-[34px] rounded-[6px] bg-btnPrimary/80"
                      style={{
                        height: `${(b.count / maxMonth) * 100}%`,
                        minHeight: b.count > 0 ? 6 : 2,
                        opacity: b.count > 0 ? 1 : 0.25,
                      }}
                    />
                    <div className="text-[11px] text-textItemBlur">{b.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Published per channel */}
            <div className="glass-surface bg-newBgColorInner border border-newTableBorder rounded-[16px] p-[16px]">
              <div className="text-[13px] font-[600] mb-[14px]">
                {t('published_by_channel', 'Published by channel')}
              </div>
              {perChannelPublished.length === 0 ? (
                <div className="text-[12.5px] text-textItemBlur py-[6px]">
                  {t('no_channels', 'No channels.')}
                </div>
              ) : (
                <div className="flex flex-col gap-[11px]">
                  {perChannelPublished.map(({ channel, count }) => {
                    const max = Math.max(
                      1,
                      ...perChannelPublished.map((x) => x.count)
                    );
                    return (
                      <div key={channel.id} className="flex items-center gap-[10px]">
                        <PlatformAvatar
                          picture={channel.picture}
                          identifier={channel.identifier}
                          size={26}
                          dim={channel.disabled}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-[8px]">
                            <span className="text-[12px] truncate">
                              {channel.name}
                            </span>
                            <span className="text-[12px] text-textItemBlur tabular-nums shrink-0">
                              {count}
                            </span>
                          </div>
                          <div className="mt-[5px] h-[6px] rounded-full bg-newBgLineColor overflow-hidden">
                            <div
                              className="h-full rounded-full bg-btnPrimary"
                              style={{ width: `${(count / max) * 100}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="text-[11.5px] text-textItemBlur">
            {t(
              'analytics_db_note',
              'Figures are computed from this client’s posts in Mapped Out. Platform reach & engagement metrics are available per channel on the Analytics page.'
            )}
          </div>
        </div>
      )}
    </div>
  );
};
