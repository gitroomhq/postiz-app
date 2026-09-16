'use client';

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    chatbase: any;
  }
}

import { FC, useCallback, useEffect, useState } from 'react';
import Script from 'next/script';
import { useVariables } from '@gitroom/react/helpers/variable.context';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { deleteDialog } from '@gitroom/react/helpers/delete.dialog';
import useSWR from 'swr';

export const ChatbaseComponent: FC = () => {
  const { isChatBase } = useVariables();
  // Chrome (hide over tour/sheets, pin trailing) must run even before the
  // bot script loads — Chatbase writes the iframe with inline !important.
  useEffect(() => installChatbaseChrome(), []);
  if (!isChatBase) {
    return null;
  }
  return <ChatbaseComponentLoad />;
};
export const ChatbaseComponentLoad: FC = () => {
  const fetch = useFetch();

  const { data } = useSWR(
    'chatbase-token',
    async () => {
      const { token } = await (await fetch('/user/chatbase-token')).json();

      return token;
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      revalidateIfStale: false,
      refreshWhenHidden: false,
      refreshWhenOffline: false,
      refreshInterval: 0,
    }
  );

  if (!data) {
    return null;
  }

  return <ChatBaseCode token={data} />;
};

/**
 * Chatbase's dashboard "Align: Left" keeps rewriting `left` on the bubble.
 * CSS alone loses that fight; pin bottom-trailing with !important so the rail
 * footer (Settings / Upgrade) stays visible.
 */
const pinChatbaseTrailing = (el: HTMLElement) => {
  const rtl = document.documentElement.getAttribute('dir') === 'rtl';
  const box = Math.max(el.offsetWidth || 60, 52);
  const wantLeft = rtl ? '20px' : `${Math.max(20, window.innerWidth - box - 20)}px`;
  const wantRight = 'auto';
  if (el.style.getPropertyValue('left') === wantLeft &&
      el.style.getPropertyValue('right') === wantRight) {
    return;
  }
  el.style.setProperty('left', wantLeft, 'important');
  el.style.setProperty('right', wantRight, 'important');
  el.style.setProperty('inset-inline-start', rtl ? '20px' : 'auto', 'important');
  el.style.setProperty('inset-inline-end', rtl ? 'auto' : '20px', 'important');
};

const chatbaseShouldHide = () =>
  document.documentElement.getAttribute('data-tourdemo') === '1' ||
  !!document.documentElement.getAttribute('data-pq-sheet') ||
  !!document.querySelector('[data-pq="mobile-sheet"]') ||
  !!document.querySelector(
    '[data-pq="getting-started"] [aria-expanded="true"]'
  );

const hideChatbaseForChrome = (el: HTMLElement) => {
  if (chatbaseShouldHide()) {
    if (
      el.getAttribute('data-pq-cbh') === '1' &&
      el.style.getPropertyValue('display') === 'none'
    ) {
      return;
    }
    if (el.getAttribute('data-pq-cbh') !== '1') {
      el.setAttribute(
        'data-pq-cbh-display',
        el.style.getPropertyValue('display')
      );
      el.setAttribute('data-pq-cbh', '1');
    }
    el.style.setProperty('display', 'none', 'important');
    el.style.setProperty('visibility', 'hidden', 'important');
    el.style.setProperty('opacity', '0', 'important');
    el.style.setProperty('pointer-events', 'none', 'important');
    return;
  }
  if (el.getAttribute('data-pq-cbh') !== '1') return;
  const prev = el.getAttribute('data-pq-cbh-display');
  el.removeAttribute('data-pq-cbh');
  el.removeAttribute('data-pq-cbh-display');
  if (prev) el.style.setProperty('display', prev);
  else el.style.removeProperty('display');
  el.style.removeProperty('visibility');
  el.style.removeProperty('opacity');
  el.style.removeProperty('pointer-events');
};

const CHATBASE_PIN_STYLE_ID = 'pq-chatbase-pin-trailing';
const CHATBASE_PIN_SELECTOR =
  '#chatbase-bubble-button, #chatbase-bubble-window, [id^="chatbase-bubble"], iframe[src*="chatbase"]';

