import React, { useState } from 'react';
import { cn, formatDateTime, truncate } from '@/lib/utils';
import { History, RotateCcw, ChevronDown, ChevronUp, MessageSquare } from 'lucide-react';

export interface PostVersion {
  id: string;
  version: number;
  content: string;
  plainText: string;
  feedback?: string;
  createdAt: string;
  createdBy?: string;
}

export interface VersionHistoryProps {
  versions: PostVersion[];
  currentVersionId?: string;
  onRestore: (version: PostVersion) => void;
  className?: string;
}

export default function VersionHistory({
  versions,
  currentVersionId,
  onRestore,
  className,
}: VersionHistoryProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const sortedVersions = [...versions].sort((a, b) => b.version - a.version);

  return (
    <div className={cn('space-y-1', className)}>
      {/* Header */}
      <div className="flex items-center gap-1.5 mb-3">
        <History className="w-4 h-4 text-text-secondary" />
        <h4 className="text-sm font-semibold text-text-primary">
          Version History
        </h4>
        <span className="text-xs text-text-muted">
          ({versions.length} version{versions.length !== 1 ? 's' : ''})
        </span>
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-3 top-0 bottom-0 w-px bg-surface-tertiary" />

        {sortedVersions.map((version, index) => {
          const isCurrent = version.id === currentVersionId;
          const isExpanded = expandedId === version.id;
          const isLatest = index === 0;

          return (
            <div key={version.id} className="relative pl-8 pb-4">
              {/* Timeline dot */}
              <div
                className={cn(
                  'absolute left-1.5 w-3 h-3 rounded-full border-2',
                  isCurrent
                    ? 'bg-brand-600 border-brand-300'
                    : isLatest
                    ? 'bg-status-approved border-status-approved/30'
                    : 'bg-surface-tertiary border-surface-tertiary'
                )}
                style={{ top: '0.35rem' }}
              />

              {/* Version card */}
              <div
                className={cn(
                  'border rounded-lg transition-colors',
                  isCurrent
                    ? 'border-brand-200 bg-brand-50/30'
                    : 'border-surface-tertiary bg-surface-primary hover:bg-surface-secondary/30'
                )}
              >
                {/* Version header */}
                <button
                  onClick={() =>
                    setExpandedId(isExpanded ? null : version.id)
                  }
                  className="w-full flex items-center justify-between px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-text-primary">
                      v{version.version}
                    </span>
                    {isCurrent && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-brand-100 text-brand-700">
                        Current
                      </span>
                    )}
                    {isLatest && !isCurrent && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-status-approved/10 text-status-approved">
                        Latest
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-text-muted">
                      {formatDateTime(version.createdAt)}
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="w-3 h-3 text-text-muted" />
                    ) : (
                      <ChevronDown className="w-3 h-3 text-text-muted" />
                    )}
                  </div>
                </button>

                {/* Preview (collapsed) */}
                {!isExpanded && (
                  <div className="px-3 pb-2">
                    <p className="text-xs text-text-muted truncate">
                      {truncate(version.plainText || version.content, 100)}
                    </p>
                  </div>
                )}

                {/* Expanded content */}
                {isExpanded && (
                  <div className="px-3 pb-3 space-y-3 animate-fade-in">
                    {/* Feedback that triggered this version */}
                    {version.feedback && (
                      <div className="flex items-start gap-1.5 bg-surface-secondary rounded-lg p-2">
                        <MessageSquare className="w-3 h-3 text-text-muted mt-0.5 flex-shrink-0" />
                        <div>
                          <div className="text-[10px] text-text-muted mb-0.5">
                            Feedback
                          </div>
                          <p className="text-xs text-text-secondary">
                            {version.feedback}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Full content */}
                    <div>
                      <div className="text-[10px] text-text-muted mb-1">
                        Content
                      </div>
                      <div className="bg-surface-secondary rounded-lg p-3 text-sm text-text-primary leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto">
                        {version.plainText || version.content}
                      </div>
                    </div>

                    {/* Created by */}
                    {version.createdBy && (
                      <div className="text-[10px] text-text-muted">
                        Created by {version.createdBy}
                      </div>
                    )}

                    {/* Restore button */}
                    {!isCurrent && (
                      <button
                        onClick={() => onRestore(version)}
                        className={cn(
                          'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                          'bg-surface-secondary text-text-primary hover:bg-surface-tertiary'
                        )}
                      >
                        <RotateCcw className="w-3 h-3" />
                        Restore this version
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {versions.length === 0 && (
        <div className="text-center py-8 text-sm text-text-muted">
          No version history available.
        </div>
      )}
    </div>
  );
}
