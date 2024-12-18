'use client';
import { useUser } from '@gitroom/frontend/components/layout/user.context';
import { Button } from '@gitroom/react/form/button';
import { useCallback } from 'react';

export const CommentsComponents = () => {
  const user = useUser();

  const goToComments = useCallback(() => {
    window.location.href = `/auth?returnUrl=${window.location.href}`;
  }, []);

  if (!user?.id) {
    return <Button onClick={goToComments}>Login to add comments</Button>
  }

  return (
    <>
      <div className="mb-6 flex space-x-3">
        <div className="flex-1 space-y-2">
          <textarea
            className="flex w-full rounded-md border border-input px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 min-h-[80px] resize-none bg-transparent text-white placeholder-gray-500 focus:ring-0"
            placeholder="What's happening?"
            defaultValue={''}
          />
          <div className="flex justify-end">
            <Button>
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
                className="lucide lucide-send mr-2 h-4 w-4"
              >
                <path d="m22 2-7 20-4-9-9-4Z" />
                <path d="M22 2 11 13" />
              </svg>
              Post
            </Button>
          </div>
        </div>
      </div>
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Comments</h3>
        <div className="flex space-x-3 border-t border-tableBorder py-3">
          <div className="flex-1 space-y-1">
            <div className="flex items-center space-x-2">
              <h3 className="text-sm font-semibold">Alice Smith</h3>
              <span className="text-xs text-gray-500">· 1h</span>
            </div>
            <p className="text-sm text-gray-300">
              Looks great! Congrats on the launch!
            </p>
          </div>
        </div>
      </div>
    </>
  );
};
