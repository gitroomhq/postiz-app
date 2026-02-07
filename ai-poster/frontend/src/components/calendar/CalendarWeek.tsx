import React, { useMemo } from 'react';
import dayjs from 'dayjs';
import { cn, truncate, formatDateTime } from '@/lib/utils';
import { PostDto } from '@ai-poster/shared';
import { STATUS_DOT_COLORS, PLATFORM_DISPLAY_NAMES } from '@/lib/constants';
import CalendarSlot from './CalendarSlot';

export interface CalendarWeekProps {
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

function PostPreviewCard({
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

  return (
    <div
      className={cn(
        'text-xs p-1.5 rounded border border-surface-tertiary bg-surface-primary',
        'cursor-pointer hover:shadow-sm transition-shadow mb-0.5'
      )}
      onClick={() => onClick(post)}
    >
      <div className="flex items-center gap-1 mb-0.5">
        <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', dotColor)} />
        {platformName && (
          <span className="font-medium text-text-secondary truncate">
            {platformName}
          </span>
        )}
      </div>
      <p className="text-text-primary truncate leading-snug">
        {truncate(post.plainText || post.content, 60)}
      </p>
    </div>
  );
}

export default function CalendarWeek({
  currentDate,
  posts,
  onSelectPost,
  onCreatePost,
  onDropPost,
}: CalendarWeekProps) {
  const current = dayjs(currentDate);
  const dayOfWeek = current.day() === 0 ? 6 : current.day() - 1; // Monday-based
  const weekStart = current.subtract(dayOfWeek, 'day');

  const days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => weekStart.add(i, 'day'));
  }, [weekStart.toString()]);

  const today = dayjs().format('YYYY-MM-DD');

  const postsByDayHour = useMemo(() => {
    const map: Record<string, PostDto[]> = {};
    posts.forEach((post) => {
      if (!post.publishDate) return;
      const d = dayjs(post.publishDate);
      const key = `${d.format('YYYY-MM-DD')}-${d.hour()}`;
      if (!map[key]) map[key] = [];
      map[key].push(post);
    });
    return map;
  }, [posts]);

  return (
    <div className="w-full overflow-auto">
      {/* Header row with day names */}
      <div className="grid grid-cols-[4rem_repeat(7,1fr)] sticky top-0 z-10 bg-surface-primary border-b border-surface-tertiary">
        <div className="text-xs text-text-muted p-2" />
        {days.map((day) => {
          const key = day.format('YYYY-MM-DD');
          const isToday = key === today;
          return (
            <div
              key={key}
              className={cn(
                'text-center p-2 border-l border-surface-tertiary',
                isToday && 'bg-brand-50'
              )}
            >
              <div className="text-xs text-text-muted uppercase">
                {day.format('ddd')}
              </div>
              <div
                className={cn(
                  'text-lg font-semibold',
                  isToday ? 'text-brand-600' : 'text-text-primary'
                )}
              >
                {day.date()}
              </div>
            </div>
          );
        })}
      </div>

      {/* Time grid */}
      <div className="grid grid-cols-[4rem_repeat(7,1fr)]">
        {HOURS.map((hour) => (
          <React.Fragment key={hour}>
            {/* Time label */}
            <div className="text-[10px] text-text-muted text-right pr-2 py-1 border-b border-surface-tertiary h-14 flex items-start justify-end">
              {formatHour(hour)}
            </div>

            {/* Day columns */}
            {days.map((day) => {
              const dateKey = day.format('YYYY-MM-DD');
              const slotKey = `${dateKey}-${hour}`;
              const slotPosts = postsByDayHour[slotKey] || [];

              return (
                <CalendarSlot
                  key={slotKey}
                  date={day.toDate()}
                  hour={hour}
                  posts={slotPosts}
                  onDropPost={onDropPost}
                  onCreatePost={onCreatePost}
                  onSelectPost={onSelectPost}
                  className="border-l border-surface-tertiary"
                  renderPost={(post) => (
                    <PostPreviewCard post={post} onClick={onSelectPost} />
                  )}
                />
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
