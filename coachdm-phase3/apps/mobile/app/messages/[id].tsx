// apps/mobile/app/messages/[id].tsx
// ============================================================
// Coach DM · Mobile · Thread detail (realtime)
// ============================================================

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import {
  createMessagingClient,
  type Message,
  type MessageThread,
  coachI18n,
} from '@coachdm/shared/coach';
import { useSupabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useLocale } from '@/lib/locale';
import { Colors } from '@/lib/theme';

export default function ThreadScreen() {
  const { id: threadId } = useLocalSearchParams<{ id: string }>();
  const supabase = useSupabase();
  const { user } = useAuth();
  const { locale } = useLocale();
  const router = useRouter();

  const messaging = useMemo(() => createMessagingClient(supabase), [supabase]);

  const [thread, setThread] = useState<MessageThread | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const listRef = useRef<FlatList>(null);

  const otherUserId =
    thread && user
      ? thread.coach_user_id === user.id
        ? thread.client_user_id
        : thread.coach_user_id
      : null;

  useEffect(() => {
    if (!threadId) return;
    (async () => {
      const [t, m] = await Promise.all([
        messaging.getThread(threadId),
        messaging.listMessages(threadId, { limit: 80 }),
      ]);
      setThread(t);
      setMessages(m);
      setLoading(false);
      await messaging.markThreadRead(threadId);
    })();

    const unsub = messaging.subscribeToThread(threadId, (msg) => {
      setMessages((prev) =>
        prev.find((p) => p.id === msg.id) ? prev : [...prev, msg]
      );
      if (msg.recipient_user_id === user?.id) {
        messaging.markThreadRead(threadId);
      }
    });

    return unsub;
  }, [threadId]);

  useEffect(() => {
    if (messages.length > 0) {
      requestAnimationFrame(() =>
        listRef.current?.scrollToEnd({ animated: true })
      );
    }
  }, [messages.length]);

  const send = async () => {
    if (!body.trim() || !thread || !otherUserId || sending) return;
    setSending(true);
    try {
      await messaging.sendMessage({
        threadId: thread.id,
        recipientUserId: otherUserId,
        body: body.trim(),
      });
      setBody('');
    } catch (e) {
      console.error('send failed', e);
    } finally {
      setSending(false);
    }
  };

  const attachPhoto = async () => {
    if (!thread || !otherUserId || !user) return;
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
    });
    if (res.canceled || !res.assets[0]) return;
    setUploading(true);
    try {
      const asset = res.assets[0];
      const blob = await (await fetch(asset.uri)).blob();
      const filename = asset.fileName ?? `photo-${Date.now()}.jpg`;
      const { url } = await messaging.uploadAttachment(blob, filename, user.id);
      await messaging.sendMessage({
        threadId: thread.id,
        recipientUserId: otherUserId,
        body: '📎 Photo',
        attachmentUrl: url,
        attachmentType: 'image',
      });
    } finally {
      setUploading(false);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const mine = item.sender_user_id === user?.id;
    return (
      <View
        style={[
          styles.bubbleRow,
          mine ? styles.bubbleRowRight : styles.bubbleRowLeft,
        ]}
      >
        <View
          style={[
            styles.bubble,
            mine ? styles.bubbleMine : styles.bubbleTheirs,
          ]}
        >
          {item.attachment_type === 'image' && item.attachment_url && (
            <Image
              source={item.attachment_url}
              style={styles.attachment}
              contentFit="cover"
            />
          )}
          {item.body && (
            <Text
              style={[
                styles.bubbleText,
                mine ? styles.bubbleTextMine : styles.bubbleTextTheirs,
              ]}
            >
              {item.body}
            </Text>
          )}
          <Text
            style={[
              styles.bubbleTime,
              mine ? styles.bubbleTimeMine : styles.bubbleTimeTheirs,
            ]}
          >
            {new Date(item.created_at).toLocaleTimeString(locale, {
              hour: '2-digit',
              minute: '2-digit',
            })}
            {mine && item.read_at && '  ✓✓'}
          </Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={Colors.gold} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <Stack.Screen
        options={{
          headerShown: true,
          headerStyle: { backgroundColor: Colors.background },
          headerTintColor: Colors.gold,
          headerTitle: '',
        }}
      />

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.list}
        onContentSizeChange={() =>
          listRef.current?.scrollToEnd({ animated: false })
        }
      />

      <View style={styles.composer}>
        <Pressable
          onPress={attachPhoto}
          disabled={uploading}
          style={({ pressed }) => [
            styles.attachBtn,
            pressed && { opacity: 0.6 },
          ]}
        >
          {uploading ? (
            <ActivityIndicator color={Colors.gold} size="small" />
          ) : (
            <Ionicons name="image-outline" size={24} color={Colors.gold} />
          )}
        </Pressable>

        <TextInput
          value={body}
          onChangeText={setBody}
          placeholder={coachI18n.messages.type_a_message[locale]}
          placeholderTextColor={Colors.textDim}
          style={styles.input}
          multiline
          maxLength={5000}
        />

        <Pressable
          onPress={send}
          disabled={!body.trim() || sending}
          style={({ pressed }) => [
            styles.sendBtn,
            (!body.trim() || sending) && styles.sendBtnDisabled,
            pressed && body.trim() && { opacity: 0.8 },
          ]}
        >
          {sending ? (
            <ActivityIndicator color={Colors.background} size="small" />
          ) : (
            <Ionicons name="send" size={20} color={Colors.background} />
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loading: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    paddingHorizontal: 12,
    paddingVertical: 16,
    gap: 8,
  },
  bubbleRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  bubbleRowLeft: { justifyContent: 'flex-start' },
  bubbleRowRight: { justifyContent: 'flex-end' },
  bubble: {
    maxWidth: '78%',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 18,
  },
  bubbleMine: {
    backgroundColor: Colors.gold,
    borderBottomRightRadius: 4,
  },
  bubbleTheirs: {
    backgroundColor: Colors.surface,
    borderBottomLeftRadius: 4,
  },
  bubbleText: { fontSize: 15, lineHeight: 21 },
  bubbleTextMine: { color: Colors.background },
  bubbleTextTheirs: { color: Colors.text },
  bubbleTime: {
    fontSize: 10,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  bubbleTimeMine: { color: 'rgba(10,10,10,0.6)' },
  bubbleTimeTheirs: { color: Colors.textDim },
  attachment: {
    width: 200,
    height: 200,
    borderRadius: 12,
    marginBottom: 6,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    paddingBottom: Platform.OS === 'ios' ? 28 : 10,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  attachBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    color: Colors.text,
    backgroundColor: Colors.background,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minHeight: 40,
    maxHeight: 120,
    fontSize: 15,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.gold,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: Colors.border,
  },
});
