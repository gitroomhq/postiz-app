'use client';

import React, { FC, useCallback, useMemo, useState } from 'react';
import useSWR from 'swr';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { expandPostsList } from '@gitroom/helpers/utils/posts.list.minify';

interface Customer {
  id: string;
  name: string;
}
interface PostItem {
  id: string;
  content: string;
  publishDate: string;
  releaseURL?: string;
  state: string;
  group?: string;
  integration?: {
    id: string;
    providerIdentifier: string;
    name: string;
    picture?: string;
  };
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const stripHtml = (s?: string) =>
  (s || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

const fmtDate = (iso?: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const STATE_META: Record<string, { label: string; cls: string }> = {
  PUBLISHED: { label: 'Published', cls: 'text-[#47b985] bg-[#47b985]/15' },
  QUEUE: { label: 'Scheduled', cls: 'text-btnPrimary bg-btnPrimary/15' },
  DRAFT: { label: 'Draft', cls: 'text-textItemBlur bg-newBgLineColor' },
  ERROR: { label: 'Failed', cls: 'text-[#d16a6a] bg-[#d16a6a]/15' },
};

const PlatformAvatar: FC<{ p?: PostItem['integration']; size?: number }> = ({
  p,
  size = 34,
}) => (
  <div className="relative shrink-0" style={{ width: size, height: size }}>
    <img
      src={p?.picture || '/no-picture.jpg'}
      alt=""
      onError={(e) => {
        (e.currentTarget as HTMLImageElement).src = '/no-picture.jpg';
      }}
      className="rounded-[10px] object-cover border border-newTableBorder w-full h-full"
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

const PostRow: FC<{ p: PostItem; t: (k: string, d: string) => string }> = ({
  p,
  t,
}) => {
  const snippet = stripHtml(p.content);
  const sm = STATE_META[p.state] || STATE_META.DRAFT;
  const open = useCallback(() => {
    window.open(`/p/${p.id}?share=true`, '_blank');
  }, [p.id]);
  return (
    <div
      onClick={open}
      className="flex items-center gap-[12px] px-[14px] py-[11px] border-b border-newTableBorder last:border-b-0 cursor-pointer hover:bg-newBgLineColor/40 transition-colors"
    >
      <PlatformAvatar p={p.integration} size={34} />
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
      <span className={`shrink-0 text-[10px] font-[700] px-[8px] py-[3px] rounded-full ${sm.cls}`}>
        {t(`state_${p.state}`, sm.label)}
      </span>
    </div>
  );
};

export const PostLibraryComponent: FC = () => {
  const fetch = useFetch();
  const t = useT();
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [expandedYears, setExpandedYears] = useState<Record<string, boolean>>({});
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null); // "YYYY-M"
  const [search, setSearch] = useState('');

  const load = useCallback(async (url: string) => (await fetch(url)).json(), []);
  const { data: customers } = useSWR<Customer[]>('/integrations/customers', load);

  // Lazily fetch the selected client's full post history (published paginated +
  // scheduled + draft), merged + de-duped. state='all' only returns future, so
  // published must be fetched separately (see posts.repository getPostsList).
  const fetchAll = useCallback(
    async (customer: string, state: string, maxPages: number) => {
      const out: PostItem[] = [];
      for (let page = 0; page < maxPages; page++) {
        const res = expandPostsList(
          await (
            await fetch(
              `/posts/list?customer=${customer}&state=${state}&page=${page}&limit=100`
            )
          ).json()
        );
        out.push(...((res?.posts as PostItem[]) || []));
        if (!res?.hasMore) break;
      }
      return out;
    },
    [fetch]
  );

  const { data: clientPosts, isLoading } = useSWR(
    selectedClient ? `library-posts-${selectedClient}` : null,
    async () => {
      const [published, scheduled, draft] = await Promise.all([
        fetchAll(selectedClient!, 'published', 12),
        fetchAll(selectedClient!, 'scheduled', 3),
        fetchAll(selectedClient!, 'draft', 3),
      ]);
      const byId = new Map<string, PostItem>();
      for (const p of [...published, ...scheduled, ...draft]) {
        if (p?.id) byId.set(p.id, p);
      }
      return Array.from(byId.values());
    },
    { revalidateOnFocus: false, revalidateIfStale: false }
  );

  const posts: PostItem[] = useMemo(() => clientPosts || [], [clientPosts]);

  // Year → Month tree with counts.
  const tree = useMemo(() => {
    const years = new Map<number, Map<number, number>>();
    for (const p of posts) {
      const d = new Date(p.publishDate);
      if (Number.isNaN(d.getTime())) continue;
      const y = d.getFullYear();
      const m = d.getMonth();
      if (!years.has(y)) years.set(y, new Map());
      const months = years.get(y)!;
      months.set(m, (months.get(m) || 0) + 1);
    }
    return Array.from(years.entries())
      .sort((a, b) => b[0] - a[0])
      .map(([year, months]) => ({
        year,
        total: Array.from(months.values()).reduce((s, n) => s + n, 0),
        months: Array.from(months.entries())
          .sort((a, b) => b[0] - a[0])
          .map(([month, count]) => ({ month, count })),
      }));
  }, [posts]);

  const visiblePosts = useMemo(() => {
    let list = posts;
    if (selectedMonth) {
      const [y, m] = selectedMonth.split('-').map(Number);
      list = list.filter((p) => {
        const d = new Date(p.publishDate);
        return d.getFullYear() === y && d.getMonth() === m;
      });
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          stripHtml(p.content).toLowerCase().includes(q) ||
          p.integration?.name?.toLowerCase().includes(q)
      );
    }
    return [...list].sort(
      (a, b) =>
        new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime()
    );
  }, [posts, selectedMonth, search]);

  const selectClient = useCallback((id: string) => {
    setSelectedClient(id);
    setSelectedMonth(null);
    setExpandedYears({});
    setSearch('');
  }, []);

  const selectedClientName = useMemo(
    () => customers?.find((c) => c.id === selectedClient)?.name,
    [customers, selectedClient]
  );

  return (
    <div className="flex-1 flex flex-col gap-[16px] p-[20px]">
      <div>
        <h1 className="text-[22px] font-[600]">{t('post_library', 'Post Library')}</h1>
        <p className="text-[13px] text-textItemBlur mt-[2px]">
          {t(
            'post_library_sub',
            'Browse every post by client, year and month.'
          )}
        </p>
      </div>

      <div className="flex-1 flex gap-[16px] min-h-0 flex-col lg:flex-row">
        {/* Folder tree */}
        <div className="glass-surface bg-newBgColorInner border border-newTableBorder rounded-[16px] p-[10px] w-full lg:w-[300px] shrink-0 overflow-auto">
          <div className="text-[10px] uppercase tracking-wider text-textItemBlur font-[600] px-[10px] py-[8px]">
            {t('clients', 'Clients')}
          </div>
          {!customers && (
            <div className="px-[10px] py-[10px] text-[12.5px] text-textItemBlur">
              {t('loading', 'Loading…')}
            </div>
          )}
          {customers?.length === 0 && (
            <div className="px-[10px] py-[10px] text-[12.5px] text-textItemBlur">
              {t('no_clients_yet', 'No clients yet')}
            </div>
          )}
          {customers?.map((c) => {
            const isSel = selectedClient === c.id;
            return (
              <div key={c.id}>
                <button
                  onClick={() => (isSel ? setSelectedClient(null) : selectClient(c.id))}
                  className={`w-full text-start flex items-center gap-[9px] px-[10px] py-[9px] rounded-[10px] text-[13px] font-[600] transition-colors ${
                    isSel
                      ? 'bg-btnPrimary/10 text-newTextColor'
                      : 'text-newTextColor hover:bg-newBgLineColor/50'
                  }`}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={isSel ? 'text-btnPrimary' : 'text-textItemBlur'}>
                    <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  </svg>
                  <span className="flex-1 truncate">{c.name}</span>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`transition-transform ${isSel ? 'rotate-90' : ''} text-textItemBlur`}>
                    <path d="m9 6 6 6-6 6" />
                  </svg>
                </button>

                {isSel && (
                  <div className="ps-[14px] pb-[6px]">
                    {isLoading && (
                      <div className="px-[10px] py-[8px] text-[12px] text-textItemBlur">
                        {t('loading_posts', 'Loading posts…')}
                      </div>
                    )}
                    {!isLoading && tree.length === 0 && (
                      <div className="px-[10px] py-[8px] text-[12px] text-textItemBlur">
                        {t('no_posts_for_client', 'No posts for this client.')}
                      </div>
                    )}
                    {!isLoading &&
                      tree.map((y) => {
                        const yKey = `${c.id}-${y.year}`;
                        const yOpen = expandedYears[yKey];
                        return (
                          <div key={y.year}>
                            <button
                              onClick={() =>
                                setExpandedYears((prev) => ({
                                  ...prev,
                                  [yKey]: !prev[yKey],
                                }))
                              }
                              className="w-full text-start flex items-center gap-[8px] px-[10px] py-[7px] rounded-[8px] text-[12.5px] hover:bg-newBgLineColor/50 transition-colors"
                            >
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`transition-transform ${yOpen ? 'rotate-90' : ''} text-textItemBlur`}>
                                <path d="m9 6 6 6-6 6" />
                              </svg>
                              <span className="flex-1 font-[600]">{y.year}</span>
                              <span className="text-[11px] text-textItemBlur tabular-nums">
                                {y.total}
                              </span>
                            </button>
                            {yOpen && (
                              <div className="ps-[20px]">
                                {y.months.map((mo) => {
                                  const mKey = `${y.year}-${mo.month}`;
                                  const mSel = selectedMonth === mKey;
                                  return (
                                    <button
                                      key={mo.month}
                                      onClick={() =>
                                        setSelectedMonth(mSel ? null : mKey)
                                      }
                                      className={`w-full text-start flex items-center gap-[8px] px-[10px] py-[6px] rounded-[8px] text-[12px] transition-colors ${
                                        mSel
                                          ? 'bg-btnPrimary text-white'
                                          : 'text-textItemBlur hover:text-newTextColor hover:bg-newBgLineColor/50'
                                      }`}
                                    >
                                      <span className="flex-1">
                                        {MONTHS[mo.month]}
                                      </span>
                                      <span className="tabular-nums">
                                        {mo.count}
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Posts panel */}
        <div className="flex-1 flex flex-col gap-[12px] min-w-0">
          {!selectedClient ? (
            <div className="glass-surface bg-newBgColorInner border border-newTableBorder rounded-[16px] px-[18px] py-[60px] text-center">
              <div className="text-[14px] font-[600]">
                {t('pick_a_client', 'Select a client to browse their posts')}
              </div>
              <div className="text-[12.5px] text-textItemBlur mt-[5px]">
                {t(
                  'pick_a_client_help',
                  'Posts are organised by client, then year and month.'
                )}
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-[10px] flex-wrap">
                <div className="text-[14px] font-[600] flex-1 min-w-[160px]">
                  {selectedClientName}
                  {selectedMonth && (
                    <span className="text-textItemBlur font-[400]">
                      {' · '}
                      {MONTHS[Number(selectedMonth.split('-')[1])]}{' '}
                      {selectedMonth.split('-')[0]}
                    </span>
                  )}
                  <span className="text-textItemBlur font-[400] text-[12.5px]">
                    {' '}
                    ({visiblePosts.length})
                  </span>
                </div>
                <div className="flex items-center gap-[8px] bg-newBgColorInner border border-newTableBorder rounded-[12px] px-[14px] py-[9px] min-w-[200px]">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-textItemBlur">
                    <circle cx="11" cy="11" r="7" />
                    <path d="m21 21-4-4" />
                  </svg>
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={t('search_posts', 'Search posts…')}
                    className="bg-transparent outline-none text-[13px] flex-1 text-newTextColor"
                  />
                </div>
              </div>

              <div className="glass-surface bg-newBgColorInner border border-newTableBorder rounded-[16px] overflow-hidden flex-1">
                {isLoading ? (
                  <div className="px-[14px] py-[40px] text-center text-textItemBlur text-[13px]">
                    {t('loading_posts', 'Loading posts…')}
                  </div>
                ) : visiblePosts.length === 0 ? (
                  <div className="px-[14px] py-[40px] text-center text-textItemBlur text-[13px]">
                    {t('no_posts_here', 'No posts in this view.')}
                  </div>
                ) : (
                  visiblePosts.map((p) => <PostRow key={p.id} p={p} t={t} />)
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
