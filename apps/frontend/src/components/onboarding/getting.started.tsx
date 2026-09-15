'use client';

import { FC, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useAnchoredPopover } from '@gitroom/frontend/components/layout/use.anchored.popover';
import { useViewport } from '@gitroom/frontend/components/layout/use.viewport';
import { MobileSheet } from '@gitroom/frontend/components/layout/mobile-sheet';
import { useTour } from '@gitroom/frontend/components/onboarding/tour';
import { GETTING_STARTED_CONNECT_ICONS } from '@gitroom/frontend/components/onboarding/getting-started';
import { useGettingStarted } from '@gitroom/frontend/components/onboarding/use.getting.started';

const RING = 2 * Math.PI * 7;

const ProgressRing: FC<{ done: number; total: number; complete: boolean }> = ({
  done,
  total,
  complete,
}) => {
  const p = total ? Math.min(1, done / total) : 0;
  return (
    <svg
      viewBox="0 0 18 18"
      width="18"
      height="18"
      className="shrink-0 text-pqBrand"
      aria-hidden="true"
    >
      <circle
        cx="9"
        cy="9"
        r="7"
        fill="none"
        className="text-pqLine"
        stroke="currentColor"
        strokeWidth="2"
      />
      <circle
        cx="9"
        cy="9"
        r="7"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray={`${RING * p} ${RING}`}
        transform="rotate(-90 9 9)"
      />
      {complete && (
        <path
          d="M6 9.2l2 2 4-4.2"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
};

const StepMark: FC<{ done: boolean }> = ({ done }) =>
  done ? (
    <span className="grid size-[22px] shrink-0 place-items-center rounded-full bg-pqBrand text-pqOnBrand">
      <svg viewBox="0 0 24 24" width="12" height="12" fill="none" aria-hidden="true">
        <path
          d="M5 12.5l4.5 4.5L19 7.5"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  ) : (
    <span className="grid size-[22px] shrink-0 place-items-center rounded-full border border-pqBorder text-pqSoft">
      <span className="size-[6px] rounded-full bg-pqLine" />
    </span>
  );

const ConnectChannelStrip: FC<{
  onNavigate: () => void;
  label?: string;
  rail?: boolean;
}> = ({ onNavigate, label, rail }) => {
  const t = useT();
  const { touch } = useViewport();
  const icon = touch ? 'size-[36px]' : 'size-[32px]';
  const text = label || t('getting_started_channel', 'Connect your channel');
  return (
    <Link
      href="/channels"
      prefetch={true}
      data-pq="getting-started-channels"
      {...(rail ? { 'data-sbh': '1' } : {})}
      onClick={onNavigate}
      aria-label={text}
      className={clsx(
        'flex cursor-pointer flex-col gap-[8px]',
        rail
          ? 'mt-[4px] w-full rounded-pqSm px-[8px] py-[8px] hover:bg-pqHover hover:text-pqText'
          : 'mt-[8px]'
      )}
    >
      {label && (
        <span className="text-[12px] font-[500] text-pqSoft">{label}</span>
      )}
      <span className="flex flex-wrap items-center gap-[6px]">
        {GETTING_STARTED_CONNECT_ICONS.map((id) => (
          <img
            key={id}
            src={`/icons/platforms/${id}.png`}
            alt=""
            width={36}
            height={36}
            className={clsx(icon, 'shrink-0 rounded-[8px] object-cover')}
          />
        ))}
        <span
          data-pq="getting-started-add-channel"
          aria-hidden="true"
          className={clsx(
            icon,
            'grid shrink-0 place-items-center rounded-[8px] border border-pqBorder text-pqMuted'
          )}
        >
          <svg viewBox="0 0 16 16" width="14" height="14" fill="none">
            <path
              d="M8 3.25v9.5M3.25 8h9.5"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
            />
          </svg>
        </span>
      </span>
    </Link>
  );
};

export const GettingStarted: FC<{ collapsed: boolean }> = ({ collapsed }) => {
  const t = useT();
  const router = useRouter();
  const { touch } = useViewport();
  const { start: startTour } = useTour();
  const gs = useGettingStarted();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { referenceRef, floatingRef } = useAnchoredPopover<
    HTMLButtonElement,
    HTMLDivElement
  >(open && !touch, 'end', { placement: 'right-end', offsetPx: 10 });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open || touch) return;
    const onDown = (e: MouseEvent) => {
      const node = e.target as Node;
      if (
        referenceRef.current?.contains(node) ||
        floatingRef.current?.contains(node)
      ) {
        return;
      }
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, touch, referenceRef, floatingRef]);

  const close = () => setOpen(false);

  const openChannels = () => {
    close();
  };

  const createPost = () => {
    close();
    const button = document.querySelector<HTMLButtonElement>(
      '[data-pq="create-post"]'
    );
    if (button) {
      button.click();
      return;
    }
    router.push('/launches');
  };

  const takeTour = () => {
    close();
    startTour();
  };

  if (!gs.show) {
    return null;
  }

  const title = gs.complete
    ? t('youre_all_set', "You're all set")
    : t('getting_started', 'Getting started');
  const connectLabel = t('getting_started_channel', 'Connect your channel');
  const progressLabel = `${gs.done}/${gs.total}`;

  const next =
    !gs.channel ? 'channel' : !gs.scheduled ? 'schedule' : !gs.published ? 'publish' : null;

  const step = (
    key: string,
    done: boolean,
    heading: string,
    hint: string,
    action?: { primary: boolean; label: string; onClick: () => void }
  ) => {
    const inner = (
      <>
        <StepMark done={done} />
        <div className="min-w-0 flex-1 text-start">
          <div
            className={clsx(
              'text-[13.5px] font-[600]',
              done ? 'text-pqMuted line-through decoration-pqLine' : 'text-pqText'
            )}
          >
            {heading}
          </div>
          {!done && (
            <div className="mt-[2px] text-[12px] leading-[1.35] text-pqSoft">
              {hint}
            </div>
          )}
        </div>
        {!done && action && (
          <span
            className={clsx(
              'grid shrink-0 place-items-center rounded-[8px] px-[10px] text-[12px] font-[600]',
              touch ? 'h-[44px] min-h-[44px]' : 'h-[32px]',
              action.primary
                ? 'bg-pqBrand text-pqOnBrand'
                : 'bg-pqHover text-pqText'
            )}
          >
            {action.label}
          </span>
        )}
      </>
    );
    const rowClass = clsx(
      'flex w-full items-start gap-[10px] rounded-pqSm px-[8px] py-[8px]',
      touch && 'min-h-[44px]',
      !done && action?.primary && 'bg-pqNavActive'
    );
    if (!done && action) {
      return (
        <button
          key={key}
          type="button"
          onClick={action.onClick}
          className={clsx(
            rowClass,
            action.primary ? 'hover:bg-pqBoxFocused' : 'hover:bg-pqHover'
          )}
        >
          {inner}
        </button>
      );
    }
    return (
      <div key={key} className={rowClass}>
        {inner}
      </div>
    );
  };

  const body = gs.complete ? (
    <div className="flex flex-col gap-[12px] px-[4px] py-[4px]">
      <p className="text-[13.5px] leading-[1.45] text-pqMuted">
        {t(
          'getting_started_done',
          'Post from the calendar, Connect, or your own tools.'
        )}
      </p>
      <button
        type="button"
        onClick={() => {
          gs.dismiss();
          close();
        }}
        className={clsx(
          'w-full rounded-[10px] bg-pqBrand text-[13.5px] font-[600] text-pqOnBrand hover:bg-pqBrandHover',
          touch ? 'h-[44px] min-h-[44px]' : 'h-[36px]'
        )}
      >
        {t('got_it', 'Got it')}
      </button>
    </div>
  ) : (
    <div className="flex flex-col gap-[2px]">
      <div
        className={clsx(
          'flex w-full items-start gap-[10px] rounded-pqSm px-[8px] py-[8px]',
          touch && 'min-h-[44px]',
          !gs.channel && next === 'channel' && 'bg-pqNavActive'
        )}
      >
        <StepMark done={gs.channel} />
        <div className="min-w-0 flex-1 text-start">
          <div
            className={clsx(
              'text-[13.5px] font-[600]',
              gs.channel
                ? 'text-pqMuted line-through decoration-pqLine'
                : 'text-pqText'
            )}
          >
            {connectLabel}
          </div>
          {!gs.channel && (
            <>
              <ConnectChannelStrip onNavigate={openChannels} />
              <div className="mt-[2px] text-[12px] leading-[1.35] text-pqSoft">
                {t(
                  'getting_started_channel_hint',
                  'X, LinkedIn, Instagram, YouTube, or any other network'
                )}
              </div>
            </>
          )}
        </div>
      </div>
      {step(
        'schedule',
        gs.scheduled,
        t('getting_started_schedule', 'Create a post'),
        t(
          'getting_started_schedule_hint',
          'Schedule it or publish it now. Either counts.'
        ),
        {
          primary: next === 'schedule',
          label: t('create_new_post', 'Create Post'),
          onClick: createPost,
        }
      )}
      {step(
        'publish',
        gs.published,
        t('getting_started_publish', 'Publish a post'),
        t(
          'getting_started_publish_hint',
          'From the calendar, Connect, n8n, or MCP. Instant publish counts.'
        ),
        {
          primary: next === 'publish',
          label: t('create_new_post', 'Create Post'),
          onClick: createPost,
        }
      )}
      <button
        type="button"
        onClick={takeTour}
        className={clsx(
          'mt-[6px] flex w-full items-center justify-center rounded-[8px] text-[13px] font-[500] text-pqMuted hover:bg-pqHover hover:text-pqText',
          touch ? 'h-[44px] min-h-[44px]' : 'h-[32px]'
        )}
      >
        {t('take_a_tour', 'Take a tour')}
      </button>
    </div>
  );

  return (
    <div data-pq="getting-started" className="relative">
      <button
        type="button"
        ref={referenceRef}
        onClick={() => {
          setOpen((was) => {
            if (!was) gs.refresh();
            return !was;
          });
        }}
        aria-haspopup={touch ? 'dialog' : 'menu'}
        aria-expanded={open}
        aria-label={`${title} ${progressLabel}`}
        className={clsx(
          'relative flex w-full items-center gap-[11px] rounded-pqSm px-[8px] text-start transition-colors hover:bg-pqHover',
          collapsed ? 'justify-center' : 'justify-start',
          touch ? 'h-[44px] min-h-[44px]' : 'h-[34px]',
          open && 'bg-pqHover'
        )}
      >
        <span className="relative shrink-0">
          <ProgressRing
            done={gs.done}
            total={gs.total}
            complete={gs.complete}
          />
          {!gs.channel && (
            <span className="absolute -end-[1px] -top-[1px] size-[6px] rounded-full bg-pqBrand" />
          )}
        </span>
        <span
          data-sbl="1"
          className="min-w-0 flex-1 truncate text-[13px] font-[500] text-pqMuted"
        >
          {title}
        </span>
        <span
          data-sbl="1"
          className="shrink-0 text-[11px] font-[600] tabular-nums text-pqSoft"
        >
          {progressLabel}
        </span>
      </button>

      {!gs.channel && (
        <ConnectChannelStrip
          rail
          onNavigate={openChannels}
          label={connectLabel}
        />
      )}

      {touch ? (
        <MobileSheet open={open} onClose={close} title={title}>
          {body}
        </MobileSheet>
      ) : (
        mounted &&
        open &&
        createPortal(
          <div
            ref={floatingRef}
            role="dialog"
            aria-label={title}
            className="z-[80] w-[min(320px,calc(100vw-16px))] animate-pqPop rounded-pqMd border border-pqBorder bg-pqPop p-[8px] shadow-pq"
          >
            <div className="flex items-center justify-between gap-[8px] px-[8px] pb-[8px] pt-[4px]">
              <div className="text-[12px] font-[600] uppercase tracking-[0.06em] text-pqSoft">
                {title}
              </div>
              <div className="text-[12px] font-[600] tabular-nums text-pqMuted">
                {progressLabel}
              </div>
            </div>
            {body}
          </div>,
          document.body
        )
      )}
    </div>
  );
};
