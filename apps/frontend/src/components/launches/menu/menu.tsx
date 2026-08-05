'use client';

import React, {
  FC,
  MouseEventHandler,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { deleteDialog } from '@gitroom/react/helpers/delete.dialog';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { useModals } from '@gitroom/frontend/components/layout/new-modal';
import { useAnchoredPopover } from '@gitroom/frontend/components/layout/use.anchored.popover';
import { TimeTable } from '@gitroom/frontend/components/launches/time.table';
import {
  Integrations,
  useCalendar,
} from '@gitroom/frontend/components/launches/calendar.context';
import { BotPicture } from '@gitroom/frontend/components/launches/bot.picture';
import { CustomerModal } from '@gitroom/frontend/components/launches/customer.modal';
import { Integration } from '@prisma/client';
import { SettingsModal } from '@gitroom/frontend/components/launches/settings.modal';
import { CustomVariables } from '@gitroom/frontend/components/launches/add.provider.component';
import { useRouter } from 'next/navigation';
import { useVariables } from '@gitroom/react/helpers/variable.context';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { AddEditModal } from '@gitroom/frontend/components/new-launch/add.edit.modal';
import dayjs from 'dayjs';
import { ModalWrapperComponent } from '@gitroom/frontend/components/new-launch/modal.wrapper.component';
import copy from 'copy-to-clipboard';
import clsx from 'clsx';

/** Design MENU_ICONS — stroke paths, viewBox 0 0 24 24. */
const MENU_ICONS = {
  post: 'M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z',
  copy: 'M9 9V5.5A1.5 1.5 0 0 1 10.5 4h8A1.5 1.5 0 0 1 20 5.5v8a1.5 1.5 0 0 1-1.5 1.5H15M5.5 9h8A1.5 1.5 0 0 1 15 10.5v8a1.5 1.5 0 0 1-1.5 1.5h-8A1.5 1.5 0 0 1 4 18.5v-8A1.5 1.5 0 0 1 5.5 9Z',
  refresh: 'M20.5 12a8.5 8.5 0 1 1-2.6-6.1M20.5 4v4.5H16',
  key: 'm21 2-2 2m-7.6 7.6a5.5 5.5 0 1 1-7.8 7.8 5.5 5.5 0 0 1 7.8-7.8Zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3',
  gear: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z',
  image:
    'M5 4h14a1.5 1.5 0 0 1 1.5 1.5v13A1.5 1.5 0 0 1 19 20H5a1.5 1.5 0 0 1-1.5-1.5v-13A1.5 1.5 0 0 1 5 4ZM3.5 17l4.5-4.5 3 2.7 3.5-3.7 6 6M9.4 9.6a1.3 1.3 0 1 1-2.6 0 1.3 1.3 0 0 1 2.6 0Z',
  group: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM19 8v6M22 11h-6',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 7.5V12l3 2',
  disable: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM5.6 5.6l12.8 12.8',
  trash:
    'M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l.9 12.1A1.5 1.5 0 0 0 8.4 20.5h7.2a1.5 1.5 0 0 0 1.5-1.4L18 7M10 11v6M14 11v6',
  enable:
    'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM8.5 12.5l2.5 2.5 5-5',
} as const;

const MenuIcon: FC<{
  d: string;
  className?: string;
}> = ({ d, className }) => (
  <svg
    viewBox="0 0 24 24"
    width="15"
    height="15"
    fill="none"
    className={clsx('shrink-0', className)}
  >
    <path
      d={d}
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const Menu: FC<{
  canEnable: boolean;
  canDisable: boolean;
  canChangeProfilePicture: boolean;
  canChangeNickName: boolean;
  refreshChannel: (
    integration: Integration & {
      identifier: string;
    }
  ) => () => void;
  id: string;
  mutate: () => void;
  onChange: (shouldReload: boolean) => void;
  // Optional overrides so surfaces outside CalendarWeekProvider (agent channel
  // column) can reuse this menu without mounting the calendar data weld.
  integrations?: Integrations[];
  reloadCalendarView?: () => void;
}> = (props) => {
  const {
    canEnable,
    canDisable,
    id,
    onChange,
    mutate,
    canChangeProfilePicture,
    canChangeNickName,
    refreshChannel,
  } = props;
  const t = useT();

  const fetch = useFetch();
  const router = useRouter();
  const { extensionId } = useVariables();
  const calendar = useCalendar();
  const integrations = props.integrations ?? calendar.integrations;
  const reloadCalendarView =
    props.reloadCalendarView ?? calendar.reloadCalendarView;
  const toast = useToaster();
  const modal = useModals();
  const [show, setShow] = useState(false);
  // Floating UI anchors beside the ⋮ (flip/shift). Portal to body so list
  // overflow / transform parents cannot clip or skew fixed coords.
  // `end` aligns panel end to trigger end; +8px crossAxis nudges it further
  // right (LTR) so it doesn't sit flush under the ⋮. flip/shift still apply.
  const { referenceRef, floatingRef } = useAnchoredPopover<
    HTMLButtonElement,
    HTMLDivElement
  >(show, 'end', { crossAxisPx: 8 });

  useEffect(() => {
    if (!show) return;
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (referenceRef.current?.contains(target)) return;
      if (floatingRef.current?.contains(target)) return;
      setShow(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShow(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [show, referenceRef, floatingRef]);

  const findIntegration: any = useMemo(() => {
    return integrations.find((integration) => integration.id === id);
  }, [integrations, id]);
  const changeShow: MouseEventHandler<HTMLButtonElement> = useCallback(
    (e) => {
      e.stopPropagation();
      setShow((open) => !open);
    },
    []
  );
  const disableChannel = useCallback(async () => {
    if (
      !(await deleteDialog(
        t('are_you_sure_disable_channel', 'Are you sure you want to disable this channel?'),
        t('disable_channel_title', 'Disable Channel')
      ))
    ) {
      return;
    }
    await fetch('/integrations/disable', {
      method: 'POST',
      body: JSON.stringify({
        id,
      }),
    });
    toast.show(t('channel_disabled', 'Channel Disabled'), 'success');
    setShow(false);
    onChange(false);
  }, [t]);
  const deleteChannel = useCallback(async () => {
    if (
      !(await deleteDialog(
        t('are_you_sure_delete_channel', 'Are you sure you want to delete this channel?'),
        t('delete_channel_title', 'Delete Channel')
      ))
    ) {
      return;
    }
    const deleteIntegration = await fetch('/integrations', {
      method: 'DELETE',
      body: JSON.stringify({
        id,
      }),
    });
    if (deleteIntegration.status === 406) {
      toast.show(
        t('delete_posts_before_channel', 'You have to delete all the posts associated with this channel before deleting it'),
        'warning'
      );
      return;
    }
    // Clean up extension refresh token if applicable
    if (
      extensionId &&
      typeof chrome !== 'undefined' &&
      chrome?.runtime?.sendMessage
    ) {
      try {
        chrome.runtime.sendMessage(
          extensionId,
          { type: 'REMOVE_REFRESH_TOKEN', integrationId: id },
          () => {}
        );
      } catch {
        // Silently ignore
      }
    }
    toast.show(t('channel_deleted', 'Channel Deleted'), 'success');
    setShow(false);
    onChange(true);
  }, [t, extensionId, id]);

  const enableChannel = useCallback(async () => {
    await fetch('/integrations/enable', {
      method: 'POST',
      body: JSON.stringify({
        id,
      }),
    });
    toast.show(t('channel_enabled', 'Channel Enabled'), 'success');
    setShow(false);
    onChange(false);
  }, [t]);

  const editTimeTable = useCallback(() => {
    const findIntegration = integrations.find(
      (integration) => integration.id === id
    );
    modal.openModal({
      withCloseButton: true,
      closeOnEscape: true,
      closeOnClickOutside: true,
      askClose: false,
      title: t('time_table_slots', 'Time Table Slots'),
      children: <TimeTable integration={findIntegration!} mutate={mutate} />,
    });
    setShow(false);
  }, [integrations, t]);

  const copyChannelId = useCallback(
    (integration: Integrations) => async () => {
      setShow(false);
      const channelId = integration.id;
      copy(channelId);
      toast.show(t('channel_id_copied', 'Channel ID copied to clipboard'), 'success');
    },
    [t]
  );

  const createPost = useCallback(
    (integration: Integrations) => async () => {
      setShow(false);

      const { date } = await (
        await fetch(`/posts/find-slot/${integration.id}`)
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
            allIntegrations={integrations.map((p) => ({
              ...p,
            }))}
            reopenModal={createPost(integration)}
            mutate={reloadCalendarView}
            integrations={integrations}
            selectedChannels={[integration.id]}
            // focusedChannel={integration.id}
            date={dayjs.utc(date).local()}
          />
        ),
        size: '80%',
        title: ``,
      });
    },
    [integrations]
  );

  const changeBotPicture = useCallback(() => {
    const findIntegration = integrations.find(
      (integration) => integration.id === id
    );
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
          canChangeProfilePicture={canChangeProfilePicture}
          canChangeNickName={canChangeNickName}
          integration={findIntegration!}
          mutate={mutate}
        />
      ),
    });
    setShow(false);
  }, [integrations]);
  const additionalSettings = useCallback(() => {
    const findIntegration = integrations.find(
      (integration) => integration.id === id
    );
    modal.openModal({
      title: t('additional_settings', 'Additional Settings'),
      children: (
        <SettingsModal
          // @ts-ignore
          integration={findIntegration}
          onClose={() => {
            mutate();
            toast.show(t('settings_updated', 'Settings Updated'), 'success');
          }}
        />
      ),
    });
    setShow(false);
  }, [integrations, t]);
  const addToCustomer = useCallback(() => {
    const findIntegration = integrations.find(
      (integration) => integration.id === id
    );
    modal.openModal({
      classNames: {
        modal: 'md',
      },
      title: t('move_add_to_group', 'Move / Add to group'),
      withCloseButton: false,
      closeOnEscape: true,
      closeOnClickOutside: true,
      children: (
        <CustomerModal
          // @ts-ignore
          integration={findIntegration}
          onClose={() => {
            mutate();
            toast.show(t('customer_updated', 'Customer Updated'), 'success');
          }}
        />
      ),
    });
    setShow(false);
  }, [integrations, t]);
  const updateCredentials = useCallback(() => {
    modal.openModal({
      title: t('custom_url', 'Custom URL'),
      withCloseButton: false,
      classNames: {
        modal: 'md',
      },
      children: (
        <CustomVariables
          identifier={findIntegration.identifier}
          gotoUrl={(url: string) => router.push(url)}
          variables={findIntegration.customFields}
        />
      ),
    });
  }, [t]);

  const rowClass =
    'flex w-full items-center gap-[9px] rounded-pqSm px-[9px] py-[7px] text-start text-[13px] text-pqText hover:bg-pqHover';

  return (
    <div className="relative flex select-none">
      <button
        type="button"
        ref={referenceRef}
        onClick={changeShow}
        aria-label={t('channel_menu', 'Channel menu')}
        aria-expanded={show}
        className="flex size-[30px] items-center justify-center rounded-pqSm text-pqMuted hover:bg-pqHover hover:text-pqText"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
        >
          <path
            d="M12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2ZM12 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2ZM12 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
            fill="currentColor"
          />
        </svg>
      </button>
      {show &&
        createPortal(
          <div
            ref={floatingRef}
            onClick={(e) => e.stopPropagation()}
            className="z-[121] flex w-[252px] flex-col gap-[1px] rounded-pqMd border border-pqBorder bg-pqInner p-[6px] shadow-menu"
          >
            {canDisable && !findIntegration?.refreshNeeded && (
              <button
                type="button"
                className={rowClass}
                onClick={createPost(findIntegration!)}
              >
                <MenuIcon d={MENU_ICONS.post} />
                {t('create_new_post', 'Create a new post')}
              </button>
            )}
            <button
              type="button"
              className={rowClass}
              onClick={copyChannelId(findIntegration)}
            >
              <MenuIcon d={MENU_ICONS.copy} />
              {t('copy_id', 'Copy Channel ID')}
            </button>

            {canDisable &&
              findIntegration?.refreshNeeded &&
              !findIntegration.customFields && (
                <button
                  type="button"
                  className={clsx(rowClass, 'text-pqAmber')}
                  onClick={refreshChannel(findIntegration!)}
                >
                  <MenuIcon d={MENU_ICONS.refresh} />
                  {t('reconnect_channel', 'Reconnect channel')}
                </button>
              )}
            {!!findIntegration?.isCustomFields && (
              <button
                type="button"
                className={rowClass}
                onClick={updateCredentials}
              >
                <MenuIcon d={MENU_ICONS.key} />
                {t('update_credentials', 'Update Credentials')}
              </button>
            )}
            {findIntegration?.additionalSettings !== '[]' && (
              <button
                type="button"
                className={rowClass}
                onClick={additionalSettings}
              >
                <MenuIcon d={MENU_ICONS.gear} />
                {t('additional_settings', 'Additional Settings')}
              </button>
            )}
            {(canChangeProfilePicture || canChangeNickName) && (
              <button
                type="button"
                className={rowClass}
                onClick={changeBotPicture}
              >
                <MenuIcon d={MENU_ICONS.image} />
                {t('change_bot', 'Change Bot')}{' '}
                {[
                  canChangeProfilePicture && t('picture', 'Picture'),
                  canChangeNickName && t('label_nickname', 'Nickname'),
                ]
                  .filter((f) => f)
                  .join(' / ')}
              </button>
            )}
            <button type="button" className={rowClass} onClick={addToCustomer}>
              <MenuIcon d={MENU_ICONS.group} />
              {t('move_add_to_group', 'Move / add to group')}
            </button>
            <button type="button" className={rowClass} onClick={editTimeTable}>
              <MenuIcon d={MENU_ICONS.clock} />
              {t('edit_time_slots', 'Edit Time Slots')}
            </button>
            {canEnable && (
              <button type="button" className={rowClass} onClick={enableChannel}>
                <MenuIcon d={MENU_ICONS.enable} />
                {t('enable_channel', 'Enable Channel')}
              </button>
            )}
            {canDisable && (
              <button type="button" className={rowClass} onClick={disableChannel}>
                <MenuIcon d={MENU_ICONS.disable} />
                {t('disable_channel', 'Disable Channel')}
              </button>
            )}
            <button
              type="button"
              className={clsx(rowClass, 'text-pqWarn')}
              onClick={deleteChannel}
            >
              <MenuIcon d={MENU_ICONS.trash} />
              {t('delete', 'Delete')}
            </button>
          </div>,
          document.body
        )}
    </div>
  );
};
