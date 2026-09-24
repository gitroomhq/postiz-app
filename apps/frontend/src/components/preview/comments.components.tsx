'use client';

import { useUser } from '@gitroom/frontend/components/layout/user.context';
import { Button } from '@gitroom/react/form/button';
import { Input } from '@gitroom/react/form/input';
import { Textarea } from '@gitroom/react/form/textarea';
import { FC, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { FormProvider, useForm } from 'react-hook-form';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useModals } from '@gitroom/frontend/components/layout/new-modal';
import { useVariables } from '@gitroom/react/helpers/variable.context';
import { useToaster } from '@gitroom/react/toaster/toaster';
import clsx from 'clsx';
import dayjs from 'dayjs';
import {
  PreviewComment,
  usePreviewComments,
} from '@gitroom/frontend/components/preview/preview.comments.context';

const REVIEWER_NAME_KEY = 'preview-reviewer-name';

// Invisible reCAPTCHA v2: one widget for the page. Google only shows a puzzle
// when it considers the visitor risky; otherwise the token comes back at once.
// Google does not report a dismissed puzzle, so an attempt stays pending until
// it gets a token, expires, errors, or the reviewer clicks Post again (which
// abandons the previous attempt with null).
let recaptchaWidget: {
  id: number;
  resolve?: (token: string | null) => void;
} | null = null;

const loadRecaptchaToken = async (siteKey: string) => {
  if (!(window as any).grecaptcha?.render) {
    await new Promise<void>((resolve, reject) => {
      (window as any).onPreviewRecaptchaLoad = () => resolve();
      const script = document.createElement('script');
      script.src =
        'https://www.google.com/recaptcha/api.js?onload=onPreviewRecaptchaLoad&render=explicit';
      script.async = true;
      script.onerror = () => reject(new Error('recaptcha failed to load'));
      document.head.appendChild(script);
    });
  }
  const grecaptcha = (window as any).grecaptcha;
  if (!recaptchaWidget) {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const widget: NonNullable<typeof recaptchaWidget> = { id: 0 };
    const settle = (token: string | null) => {
      const resolve = widget.resolve;
      widget.resolve = undefined;
      resolve?.(token);
    };
    widget.id = grecaptcha.render(container, {
      sitekey: siteKey,
      size: 'invisible',
      callback: (token: string) => settle(token),
      'expired-callback': () => settle(null),
      'error-callback': () => settle(null),
    });
    recaptchaWidget = widget;
  }
  const widget = recaptchaWidget;
  widget.resolve?.(null);
  grecaptcha.reset(widget.id);
  return new Promise<string | null>((resolve) => {
    widget.resolve = resolve;
    grecaptcha.execute(widget.id);
  });
};

const ReviewerNameForm: FC<{ onConfirm: (name: string) => void }> = ({
  onConfirm,
}) => {
  const t = useT();
  const form = useForm({
    values: {
      name:
        (typeof window !== 'undefined' &&
          localStorage.getItem(REVIEWER_NAME_KEY)) ||
        '',
    },
    mode: 'onChange',
  });
  const submit = useCallback(
    (values: { name: string }) => {
      const name = values.name.trim();
      if (!name) {
        return;
      }
      localStorage.setItem(REVIEWER_NAME_KEY, name);
      onConfirm(name);
    },
    [onConfirm]
  );

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(submit)}>
        <div className="relative flex gap-[10px] flex-col flex-1">
          <div className="text-[14px] text-textItemBlur">
            {t(
              'preview_comment_name_required',
              'We can only post your comment if you provide your name.'
            )}
          </div>
          <Input
            label={t('preview_comment_your_name', 'Your name')}
            placeholder={t('preview_comment_your_name', 'Your name')}
            name="name"
            maxLength={80}
            autoFocus={true}
          />
          <Button type="submit">{t('continue', 'Continue')}</Button>
        </div>
      </form>
    </FormProvider>
  );
};

