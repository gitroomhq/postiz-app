'use client';

import useSWR from 'swr';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { orderBy } from 'lodash';
import clsx from 'clsx';
import ImageWithFallback from '@gitroom/react/helpers/image.with.fallback';
import SafeImage from '@gitroom/react/helpers/safe.image';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { Button } from '@gitroom/react/form/button';
import { useRouter } from 'next/navigation';
import useCookie from 'react-use-cookie';
import { SVGLine } from '@gitroom/frontend/components/launches/launches.component';
import { LoadingComponent } from '@gitroom/frontend/components/layout/loading';

const allowedIntegrations = ['facebook', 'instagram', 'instagram-standalone'];

type IntegrationItem = {
  id: string;
  name: string;
  identifier: string;
  picture: string;
  disabled: boolean;
  inBetweenSteps: boolean;
  refreshNeeded: boolean;
};

type CommentPost = {
  id: string;
  content: string;
  publishDate: string;
  releaseURL?: string;
  releaseId?: string;
  commentCount?: number;
  integration?: {
    id: string;
    providerIdentifier: string;
    name: string;
    picture?: string;
  };
};

type PostsResponse = {
  posts: CommentPost[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
};

type SocialComment = {
  id: string;
  text: string;
  username?: string;
  timestamp?: string;
  likeCount?: number;
  hidden?: boolean;
  replies?: SocialComment[];
};

type CommentsResponse = {
  post?: CommentPost;
  comments: SocialComment[];
  next?: string;
};

const stripHtml = (value = '') =>
  value
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const shortText = (value: string, max = 150) => {
  const clean = stripHtml(value);
  return clean.length > max ? `${clean.slice(0, max).trim()}...` : clean;
};

const formatDate = (value?: string) => {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
};

const CommentThread = ({
  comment,
  depth = 0,
}: {
  comment: SocialComment;
  depth?: number;
}) => {
  return (
    <div
      className={clsx(
        'rounded-[8px] border border-tableBorder bg-newBgColor p-[14px]',
        depth > 0 && 'ms-[22px] mt-[10px]'
      )}
    >
      <div className="flex items-start gap-[10px]">
        <div className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-third text-[13px] font-[600]">
          {(comment.username || '?').slice(0, 1).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-[10px] gap-y-[4px]">
            <div className="max-w-full truncate text-[14px] font-[600]">
              {comment.username || 'Unknown'}
            </div>
            {!!comment.timestamp && (
              <div className="text-[12px] text-textColor/60">
                {formatDate(comment.timestamp)}
              </div>
            )}
            {comment.hidden && (
              <div className="rounded-[4px] bg-red-500/20 px-[6px] py-[2px] text-[11px] text-red-300">
                Hidden
              </div>
            )}
          </div>
          <div className="mt-[8px] whitespace-pre-wrap break-words text-[14px] leading-[20px]">
            {comment.text || '-'}
          </div>
          {typeof comment.likeCount === 'number' && (
            <div className="mt-[8px] text-[12px] text-textColor/60">
              {comment.likeCount} likes
            </div>
          )}
        </div>
      </div>
      {!!comment.replies?.length && (
        <div className="mt-[10px] flex flex-col gap-[10px]">
          {comment.replies.map((reply) => (
            <CommentThread key={reply.id} comment={reply} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
};

export const SocialComments = () => {
  const fetch = useFetch();
  const t = useT();
  const router = useRouter();
  const [currentIntegrationId, setCurrentIntegrationId] = useState('');
  const [selectedPostId, setSelectedPostId] = useState('');
  const [comments, setComments] = useState<SocialComment[]>([]);
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const [loadingMore, setLoadingMore] = useState(false);
  const [collapseMenu, setCollapseMenu] = useCookie('collapseMenu', '0');

  const loadIntegrations = useCallback(async () => {
    const response = await (await fetch('/integrations/list')).json();
    return (response.integrations || []).filter((integration: IntegrationItem) =>
      allowedIntegrations.includes(integration.identifier)
    );
  }, [fetch]);

  const { data: integrations = [], isLoading: integrationsLoading } = useSWR<
    IntegrationItem[]
  >('social-comments-integrations', loadIntegrations, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    revalidateIfStale: false,
    revalidateOnMount: true,
    refreshWhenHidden: false,
    refreshWhenOffline: false,
    fallbackData: [],
  });

  const sortedIntegrations = useMemo(
    () =>
      orderBy(
        integrations,
        ['disabled', 'refreshNeeded', 'identifier', 'name'],
        ['asc', 'asc', 'asc', 'asc']
      ),
    [integrations]
  );

  const currentIntegration = useMemo(() => {
    return (
      sortedIntegrations.find(
        (integration) => integration.id === currentIntegrationId
      ) || sortedIntegrations[0]
    );
  }, [currentIntegrationId, sortedIntegrations]);

  useEffect(() => {
    setSelectedPostId('');
  }, [currentIntegration?.id]);

  const loadPosts = useCallback(async () => {
    if (!currentIntegration) {
      return { posts: [], total: 0, page: 0, limit: 100, hasMore: false };
    }

    return (await (
      await fetch(
        `/integrations/comments/${currentIntegration.id}/posts?limit=100`
      )
    ).json()) as PostsResponse;
  }, [currentIntegration?.id, fetch]);

  const {
    data: postsData,
    error: postsError,
    isLoading: postsLoading,
  } = useSWR<PostsResponse>(
    currentIntegration ? `social-comments-posts-${currentIntegration.id}` : null,
    loadPosts,
    {
      revalidateOnFocus: false,
      fallbackData: { posts: [], total: 0, page: 0, limit: 100, hasMore: false },
    }
  );

  const currentPost = useMemo(() => {
    return (
      postsData?.posts.find((post) => post.id === selectedPostId) ||
      postsData?.posts[0]
    );
  }, [postsData?.posts, selectedPostId]);

  useEffect(() => {
    if (currentPost && currentPost.id !== selectedPostId) {
      setSelectedPostId(currentPost.id);
    }
  }, [currentPost?.id, selectedPostId]);

  const loadComments = useCallback(async () => {
    if (!currentIntegration || !currentPost) {
      return { comments: [] };
    }

    return (await (
      await fetch(
        `/integrations/comments/${currentIntegration.id}/posts/${currentPost.id}`
      )
    ).json()) as CommentsResponse;
  }, [currentIntegration?.id, currentPost?.id, fetch]);

  const {
    data: commentsData,
    error: commentsError,
    isLoading: commentsLoading,
  } = useSWR<CommentsResponse>(
    currentIntegration && currentPost
      ? `social-comments-${currentIntegration.id}-${currentPost.id}`
      : null,
    loadComments,
    {
      revalidateOnFocus: false,
      fallbackData: { comments: [] },
    }
  );

  useEffect(() => {
    setComments(commentsData?.comments || []);
    setNextCursor(commentsData?.next);
  }, [commentsData]);

  const loadMoreComments = useCallback(async () => {
    if (!currentIntegration || !currentPost || !nextCursor) {
      return;
    }

    setLoadingMore(true);
    try {
      const response = (await (
        await fetch(
          `/integrations/comments/${currentIntegration.id}/posts/${
            currentPost.id
          }?after=${encodeURIComponent(nextCursor)}`
        )
      ).json()) as CommentsResponse;
      setComments((current) => [...current, ...(response.comments || [])]);
      setNextCursor(response.next);
    } finally {
      setLoadingMore(false);
    }
  }, [currentIntegration?.id, currentPost?.id, fetch, nextCursor]);

  if (integrationsLoading) {
    return (
      <div className="flex flex-1 items-center justify-center bg-newBgColorInner p-[20px]">
        <LoadingComponent />
      </div>
    );
  }

  if (!sortedIntegrations.length) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-[15px] bg-newBgColorInner p-[20px] text-center">
        <img src="/peoplemarketplace.svg" alt="" />
        <div className="text-[36px] font-[500]">
          {t('no_comment_channels', 'No comment channels yet')}
        </div>
        <div className="text-[16px] text-textColor/70">
          {t(
            'connect_facebook_or_instagram',
            'Connect Facebook or Instagram to browse comments.'
          )}
        </div>
        <Button onClick={() => router.push('/third-party')}>
          {t('connect_channel', 'Connect channel')}
        </Button>
      </div>
    );
  }

  return (
    <>
      <div
        className={clsx(
          'flex flex-col gap-[15px] bg-newBgColorInner p-[20px] transition-all',
          collapseMenu === '1' ? 'group sidebar w-[100px]' : 'w-[260px]'
        )}
      >
        <div className="flex gap-[12px] flex-col">
          <div className="flex items-center">
            <h2 className="group-[.sidebar]:hidden flex-1 text-[20px] font-[500]">
              {t('channels', 'Channels')}
            </h2>
            <div
              onClick={() => setCollapseMenu(collapseMenu === '1' ? '0' : '1')}
              className="group-[.sidebar]:rotate-[180deg] group-[.sidebar]:mx-auto text-btnText bg-btnSimple rounded-[6px] w-[24px] h-[24px] flex items-center justify-center cursor-pointer select-none"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="7"
                height="13"
                viewBox="0 0 7 13"
                fill="none"
              >
                <path
                  d="M6 11.5L1 6.5L6 1.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>
          {sortedIntegrations.map((integration) => (
            <div
              key={integration.id}
              onClick={() => {
                if (integration.disabled || integration.refreshNeeded) {
                  return;
                }
                setCurrentIntegrationId(integration.id);
              }}
              className={clsx(
                'flex gap-[12px] items-center group/profile justify-center hover:bg-boxHover rounded-e-[8px]',
                currentIntegration?.id !== integration.id &&
                  'opacity-20 hover:opacity-100 cursor-pointer',
                (integration.disabled || integration.refreshNeeded) &&
                  'cursor-not-allowed opacity-40'
              )}
            >
              <div className="relative rounded-full flex justify-center items-center gap-[6px]">
                {(integration.inBetweenSteps || integration.refreshNeeded) && (
                  <div className="absolute start-0 top-0 w-[39px] h-[46px] cursor-pointer">
                    <div className="bg-red-500 w-[15px] h-[15px] rounded-full start-0 -top-[5px] absolute z-[200] text-[10px] flex justify-center items-center">
                      !
                    </div>
                    <div className="bg-primary/60 w-[39px] h-[46px] start-0 top-0 absolute rounded-full z-[199]" />
                  </div>
                )}
                <div className="h-full w-[4px] -ms-[12px] rounded-s-[3px] opacity-0 group-hover/profile:opacity-100 transition-opacity">
                  <SVGLine />
                </div>
                <ImageWithFallback
                  fallbackSrc={`/icons/platforms/${integration.identifier}.png`}
                  src={integration.picture}
                  className="rounded-[8px]"
                  alt={integration.identifier}
                  width={36}
                  height={36}
                />
                <SafeImage
                  src={`/icons/platforms/${integration.identifier}.png`}
                  className="rounded-[8px] absolute z-10 bottom-[5px] -end-[5px] border border-fifth"
                  alt={integration.identifier}
                  width={18.41}
                  height={18.41}
                />
              </div>
              <div className="flex-1 whitespace-nowrap text-ellipsis overflow-hidden group-[.sidebar]:hidden">
                {integration.name}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-[16px] bg-newBgColorInner p-[20px] xl:grid xl:grid-cols-[minmax(280px,360px)_1fr]">
        <div className="flex min-h-0 flex-col rounded-[8px] border border-tableBorder bg-newBgColor p-[16px]">
          <div className="mb-[14px] flex items-center justify-between gap-[12px]">
            <div className="min-w-0">
              <div className="text-[20px] font-[600]">
                {t('posts', 'Posts')}
              </div>
              <div className="truncate text-[13px] text-textColor/60">
                {currentIntegration?.name}
              </div>
            </div>
            <div className="text-[13px] text-textColor/60">
              {postsData?.total || 0}
            </div>
          </div>
          {postsLoading && (
            <div className="flex flex-1 items-center justify-center">
              <LoadingComponent />
            </div>
          )}
          {!!postsError && (
            <div className="rounded-[8px] bg-red-500/10 p-[12px] text-[14px] text-red-300">
              {t('could_not_load_posts', 'Could not load posts')}
            </div>
          )}
          {!postsLoading && !postsError && !postsData?.posts.length && (
            <div className="rounded-[8px] bg-third p-[14px] text-[14px] text-textColor/70">
              {t(
                'no_meta_posts_with_comments',
                'No Meta posts found yet.'
              )}
            </div>
          )}
          <div className="flex min-h-0 flex-1 flex-col gap-[10px] overflow-y-auto">
            {postsData?.posts.map((post) => (
              <button
                key={post.id}
                type="button"
                onClick={() => setSelectedPostId(post.id)}
                className={clsx(
                  'w-full rounded-[8px] border border-tableBorder bg-newBgColorInner p-[12px] text-left transition-colors hover:bg-boxHover',
                  currentPost?.id === post.id && 'border-forth bg-boxHover'
                )}
              >
                <div className="line-clamp-3 break-words text-[14px] leading-[20px]">
                  {shortText(post.content) || t('untitled_post', 'Untitled post')}
                </div>
                <div className="mt-[10px] flex flex-wrap items-center gap-[8px] text-[12px] text-textColor/60">
                  <span>{formatDate(post.publishDate)}</span>
                  {typeof post.commentCount === 'number' && (
                    <span>{post.commentCount} comments</span>
                  )}
                  {!!post.releaseURL && (
                    <a
                      href={post.releaseURL}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(event) => event.stopPropagation()}
                      className="text-forth hover:underline"
                    >
                      {t('open', 'Open')}
                    </a>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
        <div className="flex min-h-0 flex-col rounded-[8px] border border-tableBorder bg-newBgColor p-[16px]">
          <div className="mb-[14px] flex items-start justify-between gap-[12px]">
            <div className="min-w-0">
              <div className="text-[20px] font-[600]">
                {t('comments', 'Comments')}
              </div>
              <div className="line-clamp-2 text-[13px] text-textColor/60">
                {currentPost
                  ? shortText(currentPost.content, 220)
                  : t('select_a_post', 'Select a post')}
              </div>
            </div>
            {!!currentPost?.releaseURL && (
              <a
                href={currentPost.releaseURL}
                target="_blank"
                rel="noreferrer"
                className="shrink-0 text-[13px] text-forth hover:underline"
              >
                {t('open_post', 'Open post')}
              </a>
            )}
          </div>
          {commentsLoading && (
            <div className="flex flex-1 items-center justify-center">
              <LoadingComponent />
            </div>
          )}
          {!!commentsError && (
            <div className="rounded-[8px] bg-red-500/10 p-[12px] text-[14px] text-red-300">
              {t('could_not_load_comments', 'Could not load comments')}
            </div>
          )}
          {!commentsLoading &&
            !commentsError &&
            !!currentPost &&
            !comments.length && (
              <div className="rounded-[8px] bg-third p-[14px] text-[14px] text-textColor/70">
                {t('no_comments_yet', 'No comments yet.')}
              </div>
            )}
          <div className="flex min-h-0 flex-1 flex-col gap-[12px] overflow-y-auto">
            {comments.map((comment) => (
              <CommentThread key={comment.id} comment={comment} />
            ))}
          </div>
          {!!nextCursor && (
            <div className="mt-[14px] flex justify-center">
              <Button loading={loadingMore} onClick={loadMoreComments}>
                {t('load_more_comments', 'Load more comments')}
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};
