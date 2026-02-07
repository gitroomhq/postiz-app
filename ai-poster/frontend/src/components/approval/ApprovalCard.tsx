import React from 'react';
import { cn, truncate, formatDateTime, getStatusLabel } from '@/lib/utils';
import { PostDto } from '@ai-poster/shared';
import {
  STATUS_COLORS,
  PLATFORM_DISPLAY_NAMES,
  PLATFORM_ICON_COLORS,
} from '@/lib/constants';
import { Check, XCircle, RefreshCw, Calendar } from 'lucide-react';

export interface ApprovalCardProps {
  post: PostDto;
  isSelected: boolean;
  onToggleSelect: (postId: string) => void;
  onApprove: (post: PostDto) => void;
  onReject: (post: PostDto) => void;
  onRegenerate: (post: PostDto) => void;
}

export default function ApprovalCard({
  post,
  isSelected,
  onToggleSelect,
  onApprove,
  onReject,
  onRegenerate,
}: ApprovalCardProps) {
  const platformKey = post.platformSettings?.platform as string | undefined;
  const platformName = platformKey
    ? PLATFORM_DISPLAY_NAMES[platformKey as keyof typeof PLATFORM_DISPLAY_NAMES]
    : 'Unknown';
  const platformColor = platformKey
    ? PLATFORM_ICON_COLORS[platformKey as keyof typeof PLATFORM_ICON_COLORS]
    : '#868e96';
  const statusClass = STATUS_COLORS[post.state] || 'bg-gray-400 text-white';

  return (
    <div
      className={cn(
        'bg-surface-primary border rounded-xl overflow-hidden transition-all',
        isSelected
          ? 'border-brand-400 ring-1 ring-brand-200 shadow-sm'
          : 'border-surface-tertiary hover:shadow-sm'
      )}
    >
      {/* Header with checkbox, platform, and status */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-surface-tertiary bg-surface-secondary/30">
        {/* Checkbox */}
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggleSelect(post.id)}
          className="w-4 h-4 rounded border-surface-tertiary text-brand-600 focus:ring-brand-500 cursor-pointer"
        />

        {/* Platform */}
        <div className="flex items-center gap-1.5">
          <span
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: platformColor }}
          />
          <span className="text-sm font-medium text-text-primary">
            {platformName}
          </span>
        </div>

        <div className="flex-1" />

        {/* Status badge */}
        <span
          className={cn(
            'inline-block px-2 py-0.5 rounded-full text-[10px] font-medium',
            statusClass
          )}
        >
          {getStatusLabel(post.state)}
        </span>
      </div>

      {/* Content preview */}
      <div className="px-4 py-3">
        <p className="text-sm text-text-primary leading-relaxed">
          {truncate(post.plainText || post.content, 200)}
        </p>
      </div>

      {/* Media thumbnails */}
      {post.media && post.media.length > 0 && (
        <div className="px-4 pb-3">
          <div className="flex gap-1.5">
            {post.media.slice(0, 4).map((m) => (
              <div
                key={m.id}
                className="w-16 h-16 rounded-lg bg-surface-tertiary overflow-hidden flex-shrink-0"
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
            {post.media.length > 4 && (
              <div className="w-16 h-16 rounded-lg bg-surface-tertiary flex items-center justify-center text-xs text-text-muted">
                +{post.media.length - 4}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Scheduled time */}
      {post.publishDate && (
        <div className="px-4 pb-3">
          <div className="flex items-center gap-1.5 text-xs text-text-muted">
            <Calendar className="w-3 h-3" />
            <span>{formatDateTime(post.publishDate)}</span>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-2 px-4 py-3 border-t border-surface-tertiary bg-surface-secondary/20">
        <button
          onClick={() => onApprove(post)}
          className={cn(
            'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors',
            'bg-status-approved text-white hover:bg-status-approved/90'
          )}
        >
          <Check className="w-4 h-4" />
          Approve
        </button>
        <button
          onClick={() => onReject(post)}
          className={cn(
            'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors',
            'bg-status-rejected text-white hover:bg-status-rejected/90'
          )}
        >
          <XCircle className="w-4 h-4" />
          Reject
        </button>
        <button
          onClick={() => onRegenerate(post)}
          className={cn(
            'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors',
            'bg-status-generated text-white hover:bg-status-generated/90'
          )}
        >
          <RefreshCw className="w-4 h-4" />
          Regenerate
        </button>
      </div>
    </div>
  );
}
