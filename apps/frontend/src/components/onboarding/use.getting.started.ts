'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import useSWR from 'swr';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useUser } from '@gitroom/frontend/components/layout/user.context';
import { postsListHasRows } from '@gitroom/frontend/components/launches/posts-panel-tab';
import {
  gettingStartedDismissKey,
  gettingStartedProgress,
  gettingStartedVisible,
} from '@gitroom/frontend/components/onboarding/getting-started';

/**
 * Live first-run checklist for the current organization.
 *
 * Channel / scheduled / published are always recomputed from the API. The only
 * local state is "they dismissed the all-set card". Do not seed the channel
 * probe with an empty list: that snapshot is what made Create Post treat a
 * still-loading account as having no channels, and it would flash 0/3 here
 * for people who already finished.
 *
 * Post probes use a `#gs:` cache key so they do not share SWR data with
 * `useHasPublishedPost`, which stores a boolean on `/posts/list?state=published…`.
 * Calendar mutations target `/posts-` keys, so these probes also refresh while
 * the checklist is incomplete (MCP / n8n / Post now land without a reload).
 */
export const useGettingStarted = (
  enabled = true,
  options?: { poll?: boolean }
) => {
  const fetch = useFetch();
  const user = useUser();
  const orgId = enabled ? user?.orgId || '' : '';
  const dismissKey = orgId ? gettingStartedDismissKey(orgId) : '';
  const [dismissed, setDismissed] = useState(false);
  const completeRef = useRef(false);

  useEffect(() => {
    if (!dismissKey) {
      setDismissed(false);
      return;
    }
    try {
      setDismissed(localStorage.getItem(dismissKey) === '1');
    } catch {
      setDismissed(false);
    }
  }, [dismissKey]);

  const loadChannels = useCallback(async (path: string) => {
    const response = await fetch(path);
    if (!response.ok) {
      throw new Error('Could not load channels');
    }
    const integrations = (await response.json()).integrations;
    return Array.isArray(integrations) ? integrations : [];
  }, [fetch]);

  const loadHasRows = useCallback(async (key: string) => {
    const response = await fetch(key.split('#')[0]);
    if (!response.ok) {
      throw new Error('Could not load posts');
    }
    return postsListHasRows(await response.json());
  }, [fetch]);

  const pollMs = () =>
    options?.poll === false || completeRef.current ? 0 : 5000;

  const {
    data: integrations,
    error: channelError,
    mutate: mutateChannels,
  } = useSWR(orgId ? '/integrations/list' : null, loadChannels, {
    revalidateOnMount: true,
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    refreshInterval: pollMs,
  });

  const {
    data: hasScheduled,
    error: scheduledError,
    mutate: mutateScheduled,
  } = useSWR(
    orgId
      ? `/posts/list?state=scheduled&limit=1&page=0#gs:${orgId}`
      : null,
    loadHasRows,
    {
      revalidateOnMount: true,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      refreshInterval: pollMs,
    }
  );

  const {
    data: hasPublished,
    error: publishedError,
    mutate: mutatePublished,
  } = useSWR(
    orgId
      ? `/posts/list?state=published&limit=1&page=0#gs:${orgId}`
      : null,
    loadHasRows,
    {
      revalidateOnMount: true,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      refreshInterval: pollMs,
    }
  );

  const progress = gettingStartedProgress({
    hasChannel: Array.isArray(integrations) && integrations.length > 0,
    hasScheduled: hasScheduled === true,
    hasPublished: hasPublished === true,
  });
  completeRef.current = progress.complete;

  const ready =
    !!orgId &&
    !channelError &&
    !scheduledError &&
    !publishedError &&
    integrations !== undefined &&
    hasScheduled !== undefined &&
    hasPublished !== undefined;

  const refresh = useCallback(() => {
    void mutateChannels();
    void mutateScheduled();
    void mutatePublished();
  }, [mutateChannels, mutateScheduled, mutatePublished]);

  const dismiss = useCallback(() => {
    if (dismissKey) {
      try {
        localStorage.setItem(dismissKey, '1');
      } catch {
        /* private mode: the card still closes for this session */
      }
    }
    setDismissed(true);
  }, [dismissKey]);

  const show = gettingStartedVisible({
    ready,
    complete: progress.complete,
    dismissed,
  });

  return useMemo(
    () => ({
      ready,
      show,
      complete: progress.complete,
      done: progress.done,
      total: progress.total,
      channel: progress.channel,
      scheduled: progress.scheduled,
      published: progress.published,
      dismiss,
      refresh,
      mutateChannels,
    }),
    [
      ready,
      show,
      progress.complete,
      progress.done,
      progress.total,
      progress.channel,
      progress.scheduled,
      progress.published,
      dismiss,
      refresh,
      mutateChannels,
    ]
  );
};
