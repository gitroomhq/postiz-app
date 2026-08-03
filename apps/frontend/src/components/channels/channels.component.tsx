'use client';

import { FC, useMemo, useState } from 'react';
import clsx from 'clsx';
import Link from 'next/link';
import { useIntegrationList } from '@gitroom/frontend/components/launches/helpers/use.integration.list';
import { TimeTable } from '@gitroom/frontend/components/launches/time.table';
import { Menu } from '@gitroom/frontend/components/launches/menu/menu';
import ImageWithFallback from '@gitroom/react/helpers/image.with.fallback';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import useSWR from 'swr';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';

/**
 * The Channels page.
 *
 * Everything here already existed — time slots, move to a group, custom URL,
 * copy channel ID, disable, reconnect — but it lived behind a three-dot menu on
 * a 260px column beside the calendar. This is the same actions given room, not
 * new capability, which is why it reuses `menu.tsx` and `time.table.tsx` rather
 * than reimplementing either.
 *
 * The Scheduled / Drafts / Published counters read `GET /posts/count`, added
 * for exactly this: the list endpoint filters by customer and state, never by
 * integration. Deriving them from whichever week happened to be loaded would
 * have looked authoritative and been wrong.
 */

const ChannelCounts: FC<{ integrationId: string }> = ({ integrationId }) => {
  const t = useT();
  const fetch = useFetch();
  const { data } = useSWR(
    `/posts/count?integration=${integrationId}`,
    async (path: string) =>
      (await (await fetch(path)).json()) as Record<string, number>,
    { revalidateOnFocus: false }
  );

  const cells: Array<[string, number]> = [
    [t('scheduled', 'Scheduled'), data?.scheduled ?? 0],
    [t('drafts', 'Drafts'), data?.draft ?? 0],
    [t('published', 'Published'), data?.published ?? 0],
  ];

  return (
    <div className="grid grid-cols-3 gap-[10px]">
      {cells.map(([label, value]) => (
        <div
          key={label}
          data-channel-count={label}
          className="rounded-pqMd border border-pqBorder p-[14px]"
        >
          <div className="text-[11px] font-[600] uppercase tracking-[0.06em] text-pqSoft">
            {label}
          </div>
          <div className="mt-[4px] text-[24px] font-[600]">
            {data ? value : '—'}
          </div>
        </div>
      ))}
    </div>
  );
};
export const ChannelsComponent: FC = () => {
  const t = useT();
  const { data: integrations, mutate } = useIntegrationList();
  const [selected, setSelected] = useState<string>('');

  const list = useMemo(() => integrations || [], [integrations]);
  const current = useMemo(
    () => list.find((i: any) => i.id === selected) || list[0],
    [list, selected]
  );

  if (!list.length) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-[10px] p-[40px] text-center">
        <div className="text-[18px] font-[600]">
          {t('no_channels', 'No channels yet')}
        </div>
        <div className="max-w-[380px] text-[13.5px] text-pqMuted">
          {t('connect_your_accounts')}
        </div>
        <Link
          href="/launches"
          className="mt-[6px] rounded-pqSm bg-pqBrand px-[16px] py-[9px] text-[13.5px] font-[600] text-pqOnBrand"
        >
          {t('add_channel', 'Add Channel')}
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 gap-[1px] bg-newBgLineColor">
      <div className="flex w-[300px] shrink-0 flex-col gap-[6px] overflow-y-auto bg-pqInner p-[16px]">
        <div className="mb-[4px] flex items-baseline gap-[8px]">
          <span className="text-[11px] font-[700] uppercase tracking-[0.08em] text-pqSoft">
            {t('channels', 'Channels')}
          </span>
          <span className="text-[11px] font-[600] text-pqSoft opacity-70">
            {list.length}
          </span>
        </div>
        {list.map((integration: any) => (
          <button
            key={integration.id}
            type="button"
            data-channel={integration.id}
            onClick={() => setSelected(integration.id)}
            className={clsx(
              'flex items-center gap-[10px] rounded-pqSm p-[8px] text-start transition-colors',
              current?.id === integration.id
                ? 'bg-pqNavActive'
                : 'hover:bg-pqHover'
            )}
          >
            <span className="relative shrink-0">
              <ImageWithFallback
                fallbackSrc={`/icons/platforms/${integration.identifier}.png`}
                src={integration.picture}
                alt={integration.identifier}
                width={32}
                height={32}
                className="rounded-full"
              />
              <img
                src={`/icons/platforms/${integration.identifier}.png`}
                alt=""
                className="absolute -bottom-[2px] -end-[2px] h-[15px] w-[15px] rounded-full border border-pqInner"
              />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13.5px] font-[500]">
                {integration.name}
              </span>
              <span
                className={clsx(
                  'block truncate text-[11.5px]',
                  integration.refreshNeeded || integration.inBetweenSteps
                    ? 'text-pqWarn'
                    : 'text-pqMuted'
                )}
              >
                {integration.refreshNeeded || integration.inBetweenSteps
                  ? t('channel_disconnected', 'Channel disconnected')
                  : integration.identifier}
              </span>
            </span>
          </button>
        ))}
      </div>

      {!!current && (
        <div
          data-channel-detail={current.id}
          className="flex min-w-0 flex-1 flex-col gap-[20px] overflow-y-auto bg-pqInner p-[24px]"
        >
          <div className="flex items-center gap-[14px]">
            <ImageWithFallback
              fallbackSrc={`/icons/platforms/${current.identifier}.png`}
              src={current.picture}
              alt={current.identifier}
              width={52}
              height={52}
              className="rounded-full"
            />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[21px] font-[600] -tracking-[0.01em]">
                {current.name}
              </div>
              <div className="mt-[2px] flex items-center gap-[8px] text-[12.5px] text-pqMuted">
                <span>{current.identifier}</span>
                <span
                  className={clsx(
                    'rounded-[5px] px-[6px] py-[1px] text-[10.5px] font-[700]',
                    current.refreshNeeded || current.inBetweenSteps
                      ? 'bg-pqAmberSoft text-pqAmber'
                      : 'bg-pqOkSoft text-pqOk'
                  )}
                >
                  {current.refreshNeeded || current.inBetweenSteps
                    ? t('needs_reconnect', 'Needs reconnecting')
                    : t('connected', 'Connected')}
                </span>
              </div>
            </div>
            {/* Everything the three-dot menu already does — reconnect, custom
                URL, copy channel ID, move to a group, nickname, picture,
                disable, delete — stays in one place rather than being
                reimplemented as rows. */}
            <Menu
              id={current.id}
              canEnable={!!current.disabled}
              canDisable={!current.disabled}
              canChangeProfilePicture={!!current.changeProfilePicture}
              canChangeNickName={!!current.changeNickName}
              refreshChannel={() => () => mutate()}
              mutate={mutate}
              onChange={() => mutate()}
            />
          </div>

          <ChannelCounts integrationId={current.id} />

          <div className="flex flex-wrap gap-[8px]">
            <Link
              href="/launches"
              className="rounded-pqSm bg-pqBrand px-[14px] py-[9px] text-[13px] font-[600] text-pqOnBrand"
            >
              {t('new_post', 'New post')}
            </Link>
            <Link
              href="/plugs"
              className="rounded-pqSm bg-pqBtnSimple px-[14px] py-[9px] text-[13px] font-[600] text-pqText transition-colors hover:bg-pqHover"
            >
              {t('automations', 'Automations')}
            </Link>
          </div>

          <div className="flex flex-col gap-[8px]">
            <div className="flex items-baseline gap-[8px]">
              <span className="text-[11px] font-[700] uppercase tracking-[0.08em] text-pqSoft">
                {t('time_table_slots', 'Time Table Slots')}
              </span>
              <span className="h-[1px] flex-1 bg-pqLine" />
            </div>
            <div className="rounded-pqMd border border-pqBorder p-[16px]">
              <TimeTable integration={current} mutate={mutate} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
