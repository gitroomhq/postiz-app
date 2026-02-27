'use client';

import { useUser } from '@gitroom/frontend/components/layout/user.context';
import { Button } from '@gitroom/react/form/button';
import { FC, useCallback } from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import useSWR from 'swr';
import { FieldValues, SubmitHandler, useForm } from 'react-hook-form';
import { useT } from '@gitroom/react/translation/get.transation.service.client';

function getCommentAuthor(comment: any, fallback: string) {
  const firstName = comment?.user?.name?.trim?.() || '';
  const lastName = comment?.user?.lastName?.trim?.() || '';
  const fullName = `${firstName} ${lastName}`.trim();
  if (fullName) {
    return fullName;
  }
  return comment?.user?.email || fallback;
}

function getExternalReviewerName(content: string) {
  if (!content?.startsWith('[External Review]')) {
    return '';
  }
  const byMatch = content.match(/\bby\s+([^:]+?)(?::|$)/i);
  if (!byMatch?.[1]) {
    return '';
  }
  return byMatch[1].trim();
}

function parseExternalReviewMeta(content: string) {
  if (!content?.startsWith('[External Review]')) {
    return null;
  }

  const approved = /\bapproved\b/i.test(content);
  const rejected = /\brejected\b/i.test(content);
  const expired = /\bexpired\b/i.test(content);
  const decision = approved
    ? 'APPROVED'
    : rejected
    ? 'REJECTED'
    : expired
    ? 'EXPIRED'
    : 'UPDATED';

  const reviewer = getExternalReviewerName(content);
  const feedbackMatch = content.match(/:\s*(.+)$/);
  const feedback =
    rejected && feedbackMatch?.[1] ? feedbackMatch[1].trim() : '';

  return {
    decision,
    reviewer,
    feedback,
  };
}

function decisionBadgeClass(decision: string) {
  if (decision === 'APPROVED') {
    return 'bg-green-900/40 text-green-300 border border-green-700/60';
  }
  if (decision === 'REJECTED') {
    return 'bg-red-900/40 text-red-300 border border-red-700/60';
  }
  if (decision === 'EXPIRED') {
    return 'bg-gray-700/40 text-gray-300 border border-gray-600';
  }
  return 'bg-blue-900/30 text-blue-300 border border-blue-700/60';
}

export const RenderComponents: FC<{
  postId: string;
}> = (props) => {
  const { postId } = props;
  const fetch = useFetch();
  const t = useT();
  const comments = useCallback(async () => {
    return (await fetch(`/public/posts/${postId}/comments`)).json();
  }, [postId]);
  const { data, mutate, isLoading } = useSWR(['comments', postId], comments);
  const { handleSubmit, register, setValue } = useForm();
  const submit: SubmitHandler<FieldValues> = useCallback(
    async (e) => {
      setValue('comment', '');
      await fetch(`/posts/${postId}/comments`, {
        method: 'POST',
        body: JSON.stringify(e),
      });
      mutate();
    },
    [postId, mutate]
  );

  if (isLoading) {
    return <></>;
  }
  return (
    <>
      <div className="mb-6 flex space-x-3">
        <form className="flex-1 space-y-2" onSubmit={handleSubmit(submit)}>
          <textarea
            {...register('comment', {
              required: true,
            })}
            className="flex w-full px-3 py-2 h-[98px] text-sm ring-offset-background placeholder:text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 min-h-[80px] resize-none text-white bg-third border border-tableBorder placeholder-gray-500 focus:ring-0"
            placeholder="Add a comment..."
            defaultValue={''}
          />
          <div className="flex justify-end">
            <Button type="submit">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width={24}
                height={24}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="lucide lucide-send me-2 h-4 w-4"
              >
                <path d="m22 2-7 20-4-9-9-4Z" />
                <path d="M22 2 11 13" />
              </svg>
              {t('post', 'Post')}
            </Button>
          </div>
        </form>
      </div>
      <div className="space-y-4">
        {!!data.comments.length && (
          <h3 className="text-lg font-semibold">{t('comments', 'Comments')}</h3>
        )}
        {data.comments.map((comment: any) => (
          (() => {
            const externalMeta = parseExternalReviewMeta(comment.content);
            return (
          <div
            key={comment.id}
            className={`flex space-x-3 border-t py-3 ${
              externalMeta?.decision === 'APPROVED'
                ? 'border-green-800/40 bg-green-900/10 rounded-[8px] px-3'
                : externalMeta?.decision === 'REJECTED'
                ? 'border-red-800/40 bg-red-900/10 rounded-[8px] px-3'
                : 'border-tableBorder'
            }`}
          >
            <div className="flex-1 space-y-1">
              {externalMeta ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${decisionBadgeClass(
                        externalMeta.decision
                      )}`}
                    >
                      {externalMeta.decision}
                    </span>
                    <h3 className="text-sm font-semibold">
                      {externalMeta.reviewer ||
                        t('external_reviewer', 'External Reviewer')}
                    </h3>
                  </div>
                  <div className="text-[12px] text-gray-400 space-y-1">
                    <div>
                      <span className="font-semibold text-gray-300">Decision by:</span>{' '}
                      {externalMeta.reviewer ||
                        t('external_reviewer', 'External Reviewer')}
                    </div>
                    <div>
                      <span className="font-semibold text-gray-300">Date:</span>{' '}
                      {new Date(comment.createdAt).toLocaleString()}
                    </div>
                    {!!externalMeta.feedback && (
                      <div>
                        <span className="font-semibold text-gray-300">Feedback:</span>{' '}
                        {externalMeta.feedback}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <h3 className="text-sm font-semibold">
                    {getCommentAuthor(comment, t('user', 'User'))}
                  </h3>
                </div>
              )}
              <p className="text-sm text-gray-300">{comment.content}</p>
            </div>
          </div>
            );
          })()
        ))}
      </div>
    </>
  );
};
export const CommentsComponents: FC<{
  postId: string;
}> = (props) => {
  const user = useUser();
  const t = useT();

  const { postId } = props;
  const goToComments = useCallback(() => {
    window.location.href = `/auth?returnUrl=${window.location.href}`;
  }, []);
  if (!user?.id) {
    return (
      <Button onClick={goToComments}>
        {t(
          'login_register_to_add_comments',
          'Login / Register to add comments'
        )}
      </Button>
    );
  }
  return <RenderComponents postId={postId} />;
};
