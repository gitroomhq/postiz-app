import React from 'react';
import { cn, formatDateTime, getStatusLabel, truncate } from '@/lib/utils';
import { PostDto } from '@ai-poster/shared';
import {
  STATUS_COLORS,
  PLATFORM_DISPLAY_NAMES,
  PLATFORM_ICON_COLORS,
} from '@/lib/constants';
import {
  X,
  Check,
  XCircle,
  Pencil,
  RefreshCw,
  Trash2,
  Calendar,
  Clock,
} from 'lucide-react';

export interface CalendarSidePanelProps {
  post: PostDto | null;
  isOpen: boolean;
  onClose: () => void;
  onApprove: (post: PostDto) => void;
  onReject: (post: PostDto) => void;
  onEdit: (post: PostDto) => void;
  onRegenerate: (post: PostDto) => void;
  onDelete: (post: PostDto) => void;
}

export default function CalendarSidePanel({
  post,
  isOpen,
  onClose,
  onApprove,
  onReject,
  onEdit,
  onRegenerate,
  onDelete,
}: CalendarSidePanelProps) {
  if (!post) return null;

  const platformKey = post.platformSettings?.platform as string | undefined;
  const platformName = platformKey
    ? PLATFORM_DISPLAY_NAMES[platformKey as keyof typeof PLATFORM_DISPLAY_NAMES]
    : 'Unknown';
  const platformColor = platformKey
    ? PLATFORM_ICON_COLORS[platformKey as keyof typeof PLATFORM_ICON_COLORS]
    : '#868e96';
  const statusClass = STATUS_COLORS[post.state] || 'bg-gray-400 text-white';

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40"
          onClick={onClose}
        />
      )}

      {/* Panel */}
      <div
        className={cn(
          'fixed top-0 right-0 h-full w-[28rem] max-w-full z-50',
          'bg-surface-primary shadow-2xl border-l border-surface-tertiary',
          'flex flex-col',
          'transition-transform duration-200 ease-out',
          isOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-surface-tertiary">
          <h3 className="text-sm font-semibold text-text-primary">
            Post Details
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-surface-tertiary transition-colors"
          >
            <X className="w-4 h-4 text-text-muted" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {/* Platform */}
          <div className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: platformColor }}
            />
            <span className="text-sm font-medium text-text-primary">
              {platformName}
            </span>
          </div>

          {/* Status */}
          <div>
            <span
              className={cn(
                'inline-block px-2.5 py-1 rounded-full text-xs font-medium',
                statusClass
              )}
            >
              {getStatusLabel(post.state)}
            </span>
          </div>

          {/* Scheduled date/time */}
          {post.publishDate && (
            <div className="flex items-center gap-4 text-sm text-text-secondary">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                <span>{formatDateTime(post.publishDate)}</span>
              </div>
            </div>
          )}

          {/* Content preview */}
          <div>
            <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">
              Content
            </h4>
            <div className="bg-surface-secondary rounded-lg p-3 text-sm text-text-primary leading-relaxed whitespace-pre-wrap">
              {post.plainText || post.content}
            </div>
          </div>

          {/* Media thumbnails */}
          {post.media && post.media.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">
                Media ({post.media.length})
              </h4>
              <div className="grid grid-cols-3 gap-2">
                {post.media.map((m) => (
                  <div
                    key={m.id}
                    className="aspect-square rounded-lg bg-surface-tertiary overflow-hidden"
                  >
                    {m.type.startsWith('image') ? (
                      <img
                        src={m.path}
                        alt={m.altText || ''}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-text-muted">
                        Video
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">
                Tags
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {post.tags.map((tag) => (
                  <span
                    key={tag.id}
                    className="px-2 py-0.5 rounded-full text-xs text-white"
                    style={{ backgroundColor: tag.color }}
                  >
                    {tag.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className="text-xs text-text-muted space-y-1">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3 h-3" />
              <span>Created {formatDateTime(post.createdAt)}</span>
            </div>
            {post.regenerationCount > 0 && (
              <div className="flex items-center gap-1.5">
                <RefreshCw className="w-3 h-3" />
                <span>Regenerated {post.regenerationCount} time(s)</span>
              </div>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="border-t border-surface-tertiary p-4 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onApprove(post)}
              className={cn(
                'flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                'bg-status-approved text-white hover:bg-status-approved/90'
              )}
            >
              <Check className="w-4 h-4" />
              Approve
            </button>
            <button
              onClick={() => onReject(post)}
              className={cn(
                'flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                'bg-status-rejected text-white hover:bg-status-rejected/90'
              )}
            >
              <XCircle className="w-4 h-4" />
              Reject
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => onEdit(post)}
              className={cn(
                'flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                'bg-surface-tertiary text-text-primary hover:bg-surface-tertiary/80'
              )}
            >
              <Pencil className="w-3.5 h-3.5" />
              Edit
            </button>
            <button
              onClick={() => onRegenerate(post)}
              className={cn(
                'flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                'bg-status-generated/10 text-status-generated hover:bg-status-generated/20'
              )}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Regen
            </button>
            <button
              onClick={() => onDelete(post)}
              className={cn(
                'flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                'bg-status-failed/10 text-status-failed hover:bg-status-failed/20'
              )}
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
