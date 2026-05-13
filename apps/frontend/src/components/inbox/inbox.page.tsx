'use client';

import useSWR from 'swr';
import { useCallback, useState } from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import clsx from 'clsx';

dayjs.extend(relativeTime);

type InboxItemResponse = {
  id: string;
  platform: string;
  type: string;
  senderName: string;
  senderAvatar?: string;
  content: string;
  createdAt: string;
  readAt?: string;
  repliedAt?: string;
  integration: {
    name: string;
    picture?: string;
    providerIdentifier: string;
  };
};

const useInboxItems = (params: { platform?: string; type?: string; unreadOnly?: boolean; page?: number }) => {
  const fetch = useFetch();
  const query = new URLSearchParams();
  if (params.platform) query.set('platform', params.platform);
  if (params.type) query.set('type', params.type);
  if (params.unreadOnly) query.set('unread', 'true');
  if (params.page) query.set('page', String(params.page));

  return useSWR(`inbox-${query.toString()}`, async () => {
    const res = await fetch(`/inbox?${query.toString()}`);
    return res.json() as Promise<InboxItemResponse[]>;
  });
};

const useInboxCount = () => {
  const fetch = useFetch();
  return useSWR('inbox-count', async () => {
    const res = await fetch('/inbox/count');
    return res.json() as Promise<number>;
  });
};

export const InboxPage = () => {
  const fetch = useFetch();
  const [filterPlatform, setFilterPlatform] = useState<string | undefined>();
  const [filterType, setFilterType] = useState<string | undefined>();
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [replyingId, setReplyingId] = useState<string | null>(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [sending, setSending] = useState(false);

  const { data: items, mutate } = useInboxItems({ platform: filterPlatform, type: filterType, unreadOnly });
  const { mutate: mutateCount } = useInboxCount();

  const markRead = useCallback(async (id: string) => {
    await fetch(`/inbox/${id}/read`, { method: 'POST' });
    mutate();
    mutateCount();
  }, [fetch, mutate, mutateCount]);

  const sendReply = useCallback(async (id: string) => {
    if (!replyMessage.trim()) return;
    setSending(true);
    try {
      await fetch(`/inbox/${id}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: replyMessage }),
      });
      setReplyingId(null);
      setReplyMessage('');
      mutate();
      mutateCount();
    } finally {
      setSending(false);
    }
  }, [fetch, replyMessage, mutate, mutateCount]);

  return (
    <div className="flex flex-col gap-4 p-4 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Inbox</h1>
        <div className="flex gap-2 items-center">
          <button
            onClick={() => setUnreadOnly((v) => !v)}
            className={clsx(
              'px-3 py-1 rounded-full text-sm border transition-colors',
              unreadOnly
                ? 'bg-primary text-white border-primary'
                : 'border-gray-600 text-gray-400 hover:border-gray-400'
            )}
          >
            Unread only
          </button>
          <select
            className="bg-transparent border border-gray-600 rounded px-2 py-1 text-sm"
            value={filterType ?? ''}
            onChange={(e) => setFilterType(e.target.value || undefined)}
          >
            <option value="">All types</option>
            <option value="comment">Comments</option>
            <option value="mention">Mentions</option>
          </select>
        </div>
      </div>

      {!items || items.length === 0 ? (
        <div className="text-center text-gray-500 py-16">
          No inbox items yet. Connect Instagram to start pulling in comments.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((item) => (
            <div
              key={item.id}
              className={clsx(
                'rounded-lg border p-4 flex flex-col gap-3 transition-colors',
                item.readAt ? 'border-fifth opacity-70' : 'border-primary bg-primary/5'
              )}
              onClick={() => !item.readAt && markRead(item.id)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  {item.senderAvatar ? (
                    <img src={item.senderAvatar} className="w-8 h-8 rounded-full" alt={item.senderName} />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center text-sm font-bold">
                      {item.senderName[0]?.toUpperCase()}
                    </div>
                  )}
                  <div>
                    <div className="font-medium text-sm">{item.senderName}</div>
                    <div className="text-xs text-gray-400 flex items-center gap-1">
                      <span className="capitalize">{item.integration.name}</span>
                      <span>·</span>
                      <span className="capitalize">{item.type}</span>
                      <span>·</span>
                      <span>{dayjs(item.createdAt).fromNow()}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  {!item.readAt && (
                    <span className="w-2 h-2 rounded-full bg-primary mt-1 flex-shrink-0" />
                  )}
                  {item.repliedAt && (
                    <span className="text-xs text-green-500">Replied</span>
                  )}
                </div>
              </div>

              <p className="text-sm text-gray-200">{item.content}</p>

              {replyingId === item.id ? (
                <div className="flex flex-col gap-2">
                  <textarea
                    className="w-full bg-sixth border border-fifth rounded p-2 text-sm resize-none"
                    rows={3}
                    placeholder="Write a reply..."
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    autoFocus
                  />
                  <div className="flex gap-2 justify-end">
                    <button
                      className="px-3 py-1 text-sm text-gray-400 hover:text-white"
                      onClick={() => { setReplyingId(null); setReplyMessage(''); }}
                    >
                      Cancel
                    </button>
                    <button
                      className="px-4 py-1 text-sm bg-primary text-white rounded disabled:opacity-50"
                      disabled={sending || !replyMessage.trim()}
                      onClick={() => sendReply(item.id)}
                    >
                      {sending ? 'Sending...' : 'Reply'}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  className="self-start text-xs text-primary hover:underline"
                  onClick={(e) => { e.stopPropagation(); setReplyingId(item.id); }}
                >
                  Reply
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
