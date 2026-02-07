import React, { useMemo } from 'react';
import dayjs from 'dayjs';
import { cn, truncate, formatDateTime } from '@/lib/utils';
import { PostDto } from '@ai-poster/shared';
import { STATUS_DOT_COLORS, PLATFORM_DISPLAY_NAMES, PLATFORM_ICON_COLORS } from '@/lib/constants';
import CalendarSlot from './CalendarSlot';

export interface CalendarDayProps {
  currentDate: Date;
  posts: PostDto[];
  onSelectPost: (post: PostDto) => void;
  onCreatePost: (date: Date) => void;
  onDropPost: (post: PostDto, newDate: Date) => void;
  timezone?: string;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);

function formatHour(hour: number): string {
  if (hour === 0) return '12 AM';
  if (hour < 12) return `${hour} AM`;
  if (hour === 12) return '12 PM';
  return `${hour - 12} PM`;
}

function FullPostCard({
  post,
  onClick,
}: {
  post: PostDto;
  onClick: (post: PostDto) => void;
}) {
  const dotColor = STATUS_DOT_COLORS[post.state] || 'bg-gray-400';
  const platformKey = post.platformSettings?.platform as string | undefined;
  const platformName = platformKey
    ? PLATFORM_DISPLAY_NAMES[platformKey as keyof typeof PLATFORM_DISPLAY_NAMES]
    : undefined;
  const platformColor = platformKey
    ? PLATFORM_ICON_COLORS[platformKey as keyof typeof PLATFORM_ICON_COLORS]
    : undefined;

  return (
    <div
      className={cn(
        'p-3 rounded-lg border border-surface-tertiary bg-surface-primary',
        'cursor-pointer hover:shadow-md transition-shadow mb-1'
      )}
      onClick={() => onClick(post)}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {platformName && (
            <div className="flex items-center gap-1.5">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: platformColor }}
              />
              <span className="text-xs font-medium text-text-secondary">
                {platformName}
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <span className={cn('w-2 h-2 rounded-full', dotColor)} />
          <span className="text-xs text-text-muted capitalize">
            {post.state.toLowerCase().replace(/_/g, ' ')}
          </span>
        </div>
      </div>

      <p className="text-sm text-text-primary leading-relaxed mb-2">
        {truncate(post.plainText || post.content, 200)}
      </p>

      {post.media && post.media.length > 0 && (
        <div className="flex gap-1.5 mt-2">
          {post.media.slice(0, 4).map((m) => (
            <div
              key={m.id}
              className="w-12 h-12 rounded bg-surface-tertiary overflow-hidden flex-shrink-0"
            >
              {m.type.startsWith('image') ? (
                <img
                  src={m.path}
                  alt={m.altText || ''}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[10px] text-text-muted">
                  Video
                </div>
              )}
            </div>
          ))}
          {post.media.length > 4 && (
            <div className="w-12 h-12 rounded bg-surface-tertiary flex items-center justify-center text-xs text-text-muted">
              +{post.media.length - 4}
            </div>
          )}
        </div>
      )}

      {post.publishDate && (
        <p className="text-[10px] text-text-muted mt-2">
          {formatDateTime(post.publishDate)}
        </p>
      )}
    </div>
  );
}

export default function CalendarDay({
  currentDate,
  posts,
  onSelectPost,
  onCreatePost,
  onDropPost,
}: CalendarDayProps) {
  const current = dayjs(currentDate);
  const today = dayjs();
  const isToday = current.format('YYYY-MM-DD') === today.format('YYYY-MM-DD');

  const postsByHour = useMemo(() => {
    const map: Record<number, PostDto[]> = {};
    posts.forEach((post) => {
      if (!post.publishDate) return;
      const d = dayjs(post.publishDate);
      if (d.format('YYYY-MM-DD') !== current.format('YYYY-MM-DD')) return;
      const hour = d.hour();
      if (!map[hour]) map[hour] = [];
      map[hour].push(post);
    });
    return map;
  }, [posts, current.toString()]);

  return (
    <div className="w-full">
      {/* Day header */}
      <div
        className={cn(
          'p-4 border-b border-surface-tertiary text-center',
          isToday && 'bg-brand-50'
        )}
      >
        <div className="text-sm text-text-muted uppercase">
          {current.format('dddd')}
        </div>
        <div
          className={cn(
            'text-2xl font-bold',
            isToday ? 'text-brand-600' : 'text-text-primary'
          )}
        >
          {current.format('MMMM D, YYYY')}
        </div>
      </div>

      {/* Hourly breakdown */}
      <div className="grid grid-cols-[5rem_1fr]">
        {HOURS.map((hour) => {
          const hourPosts = postsByHour[hour] || [];
          const currentHour = today.hour();
          const isCurrentHour = isToday && hour === currentHour;

          return (
            <React.Fragment key={hour}>
              {/* Time label */}
              <div
                className={cn(
                  'text-xs text-right pr-3 py-2 border-b border-r border-surface-tertiary',
                  isCurrentHour ? 'text-brand-600 font-semibold' : 'text-text-muted'
                )}
              >
                {formatHour(hour)}
              </div>

              {/* Content area */}
              <CalendarSlot
                date={currentDate}
                hour={hour}
                posts={hourPosts}
                onDropPost={onDropPost}
                onCreatePost={onCreatePost}
                onSelectPost={onSelectPost}
                className={cn(isCurrentHour && 'bg-brand-50/30')}
                renderPost={(post) => (
                  <FullPostCard post={post} onClick={onSelectPost} />
                )}
              />
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
