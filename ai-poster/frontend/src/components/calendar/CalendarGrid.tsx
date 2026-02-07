import React, { useState, useCallback } from 'react';
import dayjs from 'dayjs';
import { cn } from '@/lib/utils';
import { PostDto } from '@ai-poster/shared';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  LayoutGrid,
  Columns,
  List,
  Clock,
} from 'lucide-react';
import CalendarMonth from './CalendarMonth';
import CalendarWeek from './CalendarWeek';
import CalendarDay from './CalendarDay';
import CalendarList from './CalendarList';

export type ViewMode = 'month' | 'week' | 'day' | 'list';

export interface CalendarGridProps {
  posts: PostDto[];
  initialDate?: Date;
  initialView?: ViewMode;
  onSelectPost: (post: PostDto) => void;
  onCreatePost: (date: Date) => void;
  onDropPost: (post: PostDto, newDate: Date) => void;
  onApprovePost: (post: PostDto) => void;
  onEditPost: (post: PostDto) => void;
  onDeletePost: (post: PostDto) => void;
  timezone?: string;
}

const VIEW_MODES: { key: ViewMode; label: string; icon: React.ElementType }[] = [
  { key: 'month', label: 'Month', icon: LayoutGrid },
  { key: 'week', label: 'Week', icon: Columns },
  { key: 'day', label: 'Day', icon: Clock },
  { key: 'list', label: 'List', icon: List },
];

export default function CalendarGrid({
  posts,
  initialDate,
  initialView = 'month',
  onSelectPost,
  onCreatePost,
  onDropPost,
  onApprovePost,
  onEditPost,
  onDeletePost,
  timezone,
}: CalendarGridProps) {
  const [viewMode, setViewMode] = useState<ViewMode>(initialView);
  const [currentDate, setCurrentDate] = useState<Date>(initialDate || new Date());

  const current = dayjs(currentDate);

  const navigatePrev = useCallback(() => {
    switch (viewMode) {
      case 'month':
        setCurrentDate(current.subtract(1, 'month').toDate());
        break;
      case 'week':
        setCurrentDate(current.subtract(1, 'week').toDate());
        break;
      case 'day':
        setCurrentDate(current.subtract(1, 'day').toDate());
        break;
      case 'list':
        setCurrentDate(current.subtract(1, 'month').toDate());
        break;
    }
  }, [viewMode, current]);

  const navigateNext = useCallback(() => {
    switch (viewMode) {
      case 'month':
        setCurrentDate(current.add(1, 'month').toDate());
        break;
      case 'week':
        setCurrentDate(current.add(1, 'week').toDate());
        break;
      case 'day':
        setCurrentDate(current.add(1, 'day').toDate());
        break;
      case 'list':
        setCurrentDate(current.add(1, 'month').toDate());
        break;
    }
  }, [viewMode, current]);

  const goToToday = useCallback(() => {
    setCurrentDate(new Date());
  }, []);

  const getTitle = (): string => {
    switch (viewMode) {
      case 'month':
        return current.format('MMMM YYYY');
      case 'week': {
        const dayOfWeek = current.day() === 0 ? 6 : current.day() - 1;
        const weekStart = current.subtract(dayOfWeek, 'day');
        const weekEnd = weekStart.add(6, 'day');
        if (weekStart.month() === weekEnd.month()) {
          return `${weekStart.format('MMM D')} - ${weekEnd.format('D, YYYY')}`;
        }
        return `${weekStart.format('MMM D')} - ${weekEnd.format('MMM D, YYYY')}`;
      }
      case 'day':
        return current.format('dddd, MMMM D, YYYY');
      case 'list':
        return current.format('MMMM YYYY');
      default:
        return '';
    }
  };

  return (
    <div className="w-full flex flex-col bg-surface-primary rounded-xl border border-surface-tertiary overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-3 border-b border-surface-tertiary">
        {/* Left: navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={navigatePrev}
            className="p-1.5 rounded-lg hover:bg-surface-secondary transition-colors"
            aria-label="Previous"
          >
            <ChevronLeft className="w-4 h-4 text-text-secondary" />
          </button>
          <button
            onClick={navigateNext}
            className="p-1.5 rounded-lg hover:bg-surface-secondary transition-colors"
            aria-label="Next"
          >
            <ChevronRight className="w-4 h-4 text-text-secondary" />
          </button>
          <button
            onClick={goToToday}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-brand-600 hover:bg-brand-50 transition-colors"
          >
            Today
          </button>
        </div>

        {/* Center: title */}
        <h2 className="text-sm font-semibold text-text-primary">{getTitle()}</h2>

        {/* Right: view mode toggle */}
        <div className="flex items-center bg-surface-secondary rounded-lg p-0.5">
          {VIEW_MODES.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setViewMode(key)}
              className={cn(
                'flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors',
                viewMode === key
                  ? 'bg-surface-primary text-brand-600 shadow-sm'
                  : 'text-text-muted hover:text-text-secondary'
              )}
              title={label}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {viewMode === 'month' && (
          <CalendarMonth
            currentDate={currentDate}
            posts={posts}
            onSelectPost={onSelectPost}
            onCreatePost={onCreatePost}
            onDropPost={onDropPost}
          />
        )}
        {viewMode === 'week' && (
          <CalendarWeek
            currentDate={currentDate}
            posts={posts}
            onSelectPost={onSelectPost}
            onCreatePost={onCreatePost}
            onDropPost={onDropPost}
            timezone={timezone}
          />
        )}
        {viewMode === 'day' && (
          <CalendarDay
            currentDate={currentDate}
            posts={posts}
            onSelectPost={onSelectPost}
            onCreatePost={onCreatePost}
            onDropPost={onDropPost}
            timezone={timezone}
          />
        )}
        {viewMode === 'list' && (
          <CalendarList
            posts={posts}
            onSelectPost={onSelectPost}
            onApprovePost={onApprovePost}
            onEditPost={onEditPost}
            onDeletePost={onDeletePost}
          />
        )}
      </div>
    </div>
  );
}
