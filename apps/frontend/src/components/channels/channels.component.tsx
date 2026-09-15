'use client';

import { FC, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import dayjs from 'dayjs';
import copy from 'copy-to-clipboard';
import { useRouter, useSearchParams } from 'next/navigation';
import { useIntegrationList } from '@gitroom/frontend/components/launches/helpers/use.integration.list';
import { TimeTable } from '@gitroom/frontend/components/launches/time.table';
import ImageWithFallback from '@gitroom/react/helpers/image.with.fallback';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import useSWR from 'swr';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useModals } from '@gitroom/frontend/components/layout/new-modal';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { deleteDialog } from '@gitroom/react/helpers/delete.dialog';
import {
  SettingsModal,
  publishingOptionCopy,
} from '@gitroom/frontend/components/launches/settings.modal';
import {
  AddProviderComponent,
  CustomVariables,
} from '@gitroom/frontend/components/launches/add.provider.component';
import { AddEditModal } from '@gitroom/frontend/components/new-launch/add.edit.modal';
import { CalendarWeekProvider } from '@gitroom/frontend/components/launches/calendar.context';
import { ChannelAutomations } from '@gitroom/frontend/components/channels/channel.automations';
import { CustomerModal } from '@gitroom/frontend/components/launches/customer.modal';
import { BotPicture } from '@gitroom/frontend/components/launches/bot.picture';
import { useTourNeeds } from '@gitroom/frontend/components/onboarding/tour';
import { useVariables } from '@gitroom/react/helpers/variable.context';
import useCookie from 'react-use-cookie';
import { useViewport } from '@gitroom/frontend/components/layout/use.viewport';
import { TwoColumnDetailDrawer } from '@gitroom/frontend/components/layout/two-column-detail-drawer';
import { Skeleton } from '@gitroom/react/ui/skeleton';
import {
  ChannelsListEmpty,
  ChannelsPageEmpty,
} from '@gitroom/frontend/components/ui/no-channels-art';
import {
  formatChannelHandle,
  channelNameWithHandle,
  channelListSubtitle,
} from '@gitroom/frontend/components/channels/channel-handle';
import { selectAddedIntegration } from '@gitroom/frontend/components/channels/select-added-integration';

/**
 * Channels page — design's list + detail (or inline Add Channel pane).
 * Content column is max-w 760 centered (prototype :1720 / :1861).
 * Reconnect LOOK matches chDetailNeedsFix; WORK is existing OAuth refresh.
 */

/** Design content column — add grid + channel detail. */
const CH_CONTENT_MAX = 'max-w-[760px]';

const needsAttention = (integration: any) =>
  !!(integration.refreshNeeded || integration.inBetweenSteps);

