'use client';

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  const wantLeft = rtl ? '20px' : 'auto';
  const wantRight = rtl ? 'auto' : '20px';
  if (el.style.getPropertyValue('left') === wantLeft &&
      el.style.getPropertyValue('right') === wantRight) {
    return;
  }
  el.style.setProperty('left', wantLeft, 'important');
  el.style.setProperty('right', wantRight, 'important');
  el.style.setProperty('inset-inline-start', 'auto', 'important');
  el.style.setProperty('inset-inline-end', '20px', 'important');
};

const CHATBASE_PIN_STYLE_ID = 'pq-chatbase-pin-trailing';
const CHATBASE_PIN_SELECTOR =
  '#chatbase-bubble-button, #chatbase-bubble-window, [id^="chatbase-bubble"]';

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

    // Survive Chatbase re-applying dashboard "Align: Left" after mount.
    if (!document.getElementById(CHATBASE_PIN_STYLE_ID)) {
      const style = document.createElement('style');
      style.id = CHATBASE_PIN_STYLE_ID;
      style.textContent = `
#chatbase-bubble-button,
#chatbase-bubble-window,
[id^="chatbase-bubble"] {
  left: auto !important;
  right: 20px !important;
  inset-inline-start: auto !important;
  inset-inline-end: 20px !important;
}
[dir="rtl"] #chatbase-bubble-button,
[dir="rtl"] #chatbase-bubble-window,
[dir="rtl"] [id^="chatbase-bubble"] {
  left: 20px !important;
  right: auto !important;
}`;
      document.head.appendChild(style);
    }

    const pinAll = () => {
      document
        .querySelectorAll<HTMLElement>(CHATBASE_PIN_SELECTOR)
        .forEach(pinChatbaseTrailing);
    };
    pinAll();
    // childList only — watching `style` would re-fire on our own setProperty.
    const observer = new MutationObserver(pinAll);
    observer.observe(document.body, { childList: true, subtree: true });
    const interval = window.setInterval(pinAll, 2000);

    return () => {
      observer.disconnect();
      window.clearInterval(interval);
    };
  }, []);
  return null;
};