const injectChatbasePinStyle = () => {
  if (document.getElementById(CHATBASE_PIN_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = CHATBASE_PIN_STYLE_ID;
  style.textContent = `
#chatbase-bubble-button,
#chatbase-bubble-window,
[id^="chatbase-bubble"],
iframe[src*="chatbase"] {
  left: auto !important;
  right: 20px !important;
  inset-inline-start: auto !important;
  inset-inline-end: 20px !important;
}
[dir="rtl"] #chatbase-bubble-button,
[dir="rtl"] #chatbase-bubble-window,
[dir="rtl"] [id^="chatbase-bubble"],
[dir="rtl"] iframe[src*="chatbase"] {
  left: 20px !important;
  right: auto !important;
}
[data-tourdemo='1'] #chatbase-bubble-button,
[data-tourdemo='1'] #chatbase-bubble-window,
[data-tourdemo='1'] [id^="chatbase-bubble"],
[data-tourdemo='1'] iframe[src*="chatbase"],
[data-pq-sheet] #chatbase-bubble-button,
[data-pq-sheet] #chatbase-bubble-window,
[data-pq-sheet] [id^="chatbase-bubble"],
[data-pq-sheet] iframe[src*="chatbase"] {
  display: none !important;
  visibility: hidden !important;
  opacity: 0 !important;
  pointer-events: none !important;
}`;
  document.head.appendChild(style);
};

const pinAllChatbase = () => {
  document.querySelectorAll<HTMLElement>(CHATBASE_PIN_SELECTOR).forEach((el) => {
    hideChatbaseForChrome(el);
    if (!chatbaseShouldHide()) pinChatbaseTrailing(el);
    watchChatbaseNode(el);
  });
};

const watchedChatbase = new WeakSet<Element>();
const watchChatbaseNode = (el: HTMLElement) => {
  if (watchedChatbase.has(el)) return;
  watchedChatbase.add(el);
  const obs = new MutationObserver(pinAllChatbase);
  obs.observe(el, { attributes: true, attributeFilter: ['style', 'class'] });
};

let chromeCleanup: (() => void) | null = null;

/** Hide the bubble over the tour / sheets and pin it trailing. Idempotent. */
export const installChatbaseChrome = () => {
  if (typeof document === 'undefined') return;
  if (chromeCleanup) return;
  injectChatbasePinStyle();
  pinAllChatbase();
  const observer = new MutationObserver(pinAllChatbase);
  observer.observe(document.body, { childList: true, subtree: true });
  const rootObserver = new MutationObserver(pinAllChatbase);
  rootObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-tourdemo', 'data-pq-sheet'],
  });
  const interval = window.setInterval(pinAllChatbase, 500);
  let raf = 0;
  const tick = () => {
    pinAllChatbase();
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
  chromeCleanup = () => {
    observer.disconnect();
    rootObserver.disconnect();
    window.clearInterval(interval);
    if (raf) cancelAnimationFrame(raf);
    chromeCleanup = null;
  };
};

const ChatBaseCode: FC<{ token: string }> = ({ token }) => {
  const { chatbaseBotId } = useVariables();
  const fetch = useFetch();

  useEffect(() => {
    if (!window.chatbase || window.chatbase('getState') !== 'initialized') {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      window.chatbase = (...arg) => {
        if (!window.chatbase.q) {
          window.chatbase.q = [];
        }
        window.chatbase.q.push(arg);
      };
      window.chatbase = new Proxy(window.chatbase, {
        get(target, prop) {
          if (prop === 'q') {
            return target.q;
          }
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          return (...args) => target(prop, ...args);
        },
      });
    }
    const onLoad = function () {
      const script = document.createElement('script');
      script.src = 'https://www.chatbase.co/embed.min.js';
      script.id = chatbaseBotId;
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      script.domain = 'www.chatbase.co';
      document.body.appendChild(script);
    };
    if (document.readyState === 'complete') {
      onLoad();
    } else {
      window.addEventListener('load', onLoad);
    }

    window.chatbase('identify', { token });

    window.chatbase('registerTools', {
      stripe_refund: async () => {
        try {
          const previewResponse = await fetch('/billing/chatbase-refund/preview');

          if (!previewResponse.ok) {
            return {
              status: 'error',
              error: 'Could not process the refund request',
            };
          }

          const preview = await previewResponse.json();

          if (!preview.eligible) {
            return {
              status: 'success',
              data: { refunded: false, reason: preview.reason },
            };
          }

          const approved = await deleteDialog(
            `You are cancelling your ${
              preview.tier || ''
            } subscription and will receive a refund of ${preview.amount} ${(
              preview.currency || ''
            ).toUpperCase()}. Do you approve?`,
            'Yes, cancel and refund',
            'Cancel subscription'
          );

          if (!approved) {
            return {
              status: 'success',
              data: {
                refunded: false,
                reason: 'The user declined the refund confirmation',
              },
            };
          }

          const response = await fetch('/billing/chatbase-refund', {
            method: 'POST',
          });

          if (!response.ok) {
            return {
              status: 'error',
              error: 'Could not process the refund request',
            };
          }

          return {
            status: 'success',
            data: await response.json(),
          };
        } catch (err) {
          return {
            status: 'error',
            error: 'Could not process the refund request',
          };
        }
      },
    });

    installChatbaseChrome();
    return () => {
      /* chrome lives for the app session — Support keeps it mounted */
    };
  }, []);
  return null;
};
