import React, { useMemo } from 'react';
import { useDrop } from 'react-dnd';
import dayjs from 'dayjs';
import { cn } from '@/lib/utils';
import { PostDto } from '@ai-poster/shared';
import CalendarPostDot from './CalendarPostDot';

export interface CalendarMonthProps {
  currentDate: Date;
  posts: PostDto[];
  onSelectPost: (post: PostDto) => void;
  onCreatePost: (date: Date) => void;
  onDropPost: (post: PostDto, newDate: Date) => void;
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DRAG_TYPE = 'CALENDAR_POST';

interface DragItem {
  post: PostDto;
}

function DayCell({
  day,
  isCurrentMonth,
  isToday,
  posts,
  onSelectPost,
  onCreatePost,
  onDropPost,
}: {
  day: dayjs.Dayjs;
  isCurrentMonth: boolean;
  isToday: boolean;
  posts: PostDto[];
  onSelectPost: (post: PostDto) => void;
  onCreatePost: (date: Date) => void;
  onDropPost: (post: PostDto, newDate: Date) => void;
}) {
  const [{ isOver }, dropRef] = useDrop<DragItem, void, { isOver: boolean }>(
    () => ({
      accept: DRAG_TYPE,
      drop: (item) => {
        const target = day.toDate();
        const original = item.post.publishDate
          ? dayjs(item.post.publishDate)
          : dayjs();
        const newDate = dayjs(target)
          .hour(original.hour())
          .minute(original.minute())
          .toDate();
        onDropPost(item.post, newDate);
      },
      collect: (monitor) => ({
        isOver: monitor.isOver(),
      }),
    }),
    [day, onDropPost]
  );

  return (
    <div
      ref={dropRef as unknown as React.Ref<HTMLDivElement>}
      className={cn(
        'min-h-[6rem] border border-surface-tertiary p-1.5 cursor-pointer transition-colors',
        !isCurrentMonth && 'bg-surface-secondary/40',
        isCurrentMonth && 'bg-surface-primary',
        isOver && 'bg-brand-50 ring-1 ring-brand-300',
        'hover:bg-surface-secondary'
      )}
      onClick={() => onCreatePost(day.toDate())}
    >
      <div className="flex items-center justify-between mb-1">
        <span
          className={cn(
            'text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full',
            isToday && 'bg-brand-600 text-white',
            !isToday && isCurrentMonth && 'text-text-primary',
            !isToday && !isCurrentMonth && 'text-text-muted'
          )}
        >
          {day.date()}
        </span>
        {posts.length > 3 && (
          <span className="text-[10px] text-text-muted">
            +{posts.length - 3}
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-1">
        {posts.slice(0, 3).map((post) => (
          <CalendarPostDot
            key={post.id}
            post={post}
            onClick={onSelectPost}
          />
        ))}
      </div>
    </div>
  );
}

export default function CalendarMonth({
  currentDate,
  posts,
  onSelectPost,
  onCreatePost,
  onDropPost,
}: CalendarMonthProps) {
  const current = dayjs(currentDate);
  const startOfMonth = current.startOf('month');
  const endOfMonth = current.endOf('month');

  // Monday-based weeks
  const startDayOfWeek = startOfMonth.day() === 0 ? 6 : startOfMonth.day() - 1;
  const gridStart = startOfMonth.subtract(startDayOfWeek, 'day');

  const weeks = useMemo(() => {
    const result: dayjs.Dayjs[][] = [];
    let day = gridStart;
    for (let w = 0; w < 6; w++) {
      const week: dayjs.Dayjs[] = [];
      for (let d = 0; d < 7; d++) {
        week.push(day);
        day = day.add(1, 'day');
      }
      result.push(week);
    }
    return result;
  }, [gridStart.toString()]);

  const postsByDate = useMemo(() => {
    const map: Record<string, PostDto[]> = {};
    posts.forEach((post) => {
      if (!post.publishDate) return;
      const key = dayjs(post.publishDate).format('YYYY-MM-DD');
      if (!map[key]) map[key] = [];
      map[key].push(post);
    });
    return map;
  }, [posts]);

  const today = dayjs().format('YYYY-MM-DD');

  return (
    <div className="w-full">
      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b border-surface-tertiary">
        {WEEKDAYS.map((wd) => (
          <div
            key={wd}
            className="text-center text-xs font-semibold text-text-secondary py-2 uppercase tracking-wide"
          >
            {wd}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      {weeks.map((week, wi) => (
        <div key={wi} className="grid grid-cols-7">
          {week.map((day) => {
            const key = day.format('YYYY-MM-DD');
            const isCurrentMonth =
              day.isAfter(startOfMonth.subtract(1, 'day')) &&
              day.isBefore(endOfMonth.add(1, 'day'));
            const isToday = key === today;
            const dayPosts = postsByDate[key] || [];

            return (
              <DayCell
                key={key}
                day={day}
                isCurrentMonth={isCurrentMonth}
                isToday={isToday}
                posts={dayPosts}
                onSelectPost={onSelectPost}
                onCreatePost={onCreatePost}
                onDropPost={onDropPost}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}
