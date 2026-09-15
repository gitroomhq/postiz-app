'use client';

import {
  FC,
  ReactNode,
  useEffect,
  useId,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import { useT } from '@gitroom/react/translation/get.transation.service.client';

/**
 * Phone bottom sheet. Portals to `document.body` so it sits above chrome,
 * drawers and route overlays. Desktop callers should not render this — gate
 * on `useViewport().mobile` at the call site.
 */
export const MobileSheet: FC<{
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  /** Defaults to a tall sheet. Pass `full` for edge-to-edge. */
  size?: 'default' | 'full';
  className?: string;
}> = ({
  open,
  onClose,
  title,
  children,
  footer,
  size = 'default',
  className,
}) => {
  const t = useT();
  const titleId = useId();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const root = document.documentElement;
    const n = Number(root.getAttribute('data-pq-sheet') || '0') + 1;
    root.setAttribute('data-pq-sheet', String(n));
    const nodes = () =>
      document.querySelectorAll<HTMLElement>(
        '#chatbase-bubble-button, #chatbase-bubble-window, [id^="chatbase-bubble"], iframe[src*="chatbase"]'
      );
    const hide = () => {
      nodes().forEach((el) => {
        el.style.setProperty('display', 'none', 'important');
        el.style.setProperty('visibility', 'hidden', 'important');
        el.style.setProperty('pointer-events', 'none', 'important');
      });
    };
    hide();
    const id = window.setInterval(hide, 100);
    return () => {
      window.clearInterval(id);
      const left = Number(root.getAttribute('data-pq-sheet') || '1') - 1;
      if (left <= 0) root.removeAttribute('data-pq-sheet');
      else root.setAttribute('data-pq-sheet', String(left));
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!mounted || !open) return null;

  return createPortal(
    <div
      data-pq="mobile-sheet"
      className="fixed inset-0 z-[240] flex flex-col justify-end"
    >
      <button
        type="button"
        aria-label={t('close', 'Close')}
        className="absolute inset-0 bg-pqPopup"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        className={clsx(
          'relative z-[1] flex w-full flex-col overflow-hidden bg-pqInner shadow-pqE3',
          'pb-[max(12px,env(safe-area-inset-bottom))]',
          size === 'full'
            ? 'h-dvh max-h-dvh rounded-none'
            : 'max-h-[min(88dvh,720px)] rounded-t-[16px]',
          className
        )}
      >
        <div className="flex shrink-0 justify-center pt-[8px]" aria-hidden>
          <span className="h-[4px] w-[36px] rounded-full bg-pqLine" />
        </div>
        <div className="flex min-h-[44px] shrink-0 items-center gap-[8px] px-[12px] pb-[8px]">
          {title ? (
            <div
              id={titleId}
              className="min-w-0 flex-1 px-[4px] text-[15px] font-[600] text-pqText"
            >
              {title}
            </div>
          ) : (
            <div className="flex-1" />
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label={t('close', 'Close')}
            className="grid size-[44px] shrink-0 place-items-center rounded-[10px] text-pqSoft transition-colors hover:bg-pqHover hover:text-pqText"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
              <path
                d="M6 6l12 12M18 6 6 18"
                stroke="currentColor"
                strokeWidth="1.9"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-[16px] pb-[12px]">
          {children}
        </div>
        {footer ? (
          <div className="shrink-0 border-t border-pqLine px-[16px] pt-[12px]">
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body
  );
};
