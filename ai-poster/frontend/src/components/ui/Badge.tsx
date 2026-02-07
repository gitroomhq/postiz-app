import React from 'react';
import { cn } from '@/lib/utils';

type BadgeVariant =
  | 'default'
  | 'draft'
  | 'generated'
  | 'pending'
  | 'approved'
  | 'scheduled'
  | 'publishing'
  | 'posted'
  | 'failed'
  | 'rejected';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  dot?: boolean;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-gray-100 text-gray-700',
  draft: 'bg-gray-100 text-gray-600',
  generated: 'bg-amber-50 text-amber-700',
  pending: 'bg-orange-50 text-orange-700',
  approved: 'bg-green-50 text-green-700',
  scheduled: 'bg-blue-50 text-blue-700',
  publishing: 'bg-purple-50 text-purple-700',
  posted: 'bg-emerald-50 text-emerald-700',
  failed: 'bg-red-50 text-red-700',
  rejected: 'bg-red-50 text-red-700',
};

const dotColors: Record<BadgeVariant, string> = {
  default: 'bg-gray-400',
  draft: 'bg-status-draft',
  generated: 'bg-status-generated',
  pending: 'bg-status-pending',
  approved: 'bg-status-approved',
  scheduled: 'bg-status-scheduled',
  publishing: 'bg-status-publishing',
  posted: 'bg-status-posted',
  failed: 'bg-status-failed',
  rejected: 'bg-status-rejected',
};

export function statusToBadgeVariant(status: string): BadgeVariant {
  const map: Record<string, BadgeVariant> = {
    DRAFT: 'draft',
    AI_GENERATED: 'generated',
    PENDING_APPROVAL: 'pending',
    APPROVED: 'approved',
    SCHEDULED: 'scheduled',
    PUBLISHING: 'publishing',
    POSTED: 'posted',
    FAILED: 'failed',
    REJECTED: 'rejected',
    ACTIVE: 'approved',
    PAUSED: 'generated',
    COMPLETED: 'posted',
  };
  return map[status] || 'default';
}

export function Badge({ children, variant = 'default', dot, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
        variantStyles[variant],
        className
      )}
    >
      {dot && (
        <span
          className={cn('h-1.5 w-1.5 rounded-full', dotColors[variant])}
        />
      )}
      {children}
    </span>
  );
}
