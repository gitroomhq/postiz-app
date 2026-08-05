'use client';

import {
  FC,
  ReactNode,
  RefObject,
  useEffect,
  useRef,
  useState,
} from 'react';
import clsx from 'clsx';
import { useViewport } from '@gitroom/frontend/components/layout/use.viewport';
import { useT } from '@gitroom/react/translation/get.transation.service.client';

/**
 * Detail pane for list + detail pages (Channels, Analytics, Plugs).
 *
 * Desktop / tablet (≥760): flex-1 scroll column with stable scrollbar gutter
 * (design Channels `:1719`) so centered content does not jump across panels.
 * Phone (&lt;760): full-bleed off-canvas drawer below the app chrome, matching
 * Agent drawer tokens (scrim `bg-pqPopup`, `shadow-pqE3`, z 72 / 78). Wider than
 * Agent's 264px side rails — detail content needs the full inset width.
 */
export const TwoColumnDetailDrawer: FC<{
  open: boolean;
  onClose: () => void;
  label: string;
  children: ReactNode;
  className?: string;
  /** Two-column row used to measure drawer top below chrome. */
  anchorRef?: RefObject<HTMLElement | null>;
  /**
   * When this value changes, scroll the detail pane to the top.
   * Matches design Channels pane: chAdd / addStep / addContinue → scrollTop = 0.
   */
  scrollResetKey?: string | number | boolean | null;
}> = ({
  open,
  onClose,
  label,
  children,
  className,
  anchorRef,
  scrollResetKey,
}) => {
  const { mobile } = useViewport();
  const t = useT();
  const selfRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [drawerTop, setDrawerTop] = useState(0);

  useEffect(() => {
    if (!mobile) return;
    const measure = () => {
      const el = anchorRef?.current ?? selfRef.current;
      setDrawerTop(Math.max(0, el?.getBoundingClientRect().top ?? 0));
    };
    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [mobile, anchorRef]);

  useEffect(() => {
    if (!mobile || !open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mobile, open, onClose]);

  // Design Channels pane resets scroll when swapping add ↔ detail / connect steps
  // so headers share the same top alignment.
  useEffect(() => {
    if (scrollResetKey === undefined) return;
    const el = scrollRef.current;
    if (el) el.scrollTop = 0;
  }, [scrollResetKey]);

  // Desktop: design uses overflow-y:scroll + scrollbar-gutter:stable on the
  // Channels content column so centered max-w content does not jump when the
  // scrollbar appears/disappears across add vs detail.
  if (!mobile) {
    return (
      <div
        ref={scrollRef}
        className={clsx(
          'flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto [scrollbar-gutter:stable]',
          className
        )}
      >
        {children}
      </div>
    );
  }

  return (
    <>
      <div ref={selfRef} className="hidden" aria-hidden />
      {open && (
        <div
          onClick={onClose}
          style={{ top: drawerTop }}
          className="fixed inset-x-0 bottom-0 z-[72] bg-pqPopup"
        />
      )}
      <div
        style={{ top: drawerTop }}
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[78] overflow-hidden"
      >
        <div
          {...(open ? { role: 'dialog', 'aria-modal': true } : {})}
          aria-label={label}
          aria-hidden={!open}
          className={clsx(
            'pointer-events-auto absolute inset-y-0 end-0 flex w-full max-w-full flex-col bg-pqInner shadow-pqE3 transition-transform duration-200 ease-out',
            !open && 'translate-x-[104%] rtl:-translate-x-[104%]'
          )}
        >
          <div className="flex shrink-0 items-center gap-[8px] border-b border-pqLine px-[12px] py-[8px]">
            <button
              type="button"
              onClick={onClose}
              className="flex h-[32px] items-center gap-[6px] rounded-pqSm border border-pqBorder bg-pqInner pe-[12px] ps-[10px] text-[12.5px] font-[500] text-pqText"
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none">
                <path
                  d="M15 18l-6-6 6-6"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              {t('back', 'Back')}
            </button>
            <span className="min-w-0 flex-1 truncate text-[13px] font-[600] text-pqMuted">
              {label}
            </span>
          </div>
          <div
            ref={scrollRef}
            className={clsx(
              'flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto [scrollbar-gutter:stable]',
              className
            )}
          >
            {children}
          </div>
        </div>
      </div>
    </>
  );
};
