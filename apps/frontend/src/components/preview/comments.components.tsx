'use client';

import { useUser } from '@gitroom/frontend/components/layout/user.context';
import { Button } from '@gitroom/react/form/button';
import { FC, useCallback, useMemo, useState } from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import useSWR from 'swr';
import { FieldValues, SubmitHandler, useForm } from 'react-hook-form';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
export const RenderComponents: FC<{
  postId: string;
}> = (props) => {
  const { postId } = props;
  const fetch = useFetch();
  const comments = useCallback(async () => {
    return (await fetch(`/public/posts/${postId}/comments`)).json();
  }, [postId]);
  const { data, mutate, isLoading } = useSWR('comments', comments);
  const mapUsers = useMemo(() => {
    return (data?.comments || []).reduce(
      (all: any, current: any) => {
        all.users[current.userId] = all.users[current.userId] || all.counter++;
        return all;
      },
      {
        users: {},
        counter: 1,
      }
    ).users;
  }, [data]);
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

  const t = useT();

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
          <div
            key={comment.id}
            className="flex space-x-3 border-t border-tableBorder py-3"
          >
            <div className="flex-1 space-y-1">
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-semibold">
                  {t('user', 'User')}
                  {mapUsers[comment.userId]}
                </h3>
              </div>
              <p className="text-sm text-gray-300">{comment.content}</p>
            </div>
          </div>
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
