import React, { useCallback, useState } from 'react';
import { useModals } from '@gitroom/frontend/components/layout/new-modal';
import dayjs from 'dayjs';
import {
  CalendarWeekProvider,
  useCalendar,
} from '@gitroom/frontend/components/launches/calendar.context';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { SetSelectionModal } from '@gitroom/frontend/components/launches/calendar';
import { AddEditModal } from '@gitroom/frontend/components/new-launch/add.edit.modal';
import { useClickOutside } from '@mantine/hooks';
import { useUser } from '@gitroom/frontend/components/layout/user.context';
import { useRouter } from 'next/navigation';
import { deleteDialog } from '@gitroom/react/helpers/delete.dialog';
import { useVariables } from '@gitroom/react/helpers/variable.context';
import { GeneratorPopup } from '@gitroom/frontend/components/launches/generator/generator';
import clsx from 'clsx';
import { useAnchoredPopover } from '@gitroom/frontend/components/layout/use.anchored.popover';

/**
 * Create Post split control (Blank / AI). Portalled into the header via
 * `HeaderAction` from `launches.component.tsx` (owner: header placement).
 * Primary opens a blank compose; the chevron opens Blank / AI post (AI gated
 * the same way as Generator).
 */
export const NewPost = () => {
  const fetch = useFetch();
  const modal = useModals();
  const { integrations, reloadCalendarView, sets } = useCalendar();
  const t = useT();
  const user = useUser();
  const router = useRouter();
  const { billingEnabled } = useVariables();
  const all = useCalendar();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useClickOutside(() => setMenuOpen(false));
  const { referenceRef, floatingRef } = useAnchoredPopover<
    HTMLDivElement,
    HTMLDivElement
  >(menuOpen, 'end');

  const createAPost = useCallback(async () => {
    setMenuOpen(false);
    const date = (await (await fetch('/posts/find-slot')).json()).date;

    const set: any = !sets.length
      ? undefined
      : await new Promise((resolve) => {
          modal.openModal({
            title: t('select_set', 'Select a Set'),
            closeOnClickOutside: true,
            closeOnEscape: true,
            withCloseButton: false,
            onClose: () => resolve('exit'),
            classNames: {
              modal: 'text-textColor',
            },
            children: (
              <SetSelectionModal
                sets={sets}
                onSelect={(selectedSet) => {
                  resolve(selectedSet);
                  modal.closeAll();
                }}
                onContinueWithoutSet={() => {
                  resolve(undefined);
                  modal.closeAll();
                }}
              />
            ),
          });
        });

    if (set === 'exit') return;

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
          {...(set?.content ? { set: JSON.parse(set.content) } : {})}
          reopenModal={createAPost}
          mutate={reloadCalendarView}
          integrations={integrations}
          date={dayjs.utc(date).local()}
        />
      ),
      size: '80%',
      title: ``,
    });
  }, [fetch, integrations, modal, reloadCalendarView, sets, t]);

  const createAiPost = useCallback(async () => {
    setMenuOpen(false);
    if (!billingEnabled || !user?.tier?.ai) {
      if (
        await deleteDialog(
          t('upgrade_required', 'You need to upgrade to use this feature'),
          t('move_to_billing', 'Move to billing'),
          t('payment_required', 'Payment Required')
        )
      ) {
        router.push('/billing');
      }
      return;
    }
    modal.openModal({
      title: t('generate_posts', 'Generate Posts'),
      withCloseButton: true,
      // Opaque --inner card (modal shell). Never bg-transparent — that let the
      // calendar list bleed through. Width matches prototype generator card.
      classNames: {
        modal: 'text-pqText',
      },
      size: 640,
      children: (
        <CalendarWeekProvider {...all}>
          <GeneratorPopup />
        </CalendarWeekProvider>
      ),
    });
  }, [all, billingEnabled, modal, router, t, user?.tier?.ai]);

  const aiLocked = billingEnabled && !user?.tier?.ai;

  return (
    <div className="relative shrink-0" ref={menuRef}>
      <div
        ref={referenceRef}
        className="flex h-[36px] overflow-hidden rounded-[10px] bg-pqBrand text-[14px] font-[500] text-pqOnBrand"
      >
        <button
          type="button"
          data-pq="create-post"
          onClick={createAPost}
          className="flex h-full items-center gap-[6px] ps-[14px] pe-[10px] outline-none transition-colors hover:bg-black/10"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 21 20"
            fill="none"
            aria-hidden="true"
            className="shrink-0"
          >
            <path
              d="M10.5001 4.16699V15.8337M4.66675 10.0003H16.3334"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          {t('create_new_post', 'Create Post')}
        </button>
        <button
          type="button"
          data-pq="create-post-menu"
          aria-expanded={menuOpen}
          aria-label={t('create_post_options', 'Create post options')}
          onClick={() => setMenuOpen((open) => !open)}
          className={clsx(
            'flex h-full w-[32px] items-center justify-center outline-none transition-colors hover:bg-black/10',
            menuOpen && 'bg-black/10'
          )}
        >
          <svg
            viewBox="0 0 12 12"
            width="12"
            height="12"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M3 4.5L6 7.5L9 4.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
      {menuOpen && (
        <div
          ref={floatingRef}
          data-pq="create-post-dropdown"
          className="z-[80] min-w-[188px] overflow-hidden rounded-pqMd border border-pqBorder bg-pqPop py-[4px] shadow-menu"
        >
          <button
            type="button"
            onClick={createAPost}
            className="flex w-full items-center gap-[10px] px-[12px] py-[9px] text-start text-[13.5px] font-[500] text-pqText transition-colors hover:bg-pqHover"
          >
            <svg viewBox="0 0 20 20" width="16" height="16" fill="none">
              <path
                d="M10 4v12M4 10h12"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
            {t('blank_post', 'Blank post')}
          </button>
          <button
            type="button"
            onClick={createAiPost}
            style={{ opacity: aiLocked ? 0.45 : 1 }}
            className="flex w-full items-center gap-[10px] px-[12px] py-[9px] text-start text-[13.5px] font-[500] text-pqText transition-colors hover:bg-pqHover"
          >
            <svg viewBox="0 0 20 20" width="16" height="16" fill="none">
              <path
                d="M10 2.5l1.2 3.1c.2.6.4.9.7 1.1.3.2.6.4 1.2.6L16.2 8.5l-3.1 1.2c-.6.2-.9.4-1.1.7-.2.3-.4.6-.6 1.2L10 14.7l-1.2-3.1c-.2-.6-.4-.9-.7-1.1-.3-.2-.6-.4-1.2-.6L3.8 8.5l3.1-1.2c.6-.2.9-.4 1.1-.7.2-.3.4-.6.6-1.2L10 2.5z"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinejoin="round"
              />
            </svg>
            <span className="flex-1">{t('ai_post', 'AI post')}</span>
            {aiLocked && (
              <svg viewBox="0 0 16 16" width="14" height="14" fill="none">
                <rect
                  x="3"
                  y="7"
                  width="10"
                  height="7"
                  rx="1.5"
                  stroke="currentColor"
                  strokeWidth="1.3"
                />
                <path
                  d="M5.5 7V5.2a2.5 2.5 0 015 0V7"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                />
              </svg>
            )}
          </button>
        </div>
      )}
    </div>
  );
};
