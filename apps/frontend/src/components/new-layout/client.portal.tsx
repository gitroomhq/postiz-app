'use client';

import React, { useCallback, useState } from 'react';
import useSWR from 'swr';
import dayjs from 'dayjs';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { Logo } from '@gitroom/frontend/components/new-layout/logo';
import { useT } from '@gitroom/react/translation/get.transation.service.client';

type ClientPost = {
  id: string;
  content: string;
  media: Array<{ path: string }>;
  publishDate: string;
  state: string;
  approvalStatus:
    | 'NONE'
    | 'WAITING_APPROVAL'
    | 'APPROVED'
    | 'NEEDS_CHANGES'
    | 'REJECTED';
  integration: { id: string; name: string; picture: string | null } | null;
};

const STATUS_LABEL: Record<string, string> = {
  NONE: 'Pending review',
  WAITING_APPROVAL: 'Waiting approval',
  APPROVED: 'Approved',
  NEEDS_CHANGES: 'Changes requested',
  REJECTED: 'Rejected',
};

const STATUS_CLASS: Record<string, string> = {
  NONE: 'bg-newColColor text-newTextColor',
  WAITING_APPROVAL: 'bg-amber-500/20 text-amber-300',
  APPROVED: 'bg-green-500/20 text-green-300',
  NEEDS_CHANGES: 'bg-amber-500/20 text-amber-300',
  REJECTED: 'bg-red-500/20 text-red-300',
};

const isVideo = (path: string) => /\.(mp4|mov|webm|m4v)(\?|$)/i.test(path);

