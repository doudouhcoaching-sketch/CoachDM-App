import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import {
  AICoachClient,
  t,
  type AIMessage,
  type AIIntent,
  type AIChatResponse,
} from '@coachdm/shared/ai';
import { supabase } from '../../lib/supabase';
import { useUserLang } from '../../hooks/useUserLang';

type Props = NativeStackScreenProps<any, 'AIChat'>;

const PALETTE = {
  bg: '#0A0A0A',
  bgCard: '#141414',
  bgUser: '#1F2937',
  gold: '#D4AF37',
  text: '#FAFAFA',
  textSecondary: '#9CA3AF',
  border: '#262626',
  green: '#10B981',
  red: '#EF4444',
  blue: '#38BDF8',
  violet: '#A78BFA',
};

const QUICK_ACTIONS: { intent: AIIntent; icon: keyof typeof Ionicons.glyphMap; key: string }[] = [
  { intent: 'session_suggest', icon: 'barbell-outline', key: 'ai.chat.quick.session' },
  { intent: 'recovery_reco', icon: 'bed-outline', key: 'ai.chat.quick.recovery' },
  { intent: 'plateau_check', icon: 'analytics-outline', key: 'ai.chat.quick.plateau' },
  { intent: 'program_adjust', icon: 'options-outline', key: 'ai.chat.quick.adjust' },
];

const TOOL_COLORS: Record<string, string> = {
  get_client_context: PALETTE.blue,
  scan_plateau: PALETTE.red,
  propose_adjustment: PALETTE.violet,
  compute_recovery: PALETTE.green,
  suggest_session: PALETTE.gold,
  search_history: PALETTE.textSecondary,
};

