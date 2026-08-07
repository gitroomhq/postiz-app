'use client';

import { useCallback, useEffect, useRef } from 'react';
import useSWR, { mutate as globalMutate } from 'swr';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useToaster } from '@gitroom/react/toaster/toaster';

const POLL_MS = 20_000;

type NotificationRow = {
  id: string;
  createdAt: string;
  content: string;
};

type ListPayload = {
  notifications?: NotificationRow[];
  lastReadNotifications?: string;
};

/**
 * While the tab is focused, new server notifications (Temporal publish, Stripe,
 * channel refresh, …) surface as bottom-end toasts and are marked read so the
 * bell badge does not light up for those. Rows that already existed before this
 * session started stay unread for the bell until the user opens it.
 *
 * Note: `POST /notifications/read` advances a single org cutoff. If the user
 * already had older unread and a live toast fires, that read clears the cutoff
 * for everything — same as opening the bell. Offline-only → badge until open.
 */
export const NotificationsLiveBridge = (): null => {
  const fetch = useFetch();
  const toaster = useToaster();
  const lastSeenAt = useRef(new Date().toISOString());
  const toastedIds = useRef(new Set<string>());
  const marking = useRef(false);

  const loadList = useCallback(async (): Promise<ListPayload> => {
    return await (await fetch('/notifications/list')).json();
  }, [fetch]);

  const { data, mutate } = useSWR('notifications-live-bridge', loadList, {
    refreshInterval: () =>
      typeof document !== 'undefined' &&
      document.visibilityState === 'visible'
        ? POLL_MS
        : 0,
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
  });

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        void mutate();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [mutate]);

  useEffect(() => {
    if (!data?.notifications?.length) return;
    if (
      typeof document !== 'undefined' &&
      document.visibilityState !== 'visible'
    ) {
      return;
    }

    const cutoff = new Date(lastSeenAt.current).getTime();
    const fresh = data.notifications.filter((n) => {
      if (toastedIds.current.has(n.id)) return false;
      return new Date(n.createdAt).getTime() > cutoff;
    });

    if (!fresh.length) return;

    const toShow = fresh.slice(0, 3);
    for (const n of toShow) {
      toastedIds.current.add(n.id);
      const text = n.content.replace(/<[^>]+>/g, '').trim();
      if (text) {
        toaster.show(text, { kind: 'info' });
      }
    }

    const newest = fresh.reduce((a, b) =>
      new Date(a.createdAt) > new Date(b.createdAt) ? a : b
    );
    lastSeenAt.current = newest.createdAt;

    if (marking.current) return;
    marking.current = true;
    void (async () => {
      try {
        await fetch('/notifications/read', { method: 'POST' });
        await mutate();
        await globalMutate(
          'notifications-list',
          { total: 0 },
          { revalidate: true }
        );
      } finally {
        marking.current = false;
      }
    })();
  }, [data, fetch, mutate, toaster]);

  return null;
};