const Media = ({ path }: { path: string }) => {
  if (isVideo(path)) {
    return (
      <video
        src={path}
        controls
        className="w-full max-h-[420px] rounded-[8px] bg-black object-contain"
      />
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src={path}
      alt=""
      className="w-full max-h-[420px] rounded-[8px] object-contain bg-black/20"
    />
  );
};

const Comments = ({ postId }: { postId: string }) => {
  const fetch = useFetch();
  const t = useT();
  const [text, setText] = useState('');
  const { data, mutate } = useSWR(`/client/posts/${postId}/comments`, async () => {
    return (await (await fetch(`/client/posts/${postId}/comments`)).json())
      .comments as Array<{
      id: string;
      content: string;
      createdAt: string;
      user?: { name?: string; email?: string };
    }>;
  });
  const send = useCallback(async () => {
    if (text.trim().length < 1) return;
    await fetch(`/client/posts/${postId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ comment: text }),
    });
    setText('');
    mutate();
  }, [text, postId]);
  return (
    <div className="flex flex-col gap-[8px] mt-[12px] border-t border-newTableBorder pt-[12px]">
      <div className="text-[13px] font-[600] opacity-80">
        {t('comments', 'Comments')}
      </div>
      {(data || []).map((c) => (
        <div key={c.id} className="text-[13px]">
          <span className="font-[600]">
            {c.user?.name || c.user?.email || t('user', 'User')}:
          </span>{' '}
          <span className="opacity-90">{c.content}</span>
          <span className="opacity-40 text-[11px] ml-[6px]">
            {dayjs(c.createdAt).format('MMM D, HH:mm')}
          </span>
        </div>
      ))}
      {!data?.length && (
        <div className="text-[12px] opacity-50">
          {t('no_comments_yet', 'No comments yet.')}
        </div>
      )}
      <div className="flex gap-[8px] mt-[4px]">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t('write_a_comment', 'Write a comment...')}
          className="flex-1 h-[36px] px-[10px] rounded-[8px] bg-newBgColorInner border border-newTableBorder text-[13px]"
        />
        <button
          onClick={send}
          className="h-[36px] px-[14px] rounded-[8px] bg-btnPrimary text-[13px]"
        >
          {t('send', 'Send')}
        </button>
      </div>
    </div>
  );
};

const PostCard = ({
  post,
  onChanged,
}: {
  post: ClientPost;
  onChanged: () => void;
}) => {
  const fetch = useFetch();
  const t = useT();
  const [busy, setBusy] = useState(false);
  const [showComments, setShowComments] = useState(false);

  const act = useCallback(
    async (action: 'APPROVED' | 'REJECTED' | 'NEEDS_CHANGES') => {
      let comment: string | undefined;
      if (action !== 'APPROVED') {
        comment =
          window.prompt(
            action === 'REJECTED'
              ? t('reject_reason', 'Add a reason for rejecting (optional):')
              : t('changes_note', 'What changes are needed?')
          ) || undefined;
      }
      setBusy(true);
      await fetch(`/client/posts/${post.id}/approval`, {
        method: 'POST',
        body: JSON.stringify({ action, comment }),
      });
      setBusy(false);
      onChanged();
    },
    [post.id]
  );

  return (
    <div className="bg-newBgColorInner rounded-[12px] p-[16px] flex flex-col gap-[12px] border border-newTableBorder">
      <div className="flex items-center gap-[10px]">
        {post.integration?.picture && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.integration.picture}
            alt={post.integration?.name || ''}
            className="w-[32px] h-[32px] rounded-full"
          />
        )}
        <div className="flex-1">
          <div className="font-[600] text-[14px]">
            {post.integration?.name || t('channel', 'Channel')}
          </div>
          <div className="text-[12px] opacity-60">
            {dayjs(post.publishDate).format('dddd, MMM D, YYYY • HH:mm')}
          </div>
        </div>
        <div
          className={`text-[12px] px-[10px] py-[4px] rounded-full ${
            STATUS_CLASS[post.approvalStatus] || STATUS_CLASS.NONE
          }`}
        >
          {t(
            `status_${post.approvalStatus}`.toLowerCase(),
            STATUS_LABEL[post.approvalStatus] || 'Pending review'
          )}
        </div>
      </div>

      {!!post.media?.length && (
        <div className="grid grid-cols-1 gap-[8px]">
          {post.media.map((m, i) => (
            <Media key={i} path={m.path} />
          ))}
        </div>
      )}

      {!!post.content && (
        <div className="text-[14px] whitespace-pre-wrap leading-[1.5]">
          {post.content}
        </div>
      )}

      <div className="flex flex-wrap gap-[8px]">
        <button
          disabled={busy}
          onClick={() => act('APPROVED')}
          className="h-[38px] px-[16px] rounded-[8px] bg-green-600/80 hover:bg-green-600 text-white text-[13px] disabled:opacity-50"
        >
          {t('approve', 'Approve')}
        </button>
        <button
          disabled={busy}
          onClick={() => act('NEEDS_CHANGES')}
          className="h-[38px] px-[16px] rounded-[8px] bg-amber-600/80 hover:bg-amber-600 text-white text-[13px] disabled:opacity-50"
        >
          {t('request_changes', 'Request changes')}
        </button>
        <button
          disabled={busy}
          onClick={() => act('REJECTED')}
          className="h-[38px] px-[16px] rounded-[8px] bg-red-600/80 hover:bg-red-600 text-white text-[13px] disabled:opacity-50"
        >
          {t('reject', 'Reject')}
        </button>
        <button
          onClick={() => setShowComments((s) => !s)}
          className="h-[38px] px-[16px] rounded-[8px] bg-newColColor text-[13px] ml-auto"
        >
          {showComments
            ? t('hide_comments', 'Hide comments')
            : t('comments', 'Comments')}
        </button>
      </div>

      {showComments && <Comments postId={post.id} />}
    </div>
  );
};

export const ClientPortal = () => {
  const fetch = useFetch();
  const t = useT();
  const { data, isLoading, mutate } = useSWR('/client/posts', async () => {
    return (await (await fetch('/client/posts')).json()).posts as ClientPost[];
  });

  const logout = useCallback(async () => {
    await fetch('/user/logout', { method: 'POST' });
    window.location.href = '/auth/login';
  }, []);

  return (
    <div className="min-h-screen text-newTextColor p-[16px] md:p-[24px] max-w-[760px] mx-auto w-full">
      <div className="flex items-center gap-[12px] mb-[24px]">
        <div className="flex-1">
          <Logo />
        </div>
        <button
          onClick={logout}
          className="h-[38px] px-[16px] rounded-[8px] bg-newBgColorInner border border-newTableBorder text-[13px]"
        >
          {t('sign_out', 'Sign Out')}
        </button>
      </div>

      <h1 className="text-[22px] font-[600] mb-[4px]">
        {t('your_content', 'Your content')}
      </h1>
      <p className="text-[14px] opacity-70 mb-[20px]">
        {t(
          'client_portal_intro',
          'Review your scheduled posts below. Approve, request changes, or leave a comment.'
        )}
      </p>

      {isLoading && <div className="opacity-60">{t('loading', 'Loading...')}</div>}

      {!isLoading && !data?.length && (
        <div className="bg-newBgColorInner rounded-[12px] p-[24px] text-center opacity-70">
          {t('no_content_yet', 'No content to review yet.')}
        </div>
      )}

      <div className="flex flex-col gap-[16px]">
        {(data || []).map((post) => (
          <PostCard key={post.id} post={post} onChanged={() => mutate()} />
        ))}
      </div>
    </div>
  );
};
