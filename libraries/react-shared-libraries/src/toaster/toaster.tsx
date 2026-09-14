'use client';

import { useCallback, useEffect, useState } from 'react';
import EventEmitter from 'events';
import clsx from 'clsx';

export type ToasterKind = 'success' | 'warning' | 'info';

export type ToasterShowOptions = {
  title?: string;
  kind?: ToasterKind;
  /** Override default 4200ms hide. */
  duration?: number;
  /** Real link. Never dump a raw URL into `text` — it overflows and is not clickable. */
  href?: string;
  action?: string;
};

type ShowPayload = {
  text: string;
  type: ToasterKind;
  title?: string;
  duration: number;
  href?: string;
  action?: string;
};

const toaster = new EventEmitter();
const DEFAULT_DURATION_MS = 4200;

export const Toaster = () => {
  const [showToaster, setShowToaster] = useState(false);
  const [toasterText, setToasterText] = useState('');
  const [toasterTitle, setToasterTitle] = useState<string | undefined>();
  const [toasterType, setToasterType] = useState<ToasterKind>('success');
  const [toasterHref, setToasterHref] = useState<string | undefined>();
  const [toasterAction, setToasterAction] = useState<string | undefined>();

  useEffect(() => {
    let hideTimer: ReturnType<typeof setTimeout> | undefined;
    const onShow = (params: ShowPayload) => {
      if (hideTimer) clearTimeout(hideTimer);
      setToasterText(params.text);
      setToasterTitle(params.title);
      setToasterType(params.type);
      setToasterHref(params.href);
      setToasterAction(params.action);
      setShowToaster(true);
      hideTimer = setTimeout(() => {
        setShowToaster(false);
      }, params.duration);
    };
    toaster.on('show', onShow);
    return () => {
      toaster.removeAllListeners();
      if (hideTimer) clearTimeout(hideTimer);
    };
  }, []);

  if (!showToaster) {
    return <></>;
  }

  const success = toasterType === 'success';
  const info = toasterType === 'info';
  const iconClass = success
    ? 'bg-pqOk text-white'
    : info
      ? 'bg-pqBrandSoft text-pqBrand'
      : 'bg-pqAmberSoft text-pqAmber';
  const iconPath = success
    ? 'M5 12.5l4.5 4.5L19 7.5'
    : info
      ? 'M12 8v.01M12 11.5V16'
      : 'M12 8v5M12 16.5h.01';

  return (
    // Above the modal stack (~z-300). Bottom-end so status toasts don't fight the header.
    <div
      data-toaster="1"
      className="animate-pqFadeDown fixed bottom-[24px] end-[24px] z-[900] flex min-w-[260px] max-w-[min(360px,calc(100vw-32px))] items-start gap-[11px] rounded-[12px] bg-pqPop py-[12px] pe-[16px] ps-[13px] shadow-pqToast mobile:bottom-[16px] mobile:end-[16px]"
    >
      <span
        className={clsx(
          'mt-[1px] grid size-[22px] shrink-0 place-items-center rounded-full',
          iconClass
        )}
        data-toaster-kind={toasterType}
      >
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none">
          <path
            d={iconPath}
            stroke="currentColor"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <div className="min-w-0 flex-1 overflow-hidden">
        {toasterTitle ? (
          <div className="text-[12px] font-[600] leading-[1.3] text-pqSoft">
            {toasterTitle}
          </div>
        ) : null}
        <div
          className={clsx(
            'break-words text-[13.5px] font-[500] leading-[1.45] text-pqText [overflow-wrap:anywhere]',
            toasterTitle && 'mt-[2px]'
          )}
        >
          {toasterText}
        </div>
        {toasterHref ? (
          <a
            href={toasterHref}
            target="_blank"
            rel="noreferrer"
            className="mt-[5px] inline-flex text-[12.5px] font-[600] text-pqBrand hover:underline"
          >
            {toasterAction || 'Open'}
          </a>
        ) : null}
      </div>
    </div>
  );
};

function normalizeShow(
  textOrOptions: string | ToasterShowOptions & { text: string },
  typeOrOptions?: ToasterKind | ToasterShowOptions
): ShowPayload {
  if (typeof textOrOptions === 'object') {
    const o = textOrOptions;
    return {
      text: o.text,
      type: o.kind || 'success',
      title: o.title,
      duration: o.duration ?? DEFAULT_DURATION_MS,
      href: o.href,
      action: o.action,
    };
  }
  if (typeOrOptions && typeof typeOrOptions === 'object') {
    return {
      text: textOrOptions,
      type: typeOrOptions.kind || 'success',
      title: typeOrOptions.title,
      duration: typeOrOptions.duration ?? DEFAULT_DURATION_MS,
      href: typeOrOptions.href,
      action: typeOrOptions.action,
    };
  }
  return {
    text: textOrOptions,
    type: (typeOrOptions as ToasterKind | undefined) || 'success',
    duration: DEFAULT_DURATION_MS,
  };
}

/**
 * Same toast, without the hook. The emitter is module-scoped, so anything
 * outside React — a `window` event listener, a plain helper — had no way to
 * reach it. Callers inside components should keep using `useToaster`.
 */
export const showToast = (
  textOrOptions: string | (ToasterShowOptions & { text: string }),
  typeOrOptions?: ToasterKind | ToasterShowOptions
) => {
  toaster.emit('show', normalizeShow(textOrOptions, typeOrOptions));
};

export const useToaster = () => {
  return {
    /**
     * `show(text)` / `show(text, 'warning')` — existing callers.
     * `show(text, { title, kind, duration })` or `show({ text, title, kind })` for richer toasts.
     */
    show: useCallback(
      (
        textOrOptions: string | (ToasterShowOptions & { text: string }),
        typeOrOptions?: ToasterKind | ToasterShowOptions
      ) => {
        toaster.emit('show', normalizeShow(textOrOptions, typeOrOptions));
      },
      []
    ),
  };
};
