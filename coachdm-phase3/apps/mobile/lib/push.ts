// apps/mobile/lib/push.ts
// ============================================================
// Coach DM · Mobile · Expo Push registration
// ============================================================
// Call registerForPushNotifications() once after login.
// ============================================================

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import type { SupabaseClient } from '@supabase/supabase-js';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerForPushNotifications(
  supabase: SupabaseClient,
  userId: string,
  expoProjectId?: string
): Promise<string | null> {
  if (!Device.isDevice) {
    console.log('[push] not on physical device, skipping');
    return null;
  }

  // Android channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('coach-dm', {
      name: 'Coach DM',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#D4AF37',
    });
  }

  // Permissions
  const { status: existing } = await Notifications.getPermissionsAsync();
  let final = existing;
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    final = status;
  }
  if (final !== 'granted') {
    console.log('[push] permission denied');
    return null;
  }

  // Token
  const tokenData = await Notifications.getExpoPushTokenAsync(
    expoProjectId ? { projectId: expoProjectId } : undefined
  );
  const token = tokenData.data;

  // Persist
  await supabase
    .from('profiles')
    .update({ expo_push_token: token, push_enabled: true })
    .eq('id', userId);

  return token;
}

export function setupPushHandlers(onTap: (data: any) => void) {
  const sub = Notifications.addNotificationResponseReceivedListener((res) => {
    onTap(res.notification.request.content.data);
  });
  return () => sub.remove();
}