const CommentComposer: FC<{
  parentId?: string;
  onDone?: () => void;
}> = ({ parentId, onDone }) => {
  const t = useT();
  const user = useUser();
  const fetch = useFetch();
  const toast = useToaster();
  const modals = useModals();
  const { recaptchaSiteKey } = useVariables();
  const { previewId, pending, setPending, mutate } = usePreviewComments();
  const [loading, setLoading] = useState(false);
  const form = useForm({ values: { content: '' } });
  const anchor = parentId ? null : pending;

  const askForName = useCallback(
    () =>
      new Promise<string | null>((resolve) => {
        modals.openModal({
          classNames: {
            modal: 'bg-transparent text-textColor',
          },
          title: t('preview_comment_your_name', 'Your name'),
          withCloseButton: true,
          onClose: () => resolve(null),
          children: (close) => (
            <ReviewerNameForm
              onConfirm={(name) => {
                resolve(name);
                close();
              }}
            />
          ),
        });
      }),
    [t]
  );

  const submit = useCallback(
    async (values: { content: string }) => {
      const content = values.content.trim();
      if (!content) {
        return;
      }

      let displayName: string | undefined;
      let recaptchaToken: string | undefined;
      if (!user?.id) {
        const name = await askForName();
        if (!name) {
          return;
        }
        displayName = name;

        if (recaptchaSiteKey) {
          const token = await loadRecaptchaToken(recaptchaSiteKey).catch(() => {
            toast.show(
              t('preview_comment_failed', 'Could not post the comment'),
              'warning'
            );
            return null;
          });
          if (!token) {
            return;
          }
          recaptchaToken = token;
        }
      }

      setLoading(true);
      try {
        const response = await fetch(
          user?.id
            ? `/posts/${previewId}/comments`
            : `/public/posts/${previewId}/comments`,
          {
            method: 'POST',
            body: JSON.stringify({
              content,
              ...(parentId ? { parentId } : {}),
              ...(anchor
                ? {
                    postId: anchor.postId,
                    anchorStart: anchor.start,
                    anchorEnd: anchor.end,
                    anchorQuote: anchor.quote,
                  }
                : {}),
              ...(displayName ? { displayName } : {}),
              ...(recaptchaToken ? { recaptchaToken } : {}),
            }),
          }
        );

        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          toast.show(
            body?.message ||
              t('preview_comment_failed', 'Could not post the comment'),
            'warning'
          );
          return;
        }

        form.reset({ content: '' });
        if (anchor) {
          setPending(null);
        }
        await mutate();
        onDone?.();
      } finally {
        setLoading(false);
      }
    },
    [user?.id, recaptchaSiteKey, previewId, parentId, anchor, askForName]
  );

  return (
    <FormProvider {...form}>
      <form
        className="flex flex-col gap-[8px]"
        onSubmit={form.handleSubmit(submit)}
      >
        {!!anchor && (
          <div className="flex items-start gap-[8px] border-s-[3px] border-btnPrimary ps-[8px] text-[12px] text-textItemBlur">
            <div className="flex-1 italic truncate">{anchor.quote}</div>
            <button
              type="button"
              className="hover:text-newTextColor"
              onClick={() => setPending(null)}
              aria-label={t('cancel', 'Cancel')}
            >
              ✕
            </button>
          </div>
        )}
        <Textarea
          label={
            parentId ? t('reply', 'Reply') : t('add_a_comment', 'Add a comment')
          }
          name="content"
          className="!min-h-[90px] resize-none"
          placeholder={
            parentId
              ? t('write_a_reply', 'Write a reply...')
              : t('add_a_comment_placeholder', 'Add a comment...')
          }
          maxLength={2000}
        />
        <div className="flex items-center justify-end gap-[10px] -mt-[14px]">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width={16}
            height={16}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-textItemBlur cursor-help"
            data-tooltip-id="tooltip"
            data-tooltip-content={t(
              'preview_comment_detach_hint',
              'Comments on selected text lose their highlight if the text is edited later.'
            )}
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4" />
            <path d="M12 8h.01" />
          </svg>
          {!!onDone && (
            <Button type="button" secondary={true} onClick={onDone}>
              {t('cancel', 'Cancel')}
            </Button>
          )}
          <Button type="submit" loading={loading}>
            {parentId ? t('reply', 'Reply') : t('post', 'Post')}
          </Button>
        </div>
      </form>
    </FormProvider>
  );
};

const CommentBody: FC<{ comment: PreviewComment }> = ({ comment }) => {
  const t = useT();
  return (
    <div className="flex flex-col gap-[4px]">
      <div className="text-[14px] whitespace-pre-wrap break-words">
        {comment.content}
      </div>
      <div className="text-[12px] text-textItemBlur">
        {comment.name || t('reviewer', 'Reviewer')} ·{' '}
        {dayjs(comment.createdAt).format('MMM D, YYYY HH:mm')}
      </div>
    </div>
  );
};

