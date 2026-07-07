import { apiFetch } from '@/src/api/client';

export type NotificationItem = {
  content: string;
  createdAt: string;
};

export type NotificationsResponse = {
  lastReadNotifications?: string;
  notifications: NotificationItem[];
};

export function getNotifications() {
  return apiFetch<NotificationsResponse>('/notifications/list', {
    method: 'GET',
  });
}
