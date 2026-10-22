import { isRunningInExpoGo } from 'expo';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { deactivatePushToken, registerPushToken } from '@/lib/api/notifications';

let deviceToken: string | null = null;
let inFlight: Promise<void> | null = null;

function readProjectId(): string | null {
  const fromEas = Constants.easConfig?.projectId;
  if (typeof fromEas === 'string' && fromEas.length > 0) return fromEas;
  const extra = Constants.expoConfig?.extra;
  if (!extra || typeof extra !== 'object' || !('eas' in extra)) return null;
  const eas = extra.eas;
  if (!eas || typeof eas !== 'object' || !('projectId' in eas)) return null;
  const projectId = eas.projectId;
  return typeof projectId === 'string' && projectId.length > 0 ? projectId : null;
}

async function syncDevicePushToken(): Promise<void> {
  if (isRunningInExpoGo()) return;
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') return;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Campus Plug',
      importance: Notifications.AndroidImportance.MAX,
    });
  }

  const existing = await Notifications.getPermissionsAsync();
  const permission =
    existing.status === 'granted' ? existing : await Notifications.requestPermissionsAsync();
  if (permission.status !== 'granted') return;

  const projectId = readProjectId();
  if (!projectId) return;

  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  await registerPushToken(token, Platform.OS);
  deviceToken = token;
}

export function registerDevicePushToken(): Promise<void> {
  if (deviceToken) return Promise.resolve();
  inFlight ??= syncDevicePushToken()
    .catch(() => undefined)
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}

export async function deactivateDevicePushToken(): Promise<void> {
  if (inFlight) await inFlight;
  const token = deviceToken;
  if (!token) return;
  try {
    await deactivatePushToken(token);
  } catch (error) {
    const message =
      typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string'
        ? error.message.toLowerCase()
        : '';
    if (!message.includes('not authenticated')) throw error;
  }
  deviceToken = null;
}
