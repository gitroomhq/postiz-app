import React, { useCallback } from 'react';
import { cn } from '@/lib/utils';
import { GripVertical, Trash2, Plus, Clock } from 'lucide-react';
import RichTextEditor from './RichTextEditor';

export interface ThreadPost {
  id: string;
  content: string;
  plainText: string;
  delay: number;
  mediaIds: string[];
}

export interface ThreadBuilderProps {
  posts: ThreadPost[];
  onChange: (posts: ThreadPost[]) => void;
  maxChars?: number;
  platformName?: string;
}

export default function ThreadBuilder({
  posts,
  onChange,
  maxChars,
  platformName,
}: ThreadBuilderProps) {
  const addPost = useCallback(() => {
    const newPost: ThreadPost = {
      id: `thread-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      content: '',
      plainText: '',
      delay: 0,
      mediaIds: [],
    };
    onChange([...posts, newPost]);
  }, [posts, onChange]);

  const removePost = useCallback(
    (id: string) => {
      if (posts.length <= 1) return;
      onChange(posts.filter((p) => p.id !== id));
    },
    [posts, onChange]
  );

  const updatePost = useCallback(
    (id: string, updates: Partial<ThreadPost>) => {
      onChange(posts.map((p) => (p.id === id ? { ...p, ...updates } : p)));
    },
    [posts, onChange]
  );

  const movePost = useCallback(
    (fromIndex: number, toIndex: number) => {
      if (toIndex < 0 || toIndex >= posts.length) return;
      const updated = [...posts];
      const [moved] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, moved);
      onChange(updated);
    },
    [posts, onChange]
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
          Thread Builder
          {platformName && (
            <span className="text-text-muted font-normal ml-1">({platformName})</span>
          )}
        </h4>
        <span className="text-xs text-text-muted">
          {posts.length} post{posts.length !== 1 ? 's' : ''} in thread
        </span>
      </div>

      {posts.map((post, index) => (
        <div
          key={post.id}
          className="border border-surface-tertiary rounded-lg overflow-hidden bg-surface-primary"
        >
          {/* Thread post header */}
          <div className="flex items-center gap-2 px-3 py-2 bg-surface-secondary/50 border-b border-surface-tertiary">
            {/* Drag handle */}
            <button
              className="cursor-grab active:cursor-grabbing text-text-muted hover:text-text-secondary"
              onMouseDown={(e) => {
                e.preventDefault();
                // Simple swap-based reorder: holding shift moves up, otherwise moves down
              }}
              title="Drag to reorder"
            >
              <GripVertical className="w-4 h-4" />
            </button>

            {/* Move buttons for accessibility */}
            <div className="flex gap-0.5">
              <button
                onClick={() => movePost(index, index - 1)}
                disabled={index === 0}
                className={cn(
                  'text-[10px] px-1 rounded',
                  index === 0
                    ? 'text-text-muted/40 cursor-not-allowed'
                    : 'text-text-muted hover:bg-surface-tertiary'
                )}
                title="Move up"
              >
                Up
              </button>
              <button
                onClick={() => movePost(index, index + 1)}
                disabled={index === posts.length - 1}
                className={cn(
                  'text-[10px] px-1 rounded',
                  index === posts.length - 1
                    ? 'text-text-muted/40 cursor-not-allowed'
                    : 'text-text-muted hover:bg-surface-tertiary'
                )}
                title="Move down"
              >
                Down
              </button>
            </div>

            <span className="text-xs font-medium text-text-secondary">
              Post {index + 1}
            </span>

            <div className="flex-1" />

            {/* Delay between posts */}
            {index > 0 && (
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-text-muted" />
                <input
                  type="number"
                  min={0}
                  max={3600}
                  value={post.delay}
                  onChange={(e) =>
                    updatePost(post.id, { delay: parseInt(e.target.value) || 0 })
                  }
                  className="w-14 text-xs text-text-primary bg-surface-primary border border-surface-tertiary rounded px-1.5 py-0.5"
                  title="Delay in seconds"
                />
                <span className="text-[10px] text-text-muted">sec delay</span>
              </div>
            )}

            {/* Delete */}
            <button
              onClick={() => removePost(post.id)}
              disabled={posts.length <= 1}
              className={cn(
                'p-1 rounded transition-colors',
                posts.length <= 1
                  ? 'text-text-muted/40 cursor-not-allowed'
                  : 'text-text-muted hover:text-status-failed hover:bg-status-failed/10'
              )}
              title="Remove post"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Content editor */}
          <div className="p-2">
            <RichTextEditor
              content={post.content}
              onChange={(html, plainText) =>
                updatePost(post.id, { content: html, plainText })
              }
              maxChars={maxChars}
              placeholder={
                index === 0
                  ? 'Start your thread...'
                  : `Continue thread (post ${index + 1})...`
              }
            />
          </div>

          {/* Media placeholder */}
          <div className="px-3 pb-2">
            <div className="flex gap-1.5">
              {post.mediaIds.length > 0 ? (
                post.mediaIds.map((mediaId) => (
                  <div
                    key={mediaId}
                    className="w-10 h-10 rounded bg-surface-tertiary flex items-center justify-center text-[10px] text-text-muted"
                  >
                    IMG
                  </div>
                ))
              ) : (
                <div className="text-[10px] text-text-muted">
                  No media attached
                </div>
              )}
            </div>
          </div>
        </div>
      ))}

      {/* Add Thread Post button */}
      <button
        onClick={addPost}
        className={cn(
          'w-full flex items-center justify-center gap-1.5 py-2.5 rounded-lg',
          'border-2 border-dashed border-surface-tertiary',
          'text-xs font-medium text-text-muted',
          'hover:border-brand-300 hover:text-brand-600 hover:bg-brand-50/50',
          'transition-colors'
        )}
      >
        <Plus className="w-3.5 h-3.5" />
        Add Thread Post
      </button>
    </div>
  );
}
