import React from 'react';
import { useDrop } from 'react-dnd';
import { cn } from '@/lib/utils';
import { PostDto } from '@ai-poster/shared';
import { Plus } from 'lucide-react';

export interface CalendarSlotProps {
  date: Date;
  hour: number;
  posts: PostDto[];
  onDropPost: (post: PostDto, newDate: Date) => void;
  onCreatePost: (date: Date) => void;
  onSelectPost: (post: PostDto) => void;
  renderPost: (post: PostDto) => React.ReactNode;
  className?: string;
}

const DRAG_TYPE = 'CALENDAR_POST';

interface DragItem {
  post: PostDto;
}

export default function CalendarSlot({
  date,
  hour,
  posts,
  onDropPost,
  onCreatePost,
  onSelectPost,
  renderPost,
  className,
}: CalendarSlotProps) {
  const slotDate = new Date(date);
  slotDate.setHours(hour, 0, 0, 0);

  const [{ isOver, canDrop }, dropRef] = useDrop<DragItem, void, { isOver: boolean; canDrop: boolean }>(
    () => ({
      accept: DRAG_TYPE,
      drop: (item) => {
        const target = new Date(date);
        target.setHours(hour, 0, 0, 0);
        onDropPost(item.post, target);
      },
      collect: (monitor) => ({
        isOver: monitor.isOver(),
        canDrop: monitor.canDrop(),
      }),
    }),
    [date, hour, onDropPost]
  );

  const isEmpty = posts.length === 0;

  return (
    <div
      ref={dropRef as unknown as React.Ref<HTMLDivElement>}
      className={cn(
        'min-h-[3.5rem] border-b border-surface-tertiary relative group transition-colors',
        isOver && canDrop && 'bg-brand-50 ring-1 ring-brand-300',
        canDrop && !isOver && 'bg-surface-secondary/50',
        className
      )}
    >
      {posts.map((post) => (
        <div
          key={post.id}
          className="cursor-pointer"
          onClick={() => onSelectPost(post)}
        >
          {renderPost(post)}
        </div>
      ))}

      {isEmpty && (
        <button
          onClick={() => onCreatePost(slotDate)}
          className={cn(
            'absolute inset-0 flex items-center justify-center',
            'opacity-0 group-hover:opacity-100 transition-opacity'
          )}
          aria-label="Create post"
        >
          <Plus className="w-4 h-4 text-text-muted" />
        </button>
      )}
    </div>
  );
}