const ChannelCounts: FC<{ integrationId: string }> = ({ integrationId }) => {
  const t = useT();
  const fetch = useFetch();
  const { data } = useSWR(
    `/posts/count?integration=${integrationId}`,
    async (path: string) =>
      (await (await fetch(path)).json()) as Record<string, number>,
    { revalidateOnFocus: false }
  );

  // Design chDetailStats: all three neutral cards; accent dots keep brand /
  // amber / ok so the cells stay readable at a glance.
  const cells: Array<{
    label: string;
    key: string;
    dot: string;
    surface: string;
  }> = [
    {
      label: t('scheduled', 'Scheduled'),
      key: 'scheduled',
      dot: 'var(--brand)',
      surface: 'border border-pqBorder bg-transparent',
    },
    {
      label: t('drafts', 'Drafts'),
      key: 'draft',
      dot: 'var(--amber)',
      surface: 'border border-pqBorder bg-transparent',
    },
    {
      label: t('published', 'Published'),
      key: 'published',
      dot: 'var(--ok)',
      surface: 'border border-pqBorder bg-transparent',
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-[10px]">
      {cells.map(({ label, key, dot, surface }) => (
        <div
          key={key}
          data-channel-count={label}
          className={clsx('rounded-pqMd p-[14px]', surface)}
        >
          <div className="flex items-center gap-[6px]">
            <span
              className="h-[6px] w-[6px] rounded-full"
              style={{ background: dot }}
            />
            <span className="text-[11px] font-[600] uppercase tracking-[0.06em] text-pqSoft">
              {label}
            </span>
          </div>
          <div className="mt-[6px] text-[21px] font-[600] tabular-nums text-pqText">
            {data ? data[key] ?? 0 : '—'}
          </div>
        </div>
      ))}
    </div>
  );
};

/**
 * Design chOpts — expandable "{Platform} options" accordion with per-row Edit
 * that opens the existing SettingsModal (no provider settings rewrite).
 */
const PublishingOptions: FC<{ integration: any; mutate: () => void }> = ({
  integration,
  mutate,
}) => {
  const t = useT();
  const modal = useModals();
  const toast = useToaster();
  const [openList, setOpenList] = useState(true);

  const options: any[] = useMemo(() => {
    try {
      const parsed = JSON.parse(integration.additionalSettings || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, [integration.additionalSettings]);

  const platformLabel = useMemo(() => {
    const id = String(integration.identifier || '');
    if (!id) return t('channel', 'Channel');
    if (id === 'x' || id === 'twitter') return 'X';
    return id.charAt(0).toUpperCase() + id.slice(1);
  }, [integration.identifier, t]);

  const openEditor = useCallback(() => {
    modal.openModal({
      title: t('publishing_options', 'Publishing options'),
      children: (
        <SettingsModal
          integration={integration}
          onClose={() => {
            mutate();
            toast.show(t('settings_updated', 'Settings Updated'), 'success');
          }}
        />
      ),
    });
  }, [integration, modal, mutate, t, toast]);

  if (!options.length) {
    return null;
  }

  const countLabel =
    options.length === 1
      ? t('one_publishing_option', '1 publishing option')
      : t('n_publishing_options', '{count} publishing options').replace(
          '{count}',
          String(options.length)
        );

  return (
    <div
      data-ch-opts="1"
      className="overflow-hidden rounded-pqMd bg-pqPop shadow-[inset_0_0_0_1px_var(--border)]"
    >
      <button
        type="button"
        aria-expanded={openList}
        aria-controls={`ch-opts-${integration.id}`}
        onClick={() => setOpenList((v) => !v)}
        className={clsx(
          'flex w-full items-center gap-[12px] px-[15px] py-[13px] text-start transition-colors hover:bg-pqHover',
          openList && 'border-b border-pqLine'
        )}
      >
        <span className="grid size-[30px] shrink-0 place-items-center rounded-[9px] bg-pqSettings text-pqMuted">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none">
            <path
              d="M20 6.5h-7M8 6.5H4M20 17.5h-4M11 17.5H4M8 3.5v6M16 14.5v6"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[13.5px] font-[600] text-pqText">
            {t('platform_options', '{{name}} options', { name: platformLabel })}
          </span>
          <span className="mt-[2px] block text-[12.5px] text-pqMuted">
            {countLabel}
          </span>
        </span>
        <svg
          viewBox="0 0 24 24"
          width="15"
          height="15"
          fill="none"
          className={clsx(
            'shrink-0 text-pqSoft transition-transform duration-150',
            openList && 'rotate-180'
          )}
        >
          <path
            d="m6 9 6 6 6-6"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      {openList && (
        <div
          id={`ch-opts-${integration.id}`}
          data-publishing-options={options.length}
          className="bg-pqThird"
        >
          {options.map((option: any) => {
            const copy = publishingOptionCopy(option, (key, fallback) =>
              t(key, fallback)
            );
            return (
              <div
                key={option.title}
                className="flex items-center gap-[12px] border-b border-pqLine py-[12px] pe-[15px] ps-[57px] last:border-b-0"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13.5px] font-[600] text-pqText">
                    {copy.title}
                  </div>
                  <div className="mt-[2px] text-[12.5px] leading-[1.45] text-pqMuted">
                    {copy.hint}
                  </div>
                </div>
                {copy.status ? (
                  <span className="grid h-[20px] shrink-0 place-items-center rounded-full bg-pqSettings px-[8px] text-[11px] font-[600] tabular-nums text-pqMuted">
                    {copy.status}
                  </span>
                ) : null}
                <button
                  type="button"
                  onClick={openEditor}
                  className="grid h-[30px] shrink-0 place-items-center rounded-pqSm bg-pqBtnSimple px-[12px] text-[12.5px] font-[600] text-pqText hover:bg-pqHover"
                >
                  {t('edit', 'Edit')}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

type SettingsRow = {
  key: string;
  label: string;
  hint: string;
  cta: string;
  warn?: boolean;
  onClick: () => void;
  icon: string;
};

/**
 * Design chDetailGroups — Channel / Access rows. Handlers mirror Menu WORK
 * (CustomerModal, TimeTable modal, CustomVariables, disable/delete APIs).
 */
const ChannelSettingsGroups: FC<{
  integration: any;
  mutate: () => void | Promise<unknown>;
  reconnect: () => void;
  openSlots: () => void;
  onDeleted?: (id: string) => void;
}> = ({ integration, mutate, reconnect, openSlots, onDeleted }) => {
  const t = useT();
  const fetch = useFetch();
  const modal = useModals();
  const toast = useToaster();
  const router = useRouter();
  const { extensionId } = useVariables();

  const hasCustomFields = !!(
    integration.isCustomFields ||
    (Array.isArray(integration.customFields) && integration.customFields.length)
  );

  const copyId = useCallback(() => {
    copy(integration.id);
    toast.show(
      t('channel_id_copied', 'Channel ID copied to clipboard'),
      'success'
    );
  }, [integration.id, t, toast]);

  const moveGroup = useCallback(() => {
    modal.openModal({
      classNames: { modal: 'md' },
      title: t('move_add_to_group', 'Move / Add to group'),
      withCloseButton: false,
      closeOnEscape: true,
      closeOnClickOutside: true,
      children: (
        <CustomerModal
          integration={integration}
          onClose={() => {
            mutate();
            toast.show(t('customer_updated', 'Customer Updated'), 'success');
          }}
        />
      ),
    });
  }, [integration, modal, mutate, t, toast]);

  const openCustom = useCallback(() => {
    modal.openModal({
      title: t('custom_url', 'Custom URL'),
      withCloseButton: false,
      classNames: { modal: 'md' },
      children: (
        <CustomVariables
          identifier={integration.identifier}
          gotoUrl={(url: string) => router.push(url)}
          variables={integration.customFields}
        />
      ),
    });
  }, [integration, modal, router, t]);

  const disableChannel = useCallback(async () => {
    if (
      !(await deleteDialog(
        t(
          'are_you_sure_disable_channel',
          'Are you sure you want to disable this channel?'
        ),
        t('disable_channel_title', 'Disable Channel')
      ))
    ) {
      return;
    }
    await fetch('/integrations/disable', {
      method: 'POST',
      body: JSON.stringify({ id: integration.id }),
    });
    toast.show(t('channel_disabled', 'Channel Disabled'), 'success');
    mutate();
  }, [fetch, integration.id, mutate, t, toast]);

  const enableChannel = useCallback(async () => {
    await fetch('/integrations/enable', {
      method: 'POST',
      body: JSON.stringify({ id: integration.id }),
    });
    toast.show(t('channel_enabled', 'Channel Enabled'), 'success');
    mutate();
  }, [fetch, integration.id, mutate, t, toast]);

  const deleteChannel = useCallback(async () => {
    if (
      !(await deleteDialog(
        t(
          'are_you_sure_delete_channel',
          'Are you sure you want to delete this channel?'
        ),
        t('delete_channel_title', 'Delete Channel')
      ))
    ) {
      return;
    }
    try {
      const res = await fetch('/integrations', {
        method: 'DELETE',
        body: JSON.stringify({ id: integration.id }),
      });
      if (res.status === 406) {
        toast.show(
          t(
            'delete_posts_before_channel',
            'You have to delete all the posts associated with this channel before deleting it'
          ),
          'warning'
        );
        return;
      }
      if (
        extensionId &&
        typeof chrome !== 'undefined' &&
        chrome?.runtime?.sendMessage
      ) {
        try {
          chrome.runtime.sendMessage(
            extensionId,
            { type: 'REMOVE_REFRESH_TOKEN', integrationId: integration.id },
            () => {}
          );
        } catch {
          /* ignore */
        }
      }
      toast.show(t('channel_deleted', 'Channel Deleted'), 'success');
      onDeleted?.(integration.id);
      await mutate();
    } finally {
      // Confirm overlay is a zustand modal. This row is not inside
      // `CurrentModalContext`, so `closeCurrent` no-ops here. If anything
      // after the toast throws (or close-by-id missed), unmount the leftover
      // Are you sure? — the inline Add Channel pane is not a modal.
      modal.closeAll();
    }
  }, [extensionId, fetch, integration.id, modal, mutate, onDeleted, t, toast]);

  const channelRows: SettingsRow[] = [
    {
      key: 'slots',
      label: t('edit_time_slots', 'Edit time slots'),
      hint: t(
        'the_hours_this_channel_publishes_at',
        'The hours this channel publishes at'
      ),
      cta: t('edit', 'Edit'),
      onClick: openSlots,
      icon: 'M12 7.5V12l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
    },
    {
      key: 'group',
      label: t('move_add_to_group', 'Move / add to group'),
      hint: t(
        'assign_this_channel_to_a_customer',
        'Assign this channel to a customer'
      ),
      cta: t('move', 'Move'),
      onClick: moveGroup,
      icon: 'M17 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9.5 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM22 21v-2a4 4 0 0 0-3-3.9',
    },
    ...(hasCustomFields
      ? [
          {
            key: 'url',
            label: t('custom_url', 'Custom URL'),
            hint: t(
              'the_link_previews_point_at_for_this_channel',
              'The link previews point at for this channel'
            ),
            cta: t('set', 'Set'),
            onClick: openCustom,
            icon: 'M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.8 1.7M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.8-1.7',
          } as SettingsRow,
        ]
      : []),
    {
      key: 'copy',
      label: t('copy_channel_id', 'Copy channel ID'),
      hint: t(
        'use_it_with_the_api_mcp_or_the_cli',
        'Use it with the API, MCP or the CLI'
      ),
      cta: t('copy', 'Copy'),
      onClick: copyId,
      icon: 'M9 9V5.5A1.5 1.5 0 0 1 10.5 4h8A1.5 1.5 0 0 1 20 5.5v8a1.5 1.5 0 0 1-1.5 1.5H15M5.5 9h8A1.5 1.5 0 0 1 15 10.5v8a1.5 1.5 0 0 1-1.5 1.5h-8A1.5 1.5 0 0 1 4 18.5v-8A1.5 1.5 0 0 1 5.5 9Z',
    },
  ];

  const accessRows: SettingsRow[] = [
    {
      key: 'creds',
      label: t('update_credentials', 'Update credentials'),
      hint: t(
        're_authorise_with_the_platform',
        'Re-authorise with the platform'
      ),
      cta: t('update', 'Update'),
      onClick: hasCustomFields ? openCustom : reconnect,
      icon: 'M15.5 7.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM10 10 3 17v4h4l1-1v-2h2v-2h2l1-1',
    },
    integration.disabled
      ? {
          key: 'enable',
          label: t('enable_channel', 'Enable channel'),
          hint: t(
            'resume_publishing_to_this_channel',
            'Resume publishing to this channel'
          ),
          cta: t('enable', 'Enable'),
          onClick: enableChannel,
          icon: 'M20 6.5 9.5 17 4 11.5',
        }
      : {
          key: 'disable',
          label: t('disable_channel', 'Disable channel'),
          hint: t(
            'keep_the_channel_but_stop_publishing_to_it',
            'Keep the channel but stop publishing to it'
          ),
          cta: t('disable', 'Disable'),
          onClick: disableChannel,
          icon: 'M4.9 4.9l14.2 14.2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
        },
    {
      key: 'delete',
      label: t('delete_channel', 'Delete channel'),
      hint: t(
        'removes_the_channel_and_its_scheduled_posts',
        'Removes the channel and its scheduled posts'
      ),
      cta: t('delete', 'Delete'),
      warn: true,
      onClick: deleteChannel,
      icon: 'M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13M10 11v6M14 11v6',
    },
  ];

  const groups: Array<[string, SettingsRow[]]> = [
    [t('channel_group', 'Channel'), channelRows],
    [t('access_group', 'Access'), accessRows],
  ];

  return (
    <div data-ch-detail-groups="1" className="flex flex-col gap-[14px]">
      {groups.map(([label, rows]) => (
        <div key={label} className="flex flex-col gap-[8px]">
          <div className="px-[2px] text-[10.5px] font-[600] uppercase tracking-[0.07em] text-pqSoft">
            {label}
          </div>
          <div className="overflow-hidden rounded-pqMd bg-pqPop shadow-[inset_0_0_0_1px_var(--border)]">
            {rows.map((row) => (
              <button
                key={row.key}
                type="button"
                onClick={row.onClick}
                className="flex w-full items-center gap-[12px] border-b border-pqLine px-[14px] py-[12px] text-start transition-colors last:border-b-0 hover:bg-pqHover"
              >
                <span
                  className={clsx(
                    'grid size-[30px] shrink-0 place-items-center rounded-[9px] bg-pqSettings',
                    row.warn ? 'text-pqWarn' : 'text-pqMuted'
                  )}
                >
                  <svg viewBox="0 0 24 24" width="15" height="15" fill="none">
                    <path
                      d={row.icon}
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className={clsx(
                      'block text-[13.5px] font-[600]',
                      row.warn ? 'text-pqWarn' : 'text-pqText'
                    )}
                  >
                    {row.label}
                  </span>
                  <span className="mt-[2px] block text-[12.5px] text-pqMuted">
                    {row.hint}
                  </span>
                </span>
                <span
                  className={clsx(
                    'grid h-[30px] shrink-0 place-items-center rounded-pqSm bg-pqBtnSimple px-[12px] text-[12.5px] font-[600]',
                    row.warn ? 'text-pqWarn' : 'text-pqText'
                  )}
                >
                  {row.cta}
                </span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export const ChannelsComponent: FC = () => {
  const t = useT();
  const fetch = useFetch();
  const modal = useModals();
  const toast = useToaster();
  const searchParams = useSearchParams();
  const tourNeedsAdd = useTourNeeds('channel-add');
  const { data: integrations, mutate, isValidating } = useIntegrationList();
  const { mobile, tablet } = useViewport();
  // Shared with Copilot / plugs / analytics — design's single `collapsed`.
  const [collapseMenu, setCollapseMenu] = useCookie('collapseMenu', '0');
  const channelsCollapsed = !mobile && collapseMenu === '1';
  const autoCollapsed = useRef(false);
  // SWR `fallbackData: []` makes the first paint look empty — wait until the
  // first fetch settles before auto-add / auto-select (design never shows a
  // blank right column).
  const [listSettled, setListSettled] = useState(false);
  const [selected, setSelected] = useState<string>('');
  const [adding, setAdding] = useState(false);
  const [inviteAdd, setInviteAdd] = useState(false);
  // Provider connect/continue step inside Add Channel — drives scroll reset.
  const [addStepOpen, setAddStepOpen] = useState(false);
  const [providerCatalog, setProviderCatalog] = useState<any>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  // Phone: list is full-bleed; detail / add opens as an off-canvas drawer.
  // Do not open just because the first channel was auto-selected.
  const [detailOpen, setDetailOpen] = useState(false);
  // Empty-list auto-open vs an explicit Add Channel click. Recovery may close
  // the pane the empty-state race opened; it must not close one the user asked
  // for on a list that already had channels.
  const openedAddForEmpty = useRef(false);
  const addOpenGeneration = useRef(0);
  const consumedFocusKey = useRef('');
  // Boolean was wrong once we also deep-link from notifications: an OAuth
  // `added=` consume on this page load then ignored a later Reconnect click.
  const focusedFromAdded = useRef(false);
  const addedRefreshStarted = useRef(false);
  const [addedRefreshDone, setAddedRefreshDone] = useState(false);
  const [flashId, setFlashId] = useState('');

  // Design `_autoSide`: collapse under 1180 on viewport transitions only.
  // `collapseMenu` must stay out of the deps — otherwise expanding on tablet
  // immediately re-fires this and forces the rail shut again.
  useEffect(() => {
    if (mobile) return;
    if (tablet) {
      autoCollapsed.current = true;
      setCollapseMenu('1', { days: 365 });
      return;
    }
    if (autoCollapsed.current) {
      autoCollapsed.current = false;
      setCollapseMenu('0', { days: 365 });
    }
  }, [mobile, tablet, setCollapseMenu]);

  const toggleCollapse = useCallback(() => {
    autoCollapsed.current = false;
    setCollapseMenu(collapseMenu === '1' ? '0' : '1', { days: 365 });
  }, [collapseMenu, setCollapseMenu]);

  const list = useMemo(() => integrations || [], [integrations]);

  const current = useMemo(() => {
    return list.find((i: any) => i.id === selected) || list[0];
  }, [list, selected]);

  const channelHandle = formatChannelHandle(current?.display);

  // Returns null rather than throwing. `openAdd` runs from an effect when the
  // account has no channels, so an unguarded reject here took the whole
  // Channels page down on mount whenever the backend was unreachable —
  // `customFetch` resolves 4xx/5xx but a dead backend rejects.
  const loadCatalog = useCallback(async () => {
    if (providerCatalog) return providerCatalog;
    try {
      const response = await fetch('/integrations');
      if (!response.ok) {
        return null;
      }
      const data = await response.json();
      if (!Array.isArray(data?.social)) {
        return null;
      }
      setProviderCatalog(data);
      return data;
    } catch (e) {
      return null;
    }
  }, [fetch, providerCatalog]);

  const openAdd = useCallback(
    async (source: 'user' | 'empty' | 'tour' = 'user') => {
      if (source === 'user' || source === 'tour') {
        openedAddForEmpty.current = false;
      } else {
        openedAddForEmpty.current = true;
      }
      const generation = ++addOpenGeneration.current;
      // Without a catalog the add pane renders an empty provider grid, so say
      // why instead of opening it.
      if (!(await loadCatalog())) {
        toast.show(
          t(
            'add_channel_failed',
            'Could not load the channel list, please try again'
          ),
          'warning'
        );
        return;
      }
      if (generation !== addOpenGeneration.current) {
        return;
      }
      // List arrived (or OAuth `added=` focused a channel) while catalog
      // loaded — do not overlay Add Channel on that return.
      if (
        source === 'empty' &&
        (focusedFromAdded.current || !openedAddForEmpty.current)
      ) {
        return;
      }
      setInviteAdd(false);
      setAddStepOpen(false);
      setAdding(true);
      setDetailOpen(true);
    },
    [loadCatalog, toast, t]
  );

  const openAddClicked = useCallback(() => {
    void openAdd('user');
  }, [openAdd]);

  const stripChannelQuery = useCallback((keys: string[]) => {
    const cleaned = new URLSearchParams(searchParams.toString());
    for (const key of keys) {
      cleaned.delete(key);
    }
    const q = cleaned.toString();
    window.history.replaceState(null, '', q ? `/channels?${q}` : '/channels');
  }, [searchParams]);

  const onChannelDeleted = useCallback(
    (id: string) => {
      // Last-channel delete must not keep the post-connect focus lock, or Add
      // Channel never opens and a leftover confirm can sit on the empty rail.
      focusedFromAdded.current = false;
      consumedFocusKey.current =
        [
          searchParams.get('added'),
          searchParams.get('channel'),
          searchParams.get('focus'),
        ]
          .filter(Boolean)
          .join('|') || 'deleted';
      setSelected((currentId) => (currentId === id ? '' : currentId));
      stripChannelQuery(['added', 'msg', 'focus', 'channel']);
    },
    [stripChannelQuery, searchParams]
  );

  const closeAddPane = useCallback(() => {
    openedAddForEmpty.current = false;
    addOpenGeneration.current += 1;
    setInviteAdd(false);
    setAddStepOpen(false);
    setAdding(false);
  }, []);

  const closeDetail = useCallback(() => {
    openedAddForEmpty.current = false;
    addOpenGeneration.current += 1;
    setDetailOpen(false);
    setInviteAdd(false);
    setAddStepOpen(false);
    setAdding(false);
  }, []);

  useEffect(() => {
    if (!isValidating) {
      setListSettled(true);
    }
  }, [isValidating]);

  // Design: zero channels → Add Channel open; otherwise first channel selected.
  // Never leave the right column on bare `bg-pqLine` (hairline gap color).
  //
  // OAuth success lands on `/channels?added=<provider>&msg=…`. That must focus
  // the new row, not auto-open Add Channel — `fallbackData: []` used to settle
  // empty, `openAdd()` loaded the catalog, and recovery only closed adding when
  // the catalog was still missing, so the pane stayed up after the YouTube row
  // appeared.
  useEffect(() => {
    if (!listSettled) return;

    const addedProvider = searchParams.get('added');
    const channelProvider = searchParams.get('channel');
    const focusId = searchParams.get('focus');
    const providerHint = addedProvider || channelProvider;
    const focusKey = [addedProvider, channelProvider, focusId]
      .filter(Boolean)
      .join('|');
    const returningFromConnect =
      !!focusKey && consumedFocusKey.current !== focusKey;

    if (returningFromConnect) {
      const match = selectAddedIntegration(
        list,
        providerHint,
        focusId,
      );
      // SWR keeps the pre-connect list (`revalidateIfStale` / `OnFocus` off).
      // After social-connect 201 the new row is missing until we mutate —
      // without this, a non-empty list shows the toast and never waits.
      // Stale cache after Facebook two-step is often still YouTube: do not
      // consume or fall back to list[0] until the focused row is in the list.
      if (!match?.id) {
        if (!addedRefreshStarted.current) {
          addedRefreshStarted.current = true;
          void mutate().finally(() => setAddedRefreshDone(true));
        }
        return;
      }
      consumedFocusKey.current = focusKey;
      focusedFromAdded.current = true;
      closeAddPane();
      setSelected(match.id);
      setFlashId(match.id);
      setDetailOpen(true);
      requestAnimationFrame(() => {
        document
          .querySelector(`[data-channel="${match.id}"]`)
          ?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      });
      const msg = searchParams.get('msg');
      if (msg) {
        toast.show(msg, 'success');
      }
      stripChannelQuery(['added', 'msg', 'focus', 'channel']);
      return;
    }

    if (!list.length) {
      // Deleting the last channel (including the one we just focused from
      // ?added=) is the empty state. Holding `focusedFromAdded` skipped Add
      // Channel and left the delete confirm over an empty rail.
      focusedFromAdded.current = false;
      void openAdd('empty');
      return;
    }

    if (
      adding &&
      openedAddForEmpty.current &&
      !tourNeedsAdd &&
      searchParams.get('add') !== '1' &&
      !focusedFromAdded.current
    ) {
      closeAddPane();
    }

    if (!selected && list[0]?.id) {
      setSelected(list[0].id);
    }
  }, [
    listSettled,
    list,
    selected,
    adding,
    tourNeedsAdd,
    searchParams,
    openAdd,
    closeAddPane,
    stripChannelQuery,
    toast,
    mutate,
    addedRefreshDone,
  ]);

  useEffect(() => {
    if (!flashId) {
      return;
    }
    const timer = window.setTimeout(() => setFlashId(''), 1600);
    return () => window.clearTimeout(timer);
  }, [flashId]);

  // Tour last step + Finish leave Add Channel open (design chAdd:'connect').
  //
  // `?add=1` is consumed and then dropped, the way `now=` is on the calendar.
  // Left in place it reopened Add Channel on every refresh and every step back
  // through history, and it permanently disabled the recovery above.
  //
  // The tour also has to be able to let go: it opens this pane for its last two
  // steps, and Escape there used to leave somebody on /channels with a pane
  // they never asked for. Zero channels is the exception — there Add Channel is
  // the page's own empty state, not the tour's doing.
  const tourOpenedAdd = useRef(false);
  const addConsumed = useRef(false);
  useEffect(() => {
    // A successful connect (`?added=`) focuses the new channel. Tour last-step
    // `channel-add` and `?add=1` must not reopen Add Channel over that.
    if (focusedFromAdded.current) {
      return;
    }
    if (
      (searchParams.get('added') ||
        searchParams.get('channel') ||
        searchParams.get('focus')) &&
      consumedFocusKey.current !==
        [
          searchParams.get('added'),
          searchParams.get('channel'),
          searchParams.get('focus'),
        ]
          .filter(Boolean)
          .join('|')
    ) {
      return;
    }
    // Once, by ref rather than by the URL: `replaceState` does not tell the
    // router anything, so `searchParams` still reads `add=1` afterwards, and
    // `openAdd`'s identity changes as soon as the catalog resolves — which
    // re-ran this and reopened the pane over whatever the person had chosen.
    const deepLinked = searchParams.get('add') === '1' && !addConsumed.current;
    if (tourNeedsAdd || deepLinked) {
      if (deepLinked) {
        addConsumed.current = true;
        stripChannelQuery(['add']);
      }
      tourOpenedAdd.current = tourNeedsAdd && !deepLinked;
      void openAdd('tour');
      return;
    }
    if (tourOpenedAdd.current) {
      tourOpenedAdd.current = false;
      if (list.length) closeDetail();
    }
  }, [
    tourNeedsAdd,
    searchParams,
    openAdd,
    closeDetail,
    list.length,
    stripChannelQuery,
  ]);

  const afterConnect = useCallback(() => {
    mutate();
    openedAddForEmpty.current = false;
    addOpenGeneration.current += 1;
    setInviteAdd(false);
    setAddStepOpen(false);
    setAdding(false);
    if (mobile) setDetailOpen(false);
  }, [mutate, mobile]);

  // Design Channels pane: reset scroll when chAdd / addStep toggles so
  // "Add a channel" and channel detail share the same top alignment.
  const detailScrollKey = `${adding ? 'add' : 'detail'}-${addStepOpen ? 'step' : 'root'}`;

  const openComposer = useCallback(async () => {
    if (!current || needsAttention(current)) return;
    const slot = await (
      await fetch(`/posts/find-slot/${current.id}`)
    ).json();
    modal.openModal({
      id: 'add-edit-modal',
      closeOnClickOutside: false,
      removeLayout: true,
      closeOnEscape: false,
      withCloseButton: false,
      askClose: true,
      fullScreen: true,
      classNames: {
        modal: 'w-[100%] max-w-[1400px] text-textColor',
      },
      children: (
        <AddEditModal
          allIntegrations={list.map((p: any) => ({ ...p }))}
          mutate={() => mutate()}
          integrations={list}
          selectedChannels={[current.id]}
          date={dayjs.utc(slot.date).local()}
          reopenModal={() => {}}
        />
      ),
      title: ``,
    });
  }, [current, fetch, list, modal, mutate]);

  const openSlots = useCallback(() => {
    if (!current) return;
    // Low-stakes settings: close without confirm; dirty edits discard on unmount.
    modal.openModal({
      withCloseButton: true,
      closeOnEscape: true,
      closeOnClickOutside: true,
      askClose: false,
      title: t('time_table_slots', 'Time Table Slots'),
      children: <TimeTable integration={current} mutate={mutate} />,
    });
  }, [current, modal, mutate, t]);

  const reconnect = useCallback(async () => {
    if (!current) return;
    const params = new URLSearchParams({
      refresh: String(current.internalId),
      redirectUrl: '/channels',
    });
    const { url } = await (
      await fetch(`/integrations/social/${current.identifier}?${params}`, {
        method: 'GET',
      })
    ).json();
    if (!url) {
      toast.show(
        t(
          'could_not_connect_platform',
          'Could not connect to the platform, please try again later'
        ),
        'warning'
      );
      return;
    }
    window.location.href = url;
  }, [current, fetch, t, toast]);

  const openBot = useCallback(() => {
    if (!current) return;
    modal.openModal({
      classNames: {
        modal: 'w-[100%] max-w-[600px] bg-transparent text-textColor',
      },
      size: '100%',
      withCloseButton: false,
      closeOnEscape: true,
      closeOnClickOutside: true,
      children: (
        <BotPicture
          canChangeProfilePicture={!!current.changeProfilePicture}
          canChangeNickName={!!current.changeNickName}
          integration={current}
          mutate={mutate}
        />
      ),
    });
  }, [current, modal, mutate]);

  const addContent = !!adding && !!providerCatalog && (
    <div
      data-channel-add="1"
      data-tour="channels-page"
      className="flex flex-1 flex-col"
    >
      <div
        data-tour="platform-grid"
        className={clsx(
          'mx-auto flex w-full flex-col gap-[18px]',
          CH_CONTENT_MAX
        )}
      >
        {/* Design platform-grid: title + subtitle only — no title chevron.
            Nested All platforms / Back lives inside AddProviderComponent steps. */}
        <div className="flex flex-col gap-[5px]">
          <div className="text-[22px] font-[600] -tracking-[0.015em]">
            {t('add_a_channel', 'Add a channel')}
          </div>
          <div className="text-[13.5px] text-pqMuted">
            {inviteAdd
              ? t(
                  'copy_a_link_that_works_for_one_hour',
                  'Copy a link that works for one hour — the account owner connects it themselves.'
                )
              : t(
                  'pick_a_platform_to_connect',
                  'Pick a platform to connect.'
                )}
          </div>
        </div>
        <AddProviderComponent
          invite={false}
          update={afterConnect}
          onInviteModeChange={setInviteAdd}
          onStepChange={setAddStepOpen}
          {...providerCatalog}
        />
      </div>
    </div>
  );

  const detailLabel = adding
    ? t('add_a_channel', 'Add a channel')
    : current?.name || t('channels', 'Channels');

  const listPane = (
    <div
      data-pq="channels-list"
      data-cr="1"
      className={clsx(
        'trz relative flex shrink-0 flex-col bg-pqInner transition-all',
        mobile
          ? 'w-full max-w-full'
          : channelsCollapsed
          ? 'group sidebar w-[100px] flex-[0_0_100px]'
          : 'w-[260px] flex-[0_0_260px]'
      )}
    >
      <div className="absolute inset-0 flex flex-col">
        <div className="flex shrink-0 items-center gap-[8px] border-b border-pqLine p-[16px_14px_12px]">
          <div
            data-crl="1"
            className="flex min-w-0 flex-1 items-baseline gap-[7px] group-[.sidebar]:hidden"
          >
            <span className="whitespace-nowrap text-[12px] font-[600] uppercase tracking-[0.06em] text-pqMuted">
              {t('channels', 'Channels')}
            </span>
            <span className="text-[11px] font-[600] text-pqSoft opacity-75">
              {list.length}
            </span>
          </div>
          <button
            type="button"
            data-tooltip-id="tooltip"
            data-tooltip-content={
              channelsCollapsed
                ? t('show_channels', 'Show channels')
                : t('hide_channels', 'Hide channels')
            }
            onClick={toggleCollapse}
            aria-label={
              channelsCollapsed
                ? t('show_channels', 'Show channels')
                : t('hide_channels', 'Hide channels')
            }
            className={clsx(
              'grid h-[26px] w-[26px] shrink-0 place-items-center rounded-[7px] text-pqSoft transition-colors hover:bg-pqHover hover:text-pqText group-[.sidebar]:mx-auto group-[.sidebar]:rotate-180',
              mobile && 'hidden'
            )}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none">
              <path
                d="M14 8l-4 4 4 4"
                stroke="currentColor"
                strokeWidth="1.9"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M19 4.5v15"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <div
          className={clsx(
            'flex shrink-0 items-center gap-[7px] p-[12px_12px_10px]',
            channelsCollapsed ? 'flex-col' : 'flex-row'
          )}
        >
          <button
            type="button"
            data-view="add-channel"
            data-pq="add-channel"
            {...(channelsCollapsed && {
              'data-tooltip-id': 'tooltip',
              'data-tooltip-content': t('add_channel', 'Add Channel'),
              'aria-label': t('add_channel', 'Add Channel'),
            })}
            onClick={openAddClicked}
            className={clsx(
              'flex h-[36px] items-center justify-center gap-[7px] rounded-[9px] text-[12.5px] font-[600] transition-colors',
              channelsCollapsed
                ? 'w-[36px] shrink-0'
                : 'min-w-0 flex-1',
              adding || !list.length
                ? 'bg-pqBrand text-pqOnBrand shadow-[0_6px_18px_-8px_rgba(124,58,237,.9)] hover:bg-pqBrandHover'
                : 'bg-pqSettings text-pqText hover:bg-pqBrandSoft'
            )}
          >
            <svg
              viewBox="0 0 24 24"
              width="16"
              height="16"
              fill="none"
              className="shrink-0"
            >
              <path
                d="M12 5.5v13M5.5 12h13"
                stroke="currentColor"
                strokeWidth="2.1"
                strokeLinecap="round"
              />
            </svg>
            <span
              data-crl="1"
              className="whitespace-nowrap group-[.sidebar]:hidden"
            >
              {t('add_channel', 'Add Channel')}
            </span>
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-[2px] overflow-y-auto overflow-x-hidden px-[8px] pb-[12px]">
          {/* `fallbackData: []` means an empty list is also what a load looks
              like, so the empty art waits for the fetch to settle — otherwise
              every cold load flashes "No channels yet" at people who have
              channels. */}
          {!listSettled
            ? Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center gap-[10px] rounded-pqSm py-[7px] pe-[6px] ps-[9px]"
                >
                  <Skeleton className="size-[32px] shrink-0 rounded-full" />
                  <Skeleton
                    className={clsx(
                      'h-[12px] group-[.sidebar]:hidden',
                      i % 3 === 0
                        ? 'w-[68%]'
                        : i % 3 === 1
                        ? 'w-[54%]'
                        : 'w-[61%]'
                    )}
                  />
                </div>
              ))
            : !list.length && <ChannelsListEmpty />}
          {list.map((integration: any) => (
            <div
              key={integration.id}
              data-channel={integration.id}
              title={channelNameWithHandle(integration)}
              role="button"
              tabIndex={0}
              aria-current={
                !adding && current?.id === integration.id ? 'true' : undefined
              }
              onClick={() => {
                setSelected(integration.id);
                setInviteAdd(false);
                setAddStepOpen(false);
                setAdding(false);
                setDetailOpen(true);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setSelected(integration.id);
                  setInviteAdd(false);
                  setAddStepOpen(false);
                  setAdding(false);
                  setDetailOpen(true);
                }
              }}
              className={clsx(
                'relative flex cursor-pointer items-center gap-[10px] rounded-pqSm py-[7px] ps-[9px] pe-[6px] text-start transition-colors group-[.sidebar]:justify-center group-[.sidebar]:px-0',
                !adding && current?.id === integration.id
                  ? 'bg-pqNavActive'
                  : 'hover:bg-pqHover',
                flashId === integration.id && 'pq-channel-flash'
              )}
            >
              <span className="relative h-[32px] w-[32px] shrink-0">
                <ImageWithFallback
                  fallbackSrc={`/icons/platforms/${integration.identifier}.png`}
                  src={integration.picture || '/no-picture.jpg'}
                  alt={integration.identifier}
                  width={32}
                  height={32}
                  className="size-[32px] rounded-full object-cover"
                />
                <img
                  src={`/icons/platforms/${integration.identifier}.png`}
                  alt=""
                  className="absolute -bottom-[2px] -end-[2px] h-[15px] w-[15px] rounded-full border border-pqInner"
                />
                {needsAttention(integration) && (
                  <span className="absolute -start-[2px] -top-[2px] flex h-[15px] w-[15px] items-center justify-center rounded-full bg-pqWarn text-[10px] font-[700] text-pqOnBrand">
                    !
                  </span>
                )}
              </span>
              <span
                data-crl="1"
                className="min-w-0 flex-1 group-[.sidebar]:hidden"
              >
                <span
                  className={clsx(
                    'block truncate text-[14px]',
                    !adding && current?.id === integration.id && 'font-[600]'
                  )}
                >
                  {integration.name}
                </span>
                <span
                  className={clsx(
                    'block truncate text-[12px]',
                    needsAttention(integration) ? 'text-pqWarn' : 'text-pqMuted'
                  )}
                >
                  {channelListSubtitle(
                    integration,
                    needsAttention(integration)
                      ? t('needs_reconnect', 'Needs reconnect')
                      : undefined
                  )}
                </span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  if (!listSettled) {
    return (
      <CalendarWeekProvider integrations={list}>
        <div
          ref={rowRef}
          className="relative flex min-h-0 flex-1 gap-[1px] bg-pqLine"
        >
          {listPane}
          {/* Plugs and Analytics both ghost their detail pane while the rail
              loads; without this Channels was the one channel-column page
              whose right half stayed a blank panel. */}
          {!mobile && (
            <div
              className="flex min-w-0 flex-1 flex-col bg-pqInner"
              role="status"
              aria-busy="true"
              aria-label="Loading"
            >
              <div className="flex shrink-0 items-center gap-[12px] border-b border-pqLine p-[16px_18px]">
                <Skeleton className="size-[38px] shrink-0 rounded-full" />
                <div className="flex min-w-0 flex-col gap-[7px]">
                  <Skeleton className="h-[14px] w-[160px]" />
                  <Skeleton className="h-[11px] w-[104px]" />
                </div>
              </div>
              <div className="flex min-h-0 flex-1 flex-col gap-[12px] p-[18px]">
                <div className="grid grid-cols-2 gap-[12px] tablet:grid-cols-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-[78px] rounded-[12px]" />
                  ))}
                </div>
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-[52px] w-full rounded-[12px]" />
                ))}
              </div>
            </div>
          )}
        </div>
      </CalendarWeekProvider>
    );
  }

  if (!list.length) {
    return (
      <CalendarWeekProvider integrations={list}>
        <div
          ref={rowRef}
          className="relative flex min-h-0 flex-1 gap-[1px] bg-pqLine"
        >
          {listPane}
          <TwoColumnDetailDrawer
            open={detailOpen}
            onClose={closeDetail}
            label={detailLabel}
            anchorRef={rowRef}
            scrollResetKey={detailScrollKey}
            className="bg-pqInner px-[24px] pb-[40px] pt-[20px]"
          >
            {addContent || (
              <ChannelsPageEmpty
                action={
                  <button
                    type="button"
                    data-view="channel-connect"
                    onClick={openAddClicked}
                    className="mt-[6px] rounded-pqSm bg-pqBrand px-[16px] py-[9px] text-[13.5px] font-[600] text-pqOnBrand transition-colors hover:bg-pqBrandHover"
                  >
                    {t('add_channel', 'Add Channel')}
                  </button>
                }
              />
            )}
          </TwoColumnDetailDrawer>
        </div>
      </CalendarWeekProvider>
    );
  }

  return (
    <CalendarWeekProvider integrations={list}>
    <div
      ref={rowRef}
      className="relative flex min-h-0 flex-1 gap-[1px] bg-pqLine"
    >
      {listPane}

      <TwoColumnDetailDrawer
        open={detailOpen}
        onClose={closeDetail}
        label={detailLabel}
        anchorRef={rowRef}
        scrollResetKey={detailScrollKey}
        className="bg-pqInner px-[24px] pb-[40px] pt-[20px]"
      >
      {addContent}

      {(adding && !providerCatalog) || (!adding && !current) ? (
        <div className="min-w-0 flex-1" aria-hidden />
      ) : null}

      {!adding && !!current && (
        <div
          data-channel-detail={current.id}
          data-tour="channels-page"
          className="flex min-w-0 flex-1 flex-col"
        >
          <div
            className={clsx(
              'mx-auto flex w-full flex-col gap-[14px]',
              CH_CONTENT_MAX
            )}
          >
            <div
              className={clsx(
                'flex w-full gap-[13px]',
                mobile ? 'flex-col gap-[12px]' : 'items-center'
              )}
            >
              <div className="flex min-w-0 flex-1 items-center gap-[13px]">
                <span
                  className={clsx(
                    'relative size-[52px] shrink-0',
                    needsAttention(current) && 'opacity-50'
                  )}
                >
                  <ImageWithFallback
                    fallbackSrc={`/icons/platforms/${current.identifier}.png`}
                    src={current.picture || '/no-picture.jpg'}
                    alt={current.identifier}
                    width={52}
                    height={52}
                    className="size-[52px] rounded-full object-cover"
                  />
                  <img
                    src={`/icons/platforms/${current.identifier}.png`}
                    alt=""
                    className="absolute -bottom-[3px] -end-[3px] size-[19px] rounded-full border border-pqInner object-cover"
                  />
                </span>
                <div className="min-w-0 max-w-[420px] flex-1">
                  <div className="truncate text-[19px] font-[600] leading-[1.2] -tracking-[0.01em] text-pqText">
                    {current.name}
                  </div>
                  <div className="mt-[5px] flex min-w-0 flex-wrap items-center gap-x-[8px] gap-y-[6px]">
                    {needsAttention(current) ? (
                      <button
                        type="button"
                        onClick={reconnect}
                        className="truncate text-start text-[13px] text-pqMuted hover:underline"
                      >
                        {t(
                          'channel_disconnected_click_to_reconnect',
                          'Channel disconnected, click to reconnect'
                        )}
                      </button>
                    ) : channelHandle ? (
                      <span className="truncate text-[13px] text-pqMuted">
                        {channelHandle}
                      </span>
                    ) : null}
                    <span
                      className={clsx(
                        'flex h-[20px] items-center gap-[5px] rounded-full pe-[8px] ps-[7px] text-[11px] font-[600]',
                        needsAttention(current)
                          ? 'bg-pqAmberSoft text-pqAmber'
                          : 'bg-pqOkSoft text-pqOk'
                      )}
                    >
                      <span className="size-[5px] rounded-full bg-current" />
                      {needsAttention(current)
                        ? t('needs_reconnect', 'Needs reconnect')
                        : t('channel_connected', 'Connected')}
                    </span>
                  </div>
                </div>
              </div>
              <div
                className={clsx(
                  'flex items-center gap-[7px]',
                  mobile ? 'w-full' : 'ms-auto shrink-0'
                )}
              >
                {needsAttention(current) && (
                  <button
                    type="button"
                    onClick={reconnect}
                    className={clsx(
                      'flex h-[34px] items-center gap-[7px] rounded-pqSm bg-pqAmberSoft pe-[13px] ps-[11px] text-[13px] font-[600] text-pqAmber',
                      mobile && 'shrink-0'
                    )}
                  >
                    <svg viewBox="0 0 24 24" width="15" height="15" fill="none">
                      <path
                        d="M20 11.5A8 8 0 0 0 6.3 6.3L4 8.5M4 4v4.5h4.5M4 12.5a8 8 0 0 0 13.7 5.2L20 15.5M20 20v-4.5h-4.5"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    {t('reconnect', 'Reconnect')}
                  </button>
                )}
                <button
                  type="button"
                  onClick={openComposer}
                  disabled={needsAttention(current)}
                  title={
                    needsAttention(current)
                      ? t(
                          'reconnect_before_new_post',
                          'Reconnect this channel before creating a post'
                        )
                      : undefined
                  }
                  className={clsx(
                    'flex h-[34px] items-center justify-center gap-[7px] rounded-pqSm pe-[13px] ps-[11px] text-[13px] font-[600]',
                    mobile && 'min-w-0 flex-1',
                    needsAttention(current)
                      ? 'cursor-not-allowed bg-pqSettings text-pqSoft'
                      : 'bg-pqBrand text-pqOnBrand'
                  )}
                >
                  <svg viewBox="0 0 24 24" width="15" height="15" fill="none">
                    <path
                      d="M4 20h4L19.5 8.5a2.1 2.1 0 0 0-3-3L5 17v3Z"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  {t('new_post', 'New post')}
                </button>
              </div>
            </div>

            {(!!current.changeProfilePicture ||
              !!current.changeNickName) && (
              <div className="flex flex-wrap gap-[7px]">
                <button
                  type="button"
                  onClick={openBot}
                  className="h-[34px] rounded-pqSm bg-pqBtnSimple px-[13px] text-[13px] font-[500] text-pqText transition-colors hover:bg-pqHover"
                >
                  {t('bot_name_avatar', 'Bot name & avatar')}
                </button>
              </div>
            )}

            {needsAttention(current) && (
              <div className="flex items-center gap-[11px] rounded-pqMd bg-pqAmberSoft px-[14px] py-[12px] shadow-[inset_0_0_0_1px_var(--amberLine)]">
                <svg
                  viewBox="0 0 24 24"
                  width="17"
                  height="17"
                  fill="none"
                  className="shrink-0 text-pqAmber"
                >
                  <path
                    d="M12 9v4M12 16.5h.01M10.3 3.9 2.6 17.2A1.9 1.9 0 0 0 4.3 20h15.4a1.9 1.9 0 0 0 1.7-2.8L13.7 3.9a1.9 1.9 0 0 0-3.4 0Z"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <div className="min-w-0 flex-1 text-[13px] leading-[1.5] text-pqText">
                  {t(
                    'channel_lost_connection_banner',
                    'This channel lost its connection and will not publish until you reconnect it.'
                  )}
                </div>
                <button
                  type="button"
                  onClick={reconnect}
                  className="h-[30px] shrink-0 rounded-pqSm bg-pqInner px-[12px] text-[12.5px] font-[600] text-pqText shadow-[inset_0_0_0_1px_var(--border)] hover:bg-pqHover"
                >
                  {t('reconnect', 'Reconnect')}
                </button>
              </div>
            )}

            <ChannelCounts integrationId={current.id} />

            <ChannelAutomations integration={current} />

            <PublishingOptions integration={current} mutate={mutate} />

            <ChannelSettingsGroups
              integration={current}
              mutate={mutate}
              reconnect={reconnect}
              openSlots={openSlots}
              onDeleted={onChannelDeleted}
            />
          </div>
        </div>
      )}
      </TwoColumnDetailDrawer>
    </div>
    </CalendarWeekProvider>
  );
};
