import * as Application from 'expo-application';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Localization from 'expo-localization';
import { Platform } from 'react-native';

import { registerPushToken } from '@/src/api/mobile-push.api';
import {
  getPushDeviceId,
  savePushDeviceId,
  saveRegisteredPushToken,
} from '@/src/services/secure-storage.service';
import { makeId } from '@/src/utils/make-id';

type ExpoNotificationsModule = typeof import('expo-notifications');
type NotificationResponse = import('expo-notifications').NotificationResponse;

let notificationsModulePromise: Promise<ExpoNotificationsModule | null> | undefined;

function isAndroidExpoGo() {
  return Platform.OS === 'android' && Constants.appOwnership === 'expo';
}

export function getNotificationsModule() {
  if (isAndroidExpoGo()) {
    return Promise.resolve(null);
  }

  notificationsModulePromise ??= import('expo-notifications')
    .then((module) => {
      module.setNotificationHandler({
        handleNotification: async () => ({
          shouldPlaySound: false,
          shouldSetBadge: false,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });

      return module;
    })
    .catch(() => null);

  return notificationsModulePromise;
}

type ExpoExtra = {
  eas?: {
    projectId?: string;
  };
};

function getProjectId() {
  const extra = Constants.expoConfig?.extra as ExpoExtra | undefined;

  return extra?.eas?.projectId ?? Constants.easConfig?.projectId;
}

async function ensureDeviceId() {
  const existing = await getPushDeviceId();

  if (existing) {
    return existing;
  }

  const next = makeId(24);
  await savePushDeviceId(next);
  return next;
}

async function configureAndroidChannel() {
  if (Platform.OS !== 'android') {
    return;
  }

  const Notifications = await getNotificationsModule();

  if (!Notifications) {
    return;
  }

  await Notifications.setNotificationChannelAsync('postiz-default', {
    name: 'Postiz alerts',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#612bd3',
  });
}

async function getExpoPushToken() {
  if (Platform.OS === 'web' || !Device.isDevice || isAndroidExpoGo()) {
    return;
  }

  try {
    const Notifications = await getNotificationsModule();

    if (!Notifications) {
      return;
    }

    await configureAndroidChannel();

    const existing = await Notifications.getPermissionsAsync();
    const permission =
      existing.status === 'granted'
        ? existing
        : await Notifications.requestPermissionsAsync({
            ios: {
              allowAlert: true,
              allowBadge: true,
              allowSound: true,
            },
          });

    if (permission.status !== 'granted') {
      return;
    }

    const projectId = getProjectId();

    if (!projectId) {
      return;
    }

    return (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  } catch (error) {
    return;
  }
}

export async function registerDeviceForPushNotifications() {
  const token = await getExpoPushToken();

  if (!token) {
    return;
  }

  const locale = Localization.getLocales()[0]?.languageTag;
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  await registerPushToken({
    token,
    platform: Platform.OS,
    deviceId: await ensureDeviceId(),
    appVersion: Application.nativeApplicationVersion ?? undefined,
    buildNumber: Application.nativeBuildVersion ?? undefined,
    locale,
    timezone,
  });
  await saveRegisteredPushToken(token);
}

export function getNotificationRouteData(response: NotificationResponse) {
  return response.notification.request.content.data ?? {};
}
