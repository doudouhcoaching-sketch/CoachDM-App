// ═══════════════════════════════════════════════════════════════════════════
// COACH DM · Phase 4 · Mobile · usePushRegistration
// ═══════════════════════════════════════════════════════════════════════════
// Enregistre le token Expo Push dans profiles.expo_push_token + crée le
// canal Android "recovery" pour que les rappels Phase 4 sortent par ce canal
// (l'Edge Function recovery-reminders envoie channelId: 'recovery').
// ═══════════════════════════════════════════════════════════════════════════

import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { supabase } from '../lib/supabase';

export function usePushRegistration() {
  useEffect(() => {
    let cancelled = false;

    async function register() {
      if (!Device.isDevice) return;

      // Canaux Android (un par contexte pour permettre des préférences distinctes)
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('recovery', {
          name: 'Récupération',
          description: 'Rappels sommeil, hydratation, habitudes',
          importance: Notifications.AndroidImportance.DEFAULT,
          vibrationPattern: [0, 200, 100, 200],
          lightColor: '#D4AF37',
        });
        await Notifications.setNotificationChannelAsync('coaching', {
          name: 'Coaching',
          description: 'Messages coach et check-ins',
          importance: Notifications.AndroidImportance.HIGH,
          lightColor: '#D4AF37',
        });
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') return;

      try {
        const tokenData = await Notifications.getExpoPushTokenAsync({
          projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
        });
        const token = tokenData.data;
        if (!token || cancelled) return;

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // On ne réécrit pas si identique (limite les writes)
        const { data: profile } = await supabase
          .from('profiles')
          .select('expo_push_token')
          .eq('id', user.id)
          .single();

        if (profile?.expo_push_token !== token) {
          await supabase
            .from('profiles')
            .update({ expo_push_token: token })
            .eq('id', user.id);
        }
      } catch (e) {
        console.warn('[push] registration failed', e);
      }
    }

    register();
    return () => { cancelled = true; };
  }, []);
}
