'use client';

import { FC, ReactNode, useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { useVariables } from '@gitroom/react/helpers/variable.context';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useSentryFeedback } from '@gitroom/frontend/components/new-layout/sentry.feedback.component';
import { useTour } from '@gitroom/frontend/components/onboarding/tour';
import { useAnchoredPopover } from '@gitroom/frontend/components/layout/use.anchored.popover';

const HelpIcon: FC<{ d: string }> = ({ d }) => (
  <svg
    viewBox="0 0 24 24"
    width="16"
    height="16"
    fill="none"
    aria-hidden="true"
    className="shrink-0"
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

const ROW =
  'flex w-full items-center gap-[10px] rounded-pqSm px-[10px] py-[8px] text-start text-[13.5px] transition-colors';

/**
 * The header's Help menu.
 *
 * App chrome: Setup tour · Documentation · Keyboard shortcuts · Contact
 * support · Report a bug · (Browser extension when listed).
 *
 * Checkout (`surface="checkout"`): no Setup tour (nothing to tour) and no
 * locked Keyboard shortcuts — Documentation · Contact · Report a bug only.
 * Same Sentry / Chatbase WORK as the app menu.
 *
 * Keyboard shortcuts stay locked in the app menu until a real handler exists.
 */
export const HelpMenu: FC<{ surface?: 'app' | 'checkout' }> = ({
  surface = 'app',
}) => {
  const t = useT();
  const { isChatBase, extensionStoreUrl, billingEnabled } = useVariables();
  const sentry = useSentryFeedback();
  const { start: startTour } = useTour();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { referenceRef, floatingRef } = useAnchoredPopover<
    HTMLButtonElement,
    HTMLDivElement
  >(open, 'end');
  const isCheckout = surface === 'checkout';

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
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
  }, [open]);

  // Same condition the standalone icon carried: no listing configured means
  // this deployment has not published an extension. Checkout header has no
  // place for the extension row — keep it on the app chrome only.
  const showExtension = !isCheckout && billingEnabled && !!extensionStoreUrl;

  const live = (
    onClick: () => void,
    icon: string,
    label: string,
    key: string
  ): ReactNode => (
    <button
      key={key}
      type="button"
      role="menuitem"
      onClick={() => {
        setOpen(false);
        onClick();
      }}
      className={clsx(ROW, 'text-pqMuted hover:bg-pqHover hover:text-pqText')}
    >
      <HelpIcon d={icon} />
      {label}
    </button>
  );

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        ref={referenceRef}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        data-tooltip-id="tooltip"
        data-tooltip-content={t('help_and_resources', 'Help & resources')}
        className={clsx(
          'flex h-[30px] items-center gap-[6px] rounded-[8px] px-[9px] text-[12.5px] font-[500] text-pqMuted transition-colors hover:bg-pqHover hover:text-pqText',
          open && 'bg-pqHover text-pqText'
        )}
      >
        <svg
          viewBox="0 0 24 24"
          width="17"
          height="17"
          fill="none"
          aria-hidden="true"
          className="shrink-0"
        >
          <path
            d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM9.6 9.3a2.5 2.5 0 1 1 3.4 2.3c-.6.3-1 .9-1 1.6v.3M12 17h.01"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span data-hdr-label="1">{t('help', 'Help')}</span>
      </button>

      {open && (
        <div
          ref={floatingRef}
          role="menu"
          className="z-[60] w-[246px] animate-pqPop rounded-pqMd border border-pqBorder bg-pqInner p-[6px] shadow-pq"
        >
          {!isCheckout &&
            live(
              () => startTour(),
              'M9 11.5l2.5 2.5L17 8.5M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z',
              t('setup_tour', 'Setup tour'),
              'tour'
            )}

          <a
            href="https://docs.postqueen.ai"
            target="_blank"
            rel="noreferrer"
            role="menuitem"
            onClick={() => setOpen(false)}
            className={clsx(ROW, 'text-pqMuted hover:bg-pqHover hover:text-pqText')}
          >
            <HelpIcon d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
            {t('documentation', 'Documentation')}
          </a>
          {!isCheckout && (
            <div
              aria-disabled="true"
              className={clsx(ROW, 'cursor-default text-pqMuted opacity-[0.45]')}
            >
              <HelpIcon d="M2 6h20v12H2V6ZM6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10" />
              {t('keyboard_shortcuts', 'Keyboard shortcuts')}
            </div>
          )}

          {isChatBase &&
            live(
              () => (window as any).chatbase?.('open'),
              'M21 11.5a8.4 8.4 0 0 1-.9 3.8A8.5 8.5 0 0 1 12.5 20a8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7A8.4 8.4 0 0 1 4 11.5 8.5 8.5 0 0 1 8.7 3.9a8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5Z',
              t('contact_support', 'Contact support'),
              'support'
            )}

          {sentry.enabled && (
            <button
              ref={sentry.ref}
              type="button"
              role="menuitem"
              onClick={() => setOpen(false)}
              className={clsx(
                ROW,
                'text-pqMuted hover:bg-pqHover hover:text-pqText'
              )}
            >
              <HelpIcon d="M12 8v4M12 15.5h.01M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z" />
              {t('report_a_bug', 'Report a bug')}
            </button>
          )}

          {showExtension && (
            <a
              href={extensionStoreUrl}
              target="_blank"
              rel="noreferrer"
              role="menuitem"
              onClick={() => setOpen(false)}
              className={clsx(
                ROW,
                'text-pqMuted hover:bg-pqHover hover:text-pqText'
              )}
            >
              <HelpIcon d="M11.5 7a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm0 0h9.17M3.45 5.06 8.04 13M10.38 20.94 14.96 13M21.5 11a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z" />
              {t('browser_extension', 'Browser extension')}
            </a>
          )}
        </div>
      )}
    </div>
  );
};
