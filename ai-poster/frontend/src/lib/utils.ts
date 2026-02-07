import { clsx, type ClassValue } from 'clsx';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}

export function formatDate(
  date: string | Date | undefined,
  format: string = 'MMM D, YYYY'
): string {
  if (!date) return '';
  return dayjs(date).format(format);
}

export function formatDateTime(date: string | Date | undefined): string {
  if (!date) return '';
  return dayjs(date).format('MMM D, YYYY h:mm A');
}

export function formatRelative(date: string | Date | undefined): string {
  if (!date) return '';
  return dayjs(date).fromNow();
}

export function truncate(str: string, length: number): string {
  if (!str) return '';
  if (str.length <= length) return str;
  return str.slice(0, length) + '...';
}

export function stripHtml(html: string): string {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '');
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    DRAFT: 'bg-status-draft',
    AI_GENERATED: 'bg-status-generated',
    PENDING_APPROVAL: 'bg-status-pending',
    APPROVED: 'bg-status-approved',
    SCHEDULED: 'bg-status-scheduled',
    PUBLISHING: 'bg-status-publishing',
    POSTED: 'bg-status-posted',
    FAILED: 'bg-status-failed',
    REJECTED: 'bg-status-rejected',
    ACTIVE: 'bg-status-approved',
    PAUSED: 'bg-status-generated',
    COMPLETED: 'bg-status-posted',
  };
  return colors[status] || 'bg-gray-400';
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    DRAFT: 'Draft',
    AI_GENERATED: 'AI Generated',
    PENDING_APPROVAL: 'Pending Approval',
    APPROVED: 'Approved',
    SCHEDULED: 'Scheduled',
    PUBLISHING: 'Publishing',
    POSTED: 'Posted',
    FAILED: 'Failed',
    REJECTED: 'Rejected',
    ACTIVE: 'Active',
    PAUSED: 'Paused',
    COMPLETED: 'Completed',
    FULLY_AUTOMATED: 'Full Auto',
    SEMI_AUTOMATED: 'Semi Auto',
    MANUAL: 'Manual',
  };
  return labels[status] || status;
}

export function getInitials(name: string): string {
  if (!name) return '?';
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function buildQueryString(params: Record<string, unknown>): string {
  const filtered = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== null && v !== ''
  );
  if (filtered.length === 0) return '';
  const qs = filtered
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');
  return `?${qs}`;
}
