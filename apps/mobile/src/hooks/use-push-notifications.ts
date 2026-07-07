import { useRouter } from 'expo-router';
import type { Href } from 'expo-router';
import { useEffect } from 'react';

import { queryClient } from '@/src/providers/query-client';
import {
  getNotificationsModule,
  getNotificationRouteData,
  registerDeviceForPushNotifications,
} from '@/src/services/push-notifications.service';
import { useAuthStore } from '@/src/stores/auth.store';

function routeFromNotificationData(data: Record<string, unknown>) {
  if (typeof data.postId === 'string' && data.postId) {
    return {
      pathname: '/posts/[id]',
      params: { id: data.postId },
    } as unknown as Href;
  }

  if (typeof data.route === 'string' && data.route.startsWith('/')) {
    return data.route as Href;
  }

  return '/(tabs)/notifications' as Href;
}

export function usePushNotifications() {
  const router = useRouter();
  const status = useAuthStore((state) => state.status);
  const organizationId = useAuthStore((state) => state.organizationId);

  useEffect(() => {
    if (status !== 'authenticated' || !organizationId) {
      return;
    }

    registerDeviceForPushNotifications().catch(() => {});
  }, [organizationId, status]);

  useEffect(() => {
    let mounted = true;
    let receivedSubscription: { remove: () => void } | undefined;
    let responseSubscription: { remove: () => void } | undefined;

    getNotificationsModule()
      .then((Notifications) => {
        if (!mounted || !Notifications) {
          return;
        }

        receivedSubscription = Notifications.addNotificationReceivedListener(
          () => {
            void queryClient.invalidateQueries({ queryKey: ['notifications'] });
          }
        );
        responseSubscription =
          Notifications.addNotificationResponseReceivedListener((response) => {
            const data = getNotificationRouteData(response);
            router.push(routeFromNotificationData(data));
          });

        return Notifications.getLastNotificationResponseAsync();
      })
      .then((response) => {
        if (!mounted || !response) {
          return;
        }

        const data = getNotificationRouteData(response);
        router.push(routeFromNotificationData(data));
      })
      .catch(() => {});

    return () => {
      mounted = false;
      receivedSubscription?.remove();
      responseSubscription?.remove();
    };
  }, [router]);
}