export default function AIChatScreen({ route, navigation }: Props) {
  const { lang } = useUserLang();
  const initialConv = (route.params as any)?.conversationId as string | null;
  const [conversationId, setConversationId] = useState<string | null>(initialConv ?? null);
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [input, setInput] = useState('');
  const [intent, setIntent] = useState<AIIntent>('general');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(!!initialConv);
  const listRef = useRef<FlatList<AIMessage>>(null);
  const client = useMemo(() => new AICoachClient(supabase), []);

  useEffect(() => {
    if (!conversationId) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const rows = await client.getMessages(conversationId);
        setMessages(rows);
      } catch (e: any) {
        Alert.alert('Error', e?.message ?? String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [conversationId, client]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
    }
  }, [messages.length]);

  const send = useCallback(
    async (text: string, useIntent: AIIntent = intent) => {
      const content = text.trim();
      if (!content || sending) return;

      const optimistic: AIMessage = {
        id: `tmp-${Date.now()}`,
        conversation_id: conversationId ?? 'pending',
        role: 'user',
        content,
        tokens_in: null,
        tokens_out: null,
        model: null,
        tool_calls: null,
        latency_ms: null,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, optimistic]);
      setInput('');
      setSending(true);

      try {
        const res: AIChatResponse = await client.chat({
          conversation_id: conversationId,
          message: content,
          intent: useIntent,
          lang,
        });
        if (!conversationId) setConversationId(res.conversation_id);
        // Refresh messages from server
        const fresh = await client.getMessages(res.conversation_id);
        setMessages(fresh);
      } catch (e: any) {
        setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
        Alert.alert('Error', e?.message ?? String(e));
      } finally {
        setSending(false);
      }
    },
    [client, conversationId, intent, lang, sending],
  );

  const renderToolBadge = (toolName: string) => {
    const color = TOOL_COLORS[toolName] ?? PALETTE.textSecondary;
    const key = `ai.chat.tool.${toolName}`;
    return (
      <View key={toolName} style={[styles.toolBadge, { borderColor: color }]}>
        <View style={[styles.toolDot, { backgroundColor: color }]} />
        <Text style={[styles.toolText, { color }]}>{t(key, lang)}</Text>
      </View>
    );
  };

  const renderMessage = ({ item }: { item: AIMessage }) => {
    if (item.role === 'tool') {
      // Tool message — show as subtle indicator
      const toolName = (item.tool_calls as any)?.tool_name ?? 'tool';
      return (
        <View style={styles.toolRow}>
          <Ionicons name="construct-outline" size={12} color={PALETTE.textSecondary} />
          <Text style={styles.toolRowText}>
            {t('ai.chat.tool.ran', lang)} · {t(`ai.chat.tool.${toolName}`, lang)}
          </Text>
        </View>
      );
    }

    const isUser = item.role === 'user';
    const toolCalls = (item.tool_calls as any)?.calls as
      | { tool_name: string }[]
      | undefined;

    return (
      <View style={[styles.bubbleWrap, isUser ? styles.bubbleWrapUser : styles.bubbleWrapAi]}>
        {!isUser && (
          <View style={styles.aiAvatar}>
            <Ionicons name="sparkles" size={14} color={PALETTE.gold} />
          </View>
        )}
        <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAi]}>
          <Text style={styles.bubbleText}>{item.content}</Text>
          {!isUser && toolCalls && toolCalls.length > 0 && (
            <View style={styles.toolList}>
              {toolCalls.map((c) => renderToolBadge(c.tool_name))}
            </View>
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.root, styles.center]}>
        <ActivityIndicator color={PALETTE.gold} size="large" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
    >
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.disclaimer}>
            <Ionicons name="information-circle-outline" size={14} color={PALETTE.textSecondary} />
            <Text style={styles.disclaimerText}>{t('ai.disclaimer.medical', lang)}</Text>
          </View>
        }
        ListFooterComponent={
          sending ? (
            <View style={styles.thinking}>
              <ActivityIndicator color={PALETTE.gold} size="small" />
              <Text style={styles.thinkingText}>{t('ai.chat.thinking', lang)}</Text>
            </View>
          ) : null
        }
      />

      {messages.length === 0 && (
        <View style={styles.quickWrap}>
          <Text style={styles.quickLabel}>{t('ai.chat.quick.label', lang)}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickScroll}>
            {QUICK_ACTIONS.map((q) => (
              <TouchableOpacity
                key={q.intent}
                style={styles.quickChip}
                onPress={() => {
                  setIntent(q.intent);
                  send(t(q.key, lang), q.intent);
                }}
                activeOpacity={0.85}
              >
                <Ionicons name={q.icon} size={14} color={PALETTE.gold} />
                <Text style={styles.quickText}>{t(q.key, lang)}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder={t('ai.chat.placeholder', lang)}
          placeholderTextColor={PALETTE.textSecondary}
          multiline
          maxLength={2000}
          editable={!sending}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!input.trim() || sending) && styles.sendBtnDisabled]}
          onPress={() => send(input)}
          disabled={!input.trim() || sending}
          activeOpacity={0.85}
        >
          <Ionicons name="send" size={18} color={PALETTE.bg} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: PALETTE.bg },
  center: { alignItems: 'center', justifyContent: 'center' },
  list: { padding: 16, paddingBottom: 24, gap: 10 },
  disclaimer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: PALETTE.bgCard,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: PALETTE.border,
    marginBottom: 12,
  },
  disclaimerText: { color: PALETTE.textSecondary, fontSize: 11, flex: 1, lineHeight: 16 },

  bubbleWrap: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginVertical: 4 },
  bubbleWrapUser: { justifyContent: 'flex-end' },
  bubbleWrapAi: { justifyContent: 'flex-start' },
  aiAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: PALETTE.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: PALETTE.gold,
  },
  bubble: { maxWidth: '82%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16 },
  bubbleUser: {
    backgroundColor: PALETTE.gold,
    borderBottomRightRadius: 4,
  },
  bubbleAi: {
    backgroundColor: PALETTE.bgCard,
    borderWidth: 1,
    borderColor: PALETTE.border,
    borderBottomLeftRadius: 4,
  },
  bubbleText: { color: PALETTE.text, fontSize: 14, lineHeight: 20 },

  toolList: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  toolBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: PALETTE.bg,
  },
  toolDot: { width: 6, height: 6, borderRadius: 3 },
  toolText: { fontSize: 10, fontWeight: '700' },

  toolRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 12,
    alignSelf: 'center',
  },
  toolRowText: { color: PALETTE.textSecondary, fontSize: 11, fontStyle: 'italic' },

  thinking: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    alignSelf: 'flex-start',
  },
  thinkingText: { color: PALETTE.textSecondary, fontSize: 13 },

  quickWrap: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: PALETTE.border,
  },
  quickLabel: { color: PALETTE.textSecondary, fontSize: 11, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  quickScroll: { gap: 8, paddingRight: 16 },
  quickChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: PALETTE.bgCard,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: PALETTE.gold,
  },
  quickText: { color: PALETTE.text, fontSize: 12, fontWeight: '600' },

  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: PALETTE.bgCard,
    borderTopWidth: 1,
    borderTopColor: PALETTE.border,
  },
  input: {
    flex: 1,
    color: PALETTE.text,
    fontSize: 14,
    backgroundColor: PALETTE.bg,
    borderWidth: 1,
    borderColor: PALETTE.border,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxHeight: 120,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: PALETTE.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },
});
