import React, { useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { cn, truncate, formatDate, formatDateTime, getStatusLabel } from '@/lib/utils';
import { PostDto } from '@ai-poster/shared';
import {
  STATUS_COLORS,
  PLATFORM_DISPLAY_NAMES,
  PLATFORM_ICON_COLORS,
} from '@/lib/constants';
import { ArrowUpDown, Check, Pencil, Trash2 } from 'lucide-react';

export interface CalendarListProps {
  posts: PostDto[];
  onSelectPost: (post: PostDto) => void;
  onApprovePost: (post: PostDto) => void;
  onEditPost: (post: PostDto) => void;
  onDeletePost: (post: PostDto) => void;
}

type SortField = 'date' | 'platform' | 'status';
type SortDir = 'asc' | 'desc';

export default function CalendarList({
  posts,
  onSelectPost,
  onApprovePost,
  onEditPost,
  onDeletePost,
}: CalendarListProps) {
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const sorted = useMemo(() => {
    const arr = [...posts];
    arr.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'date':
          cmp =
            new Date(a.publishDate || a.createdAt).getTime() -
            new Date(b.publishDate || b.createdAt).getTime();
          break;
        case 'platform': {
          const pa = (a.platformSettings?.platform as string) || '';
          const pb = (b.platformSettings?.platform as string) || '';
          cmp = pa.localeCompare(pb);
          break;
        }
        case 'status':
          cmp = a.state.localeCompare(b.state);
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return arr;
  }, [posts, sortField, sortDir]);

  // Group by date
  const grouped = useMemo(() => {
    const groups: { date: string; posts: PostDto[] }[] = [];
    const map = new Map<string, PostDto[]>();
    sorted.forEach((post) => {
      const key = dayjs(post.publishDate || post.createdAt).format('YYYY-MM-DD');
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(post);
    });
    map.forEach((posts, date) => {
      groups.push({ date, posts });
    });
    return groups;
  }, [sorted]);

  const SortButton = ({
    field,
    children,
  }: {
    field: SortField;
    children: React.ReactNode;
  }) => (
    <button
      onClick={() => toggleSort(field)}
      className="flex items-center gap-1 text-xs font-semibold text-text-secondary uppercase tracking-wide hover:text-text-primary transition-colors"
    >
      {children}
      <ArrowUpDown
        className={cn(
          'w-3 h-3',
          sortField === field ? 'text-brand-600' : 'text-text-muted'
        )}
      />
    </button>
  );

  return (
    <div className="w-full">
      {/* Table header */}
      <div className="grid grid-cols-[10rem_8rem_1fr_8rem_8rem] gap-2 px-4 py-3 bg-surface-secondary border-b border-surface-tertiary">
        <SortButton field="date">Date / Time</SortButton>
        <SortButton field="platform">Platform</SortButton>
        <div className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
          Content
        </div>
        <SortButton field="status">Status</SortButton>
        <div className="text-xs font-semibold text-text-secondary uppercase tracking-wide text-right">
          Actions
        </div>
      </div>

      {/* Grouped rows */}
      {grouped.map((group) => (
        <div key={group.date}>
          {/* Date header */}
          <div className="px-4 py-2 bg-surface-tertiary/50 border-b border-surface-tertiary">
            <span className="text-xs font-semibold text-text-secondary">
              {formatDate(group.date, 'dddd, MMMM D, YYYY')}
            </span>
          </div>

          {/* Posts */}
          {group.posts.map((post) => {
            const platformKey = post.platformSettings?.platform as string | undefined;
            const platformName = platformKey
              ? PLATFORM_DISPLAY_NAMES[
                  platformKey as keyof typeof PLATFORM_DISPLAY_NAMES
                ]
              : 'Unknown';
            const platformColor = platformKey
              ? PLATFORM_ICON_COLORS[
                  platformKey as keyof typeof PLATFORM_ICON_COLORS
                ]
              : '#868e96';
            const statusClass = STATUS_COLORS[post.state] || 'bg-gray-400 text-white';

            return (
              <div
                key={post.id}
                className={cn(
                  'grid grid-cols-[10rem_8rem_1fr_8rem_8rem] gap-2 px-4 py-3',
                  'border-b border-surface-tertiary hover:bg-surface-secondary/50 cursor-pointer transition-colors'
                )}
                onClick={() => onSelectPost(post)}
              >
                {/* Date / Time */}
                <div className="text-sm text-text-primary">
                  {post.publishDate
                    ? dayjs(post.publishDate).format('h:mm A')
                    : 'Unscheduled'}
                </div>

                {/* Platform */}
                <div className="flex items-center gap-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: platformColor }}
                  />
                  <span className="text-sm text-text-secondary truncate">
                    {platformName}
                  </span>
                </div>

                {/* Content */}
                <div className="text-sm text-text-primary truncate">
                  {truncate(post.plainText || post.content, 100)}
                </div>

                {/* Status badge */}
                <div>
                  <span
                    className={cn(
                      'inline-block px-2 py-0.5 rounded-full text-[10px] font-medium',
                      statusClass
                    )}
                  >
                    {getStatusLabel(post.state)}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onApprovePost(post);
                    }}
                    className="p-1.5 rounded hover:bg-surface-tertiary text-status-approved transition-colors"
                    title="Approve"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditPost(post);
                    }}
                    className="p-1.5 rounded hover:bg-surface-tertiary text-text-secondary transition-colors"
                    title="Edit"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeletePost(post);
                    }}
                    className="p-1.5 rounded hover:bg-surface-tertiary text-status-failed transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ))}

      {posts.length === 0 && (
        <div className="py-16 text-center text-text-muted text-sm">
          No posts to display. Adjust your filters or create a new post.
        </div>
      )}
    </div>
  );
}
