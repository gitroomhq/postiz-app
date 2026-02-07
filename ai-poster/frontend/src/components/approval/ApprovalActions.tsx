import React from 'react';
import { cn } from '@/lib/utils';
import { Check, XCircle, X } from 'lucide-react';

export interface ApprovalActionsProps {
  selectedCount: number;
  onApproveAll: () => void;
  onRejectAll: () => void;
  onClearSelection: () => void;
  isVisible: boolean;
}

export default function ApprovalActions({
  selectedCount,
  onApproveAll,
  onRejectAll,
  onClearSelection,
  isVisible,
}: ApprovalActionsProps) {
  if (!isVisible || selectedCount === 0) return null;

  return (
    <div
      className={cn(
        'fixed bottom-6 left-1/2 -translate-x-1/2 z-40',
        'flex items-center gap-3 px-5 py-3',
        'bg-surface-dark text-text-on-dark-primary rounded-xl shadow-2xl',
        'animate-slide-in'
      )}
    >
      {/* Selected count */}
      <div className="flex items-center gap-2">
        <span className="bg-brand-600 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
          {selectedCount}
        </span>
        <span className="text-sm font-medium">
          {selectedCount === 1 ? 'post' : 'posts'} selected
        </span>
      </div>

      {/* Separator */}
      <div className="w-px h-6 bg-white/20" />

      {/* Approve All */}
      <button
        onClick={onApproveAll}
        className={cn(
          'flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
          'bg-status-approved text-white hover:bg-status-approved/90'
        )}
      >
        <Check className="w-4 h-4" />
        Approve All
      </button>

      {/* Reject All */}
      <button
        onClick={onRejectAll}
        className={cn(
          'flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
          'bg-status-rejected text-white hover:bg-status-rejected/90'
        )}
      >
        <XCircle className="w-4 h-4" />
        Reject All
      </button>

      {/* Close */}
      <button
        onClick={onClearSelection}
        className="p-1.5 rounded-lg hover:bg-white/10 transition-colors ml-1"
        title="Clear selection"
      >
        <X className="w-4 h-4 text-text-on-dark" />
      </button>
    </div>
  );
}
