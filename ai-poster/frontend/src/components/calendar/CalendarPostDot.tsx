import React, { useState, useRef } from 'react';
import { useDrag } from 'react-dnd';
import { cn } from '@/lib/utils';
import { PostDto } from '@ai-poster/shared';
import { STATUS_DOT_COLORS, PLATFORM_DISPLAY_NAMES, PLATFORM_ICON_COLORS } from '@/lib/constants';
import { truncate, formatDateTime } from '@/lib/utils';

export interface CalendarPostDotProps {
  post: PostDto;
  onClick: (post: PostDto) => void;
}

const DRAG_TYPE = 'CALENDAR_POST';

export default function CalendarPostDot({ post, onClick }: CalendarPostDotProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const [{ isDragging }, dragRef] = useDrag(
    () => ({
      type: DRAG_TYPE,
      item: { post },
      collect: (monitor) => ({
        isDragging: monitor.isDragging(),
      }),
    }),
    [post]
  );

  const platformKey = post.platformSettings?.platform as string | undefined;
  const dotColor = STATUS_DOT_COLORS[post.state] || 'bg-gray-400';
  const platformColor = platformKey
    ? PLATFORM_ICON_COLORS[platformKey as keyof typeof PLATFORM_ICON_COLORS]
    : undefined;
  const platformName = platformKey
    ? PLATFORM_DISPLAY_NAMES[platformKey as keyof typeof PLATFORM_DISPLAY_NAMES]
    : undefined;

  return (
    <div className="relative inline-block">
      <div
        ref={dragRef as unknown as React.Ref<HTMLDivElement>}
        className={cn(
          'w-3 h-3 rounded-full cursor-pointer transition-transform hover:scale-125',
          dotColor,
          isDragging && 'opacity-40 scale-75'
        )}
        style={platformColor ? { borderColor: platformColor, borderWidth: 1 } : undefined}
        onClick={(e) => {
          e.stopPropagation();
          onClick(post);
        }}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      />

      {showTooltip && (
        <div
          ref={tooltipRef}
          className={cn(
            'absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2',
            'w-56 p-3 rounded-lg shadow-lg',
            'bg-surface-dark text-text-on-dark-primary text-xs',
            'animate-fade-in pointer-events-none'
          )}
        >
          {platformName && (
            <div className="flex items-center gap-1.5 mb-1.5">
              <span
                className="w-2 h-2 rounded-full inline-block"
                style={{ backgroundColor: platformColor }}
              />
              <span className="font-medium">{platformName}</span>
            </div>
          )}
          <p className="text-text-on-dark leading-relaxed">
            {truncate(post.plainText || post.content, 120)}
          </p>
          {post.publishDate && (
            <p className="mt-1.5 text-text-muted text-[10px]">
              {formatDateTime(post.publishDate)}
            </p>
          )}
          <div className="flex items-center gap-1.5 mt-1.5">
            <span className={cn('w-1.5 h-1.5 rounded-full', dotColor)} />
            <span className="text-text-muted capitalize">
              {post.state.toLowerCase().replace(/_/g, ' ')}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