const ThreadCard: FC<{
  comment: PreviewComment;
  replies: PreviewComment[];
  canResolve: boolean;
}> = ({ comment, replies, canResolve }) => {
  const t = useT();
  const fetch = useFetch();
  const toast = useToaster();
  const ref = useRef<HTMLDivElement>(null);
  const [replying, setReplying] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [flash, setFlash] = useState(false);
  const {
    mutate,
    activeThread,
    setActiveThread,
    hoveredThread,
    setHoveredThread,
  } = usePreviewComments();
  const resolved = !!comment.resolvedAt;
  const anchored = comment.anchorStart !== null && comment.anchorEnd !== null;

  useEffect(() => {
    if (activeThread?.id !== comment.id || activeThread.source !== 'mark') {
      return;
    }
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setFlash(true);
    const timer = setTimeout(() => setFlash(false), 1500);
    return () => clearTimeout(timer);
  }, [activeThread, comment.id]);

  const toggleResolved = useCallback(async () => {
    const response = await fetch(`/posts/comments/${comment.id}/resolve`, {
      method: 'PUT',
      body: JSON.stringify({ resolved: !resolved }),
    });
    if (!response.ok) {
      toast.show(
        t('preview_comment_failed', 'Could not post the comment'),
        'warning'
      );
      return;
    }
    mutate();
  }, [comment.id, resolved]);

  return (
    <div
      ref={ref}
      onMouseEnter={() => !resolved && setHoveredThread(comment.id)}
      onMouseLeave={() => setHoveredThread(null)}
      className={clsx(
        'flex flex-col gap-[8px] rounded-[8px] border p-[12px] transition-colors',
        resolved && 'opacity-50',
        flash || hoveredThread === comment.id || activeThread?.id === comment.id
          ? 'border-btnPrimary'
          : 'border-newTableBorder'
      )}
    >
      <div className="flex items-center gap-[6px] flex-wrap">
        {resolved && (
          <div className="text-[11px] rounded-[4px] px-[6px] py-[2px] bg-btnSimple">
            {t('resolved', 'Resolved')}
          </div>
        )}
        {!!comment.anchorQuote && !anchored && !resolved && (
          <div className="text-[11px] rounded-[4px] px-[6px] py-[2px] bg-btnSimple">
            {t('preview_comment_text_changed', 'Text changed')}
          </div>
        )}
      </div>
      {!!comment.anchorQuote && (
        <div
          className={clsx(
            'border-s-[3px] border-btnPrimary ps-[8px] text-[12px] italic text-textItemBlur truncate',
            anchored && !resolved && 'cursor-pointer hover:text-newTextColor'
          )}
          onClick={() =>
            anchored &&
            !resolved &&
            setActiveThread({ id: comment.id, source: 'card' })
          }
        >
          {comment.anchorQuote}
        </div>
      )}
      {resolved && !expanded ? (
        <div
          className="text-[14px] truncate cursor-pointer"
          onClick={() => setExpanded(true)}
        >
          {comment.content}
        </div>
      ) : (
        <CommentBody comment={comment} />
      )}
      {(!resolved || expanded) && !!replies.length && (
        <div className="flex flex-col gap-[8px] ps-[12px] border-s border-newTableBorder">
          {replies.map((reply) => (
            <CommentBody key={reply.id} comment={reply} />
          ))}
        </div>
      )}
      {(!resolved || expanded) && (
        <div className="flex gap-[12px] text-[12px]">
          {!resolved && (
            <button
              type="button"
              className="text-textItemBlur hover:text-newTextColor"
              onClick={() => setReplying(!replying)}
            >
              {t('reply', 'Reply')}
            </button>
          )}
          {canResolve && (
            <button
              type="button"
              className="text-textItemBlur hover:text-newTextColor"
              onClick={toggleResolved}
            >
              {resolved ? t('reopen', 'Reopen') : t('resolve', 'Resolve')}
            </button>
          )}
          {resolved && (
            <button
              type="button"
              className="text-textItemBlur hover:text-newTextColor"
              onClick={() => setExpanded(false)}
            >
              {t('collapse', 'Collapse')}
            </button>
          )}
        </div>
      )}
      {replying && !resolved && (
        <CommentComposer
          parentId={comment.id}
          onDone={() => setReplying(false)}
        />
      )}
    </div>
  );
};

export const CommentsComponents: FC<{ previewId: string }> = () => {
  const t = useT();
  const user = useUser();
  const { comments, isLoading, postIds, organizationId } = usePreviewComments();
  const canResolve = !!user?.id && user?.orgId === organizationId;

  const threads = useMemo(() => {
    const replies = comments.reduce((all, current) => {
      if (current.parentId) {
        all[current.parentId] = [...(all[current.parentId] || []), current];
      }
      return all;
    }, {} as Record<string, PreviewComment[]>);

    const rank = (c: PreviewComment) => {
      if (c.resolvedAt) {
        return [2, 0, dayjs(c.createdAt).valueOf()];
      }
      if (c.anchorStart !== null && c.anchorEnd !== null) {
        return [0, postIds.indexOf(c.postId), c.anchorStart];
      }
      return [1, 0, dayjs(c.createdAt).valueOf()];
    };

    return comments
      .filter((c) => !c.parentId)
      .sort((a, b) => {
        const ra = rank(a);
        const rb = rank(b);
        return ra[0] - rb[0] || ra[1] - rb[1] || ra[2] - rb[2];
      })
      .map((comment) => ({ comment, replies: replies[comment.id] || [] }));
  }, [comments, postIds]);

  return (
    <div className="flex flex-col gap-[16px]">
      <div className="text-[18px] font-[600]">{t('comments', 'Comments')}</div>
      <CommentComposer />
      {!isLoading && !threads.length && (
        <div className="text-[13px] text-textItemBlur">
          {t(
            'preview_no_comments_yet',
            'No comments yet. Select some text in the post to comment on it, or add a general comment.'
          )}
        </div>
      )}
      <div className="flex flex-col gap-[10px]">
        {threads.map(({ comment, replies }) => (
          <ThreadCard
            key={comment.id}
            comment={comment}
            replies={replies}
            canResolve={canResolve}
          />
        ))}
      </div>
    </div>
  );
};
