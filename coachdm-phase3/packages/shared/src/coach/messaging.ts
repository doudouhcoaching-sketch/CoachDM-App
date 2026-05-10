// ============================================================
// Coach DM · Shared · Messaging client (Supabase)
// ============================================================

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  Message,
  MessageThread,
  ThreadWithParticipants,
  MessageRefType,
} from './types';

export function createMessagingClient(supabase: SupabaseClient) {
  return {
    /**
     * List threads for the current user (coach or client side).
     * Joined with profile names for display.
     */
    async listThreads(): Promise<ThreadWithParticipants[]> {
      const { data, error } = await supabase
        .from('message_threads')
        .select(
          `
          *,
          coach:profiles!message_threads_coach_user_id_fkey(full_name, avatar_url),
          client:profiles!message_threads_client_user_id_fkey(full_name, avatar_url)
        `
        )
        .order('last_message_at', { ascending: false, nullsFirst: false });

      if (error) throw error;

      return (data ?? []).map((row: any) => ({
        ...row,
        coach_display_name: row.coach?.full_name ?? 'Coach',
        client_display_name: row.client?.full_name ?? 'Client',
        coach_avatar_url: row.coach?.avatar_url ?? null,
        client_avatar_url: row.client?.avatar_url ?? null,
      }));
    },

    async getThread(threadId: string): Promise<MessageThread | null> {
      const { data, error } = await supabase
        .from('message_threads')
        .select('*')
        .eq('id', threadId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },

    /**
     * Paginated history. Returns oldest→newest in the returned slice.
     */
    async listMessages(
      threadId: string,
      opts: { limit?: number; before?: string } = {}
    ): Promise<Message[]> {
      const limit = opts.limit ?? 50;
      let q = supabase
        .from('messages')
        .select('*')
        .eq('thread_id', threadId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (opts.before) q = q.lt('created_at', opts.before);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []).slice().reverse();
    },

    async sendMessage(params: {
      threadId: string;
      recipientUserId: string;
      body: string;
      attachmentUrl?: string;
      attachmentType?: 'image' | 'video' | 'pdf' | 'audio';
      refType?: MessageRefType;
      refId?: string;
    }): Promise<Message> {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('messages')
        .insert({
          thread_id: params.threadId,
          sender_user_id: auth.user.id,
          recipient_user_id: params.recipientUserId,
          body: params.body,
          attachment_url: params.attachmentUrl ?? null,
          attachment_type: params.attachmentType ?? null,
          ref_type: params.refType ?? null,
          ref_id: params.refId ?? null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    async markThreadRead(threadId: string): Promise<void> {
      const { error } = await supabase.rpc('mark_thread_read', {
        p_thread_id: threadId,
      });
      if (error) throw error;
    },

    /**
     * Subscribe to live messages on a thread.
     * Returns a cleanup function.
     */
    subscribeToThread(
      threadId: string,
      onMessage: (msg: Message) => void
    ): () => void {
      const channel = supabase
        .channel(`thread:${threadId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `thread_id=eq.${threadId}`,
          },
          (payload) => onMessage(payload.new as Message)
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    },

    /**
     * Subscribe to thread list changes (new messages bumping list, unread counts).
     */
    subscribeToThreadList(onChange: () => void): () => void {
      const channel = supabase
        .channel('thread-list')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'message_threads',
          },
          onChange
        )
        .subscribe();
      return () => {
        supabase.removeChannel(channel);
      };
    },

    async uploadAttachment(
      file: Blob,
      filename: string,
      userId: string
    ): Promise<{ url: string; path: string }> {
      const path = `${userId}/${Date.now()}-${filename}`;
      const { error } = await supabase.storage
        .from('message-attachments')
        .upload(path, file);
      if (error) throw error;
      const { data } = supabase.storage
        .from('message-attachments')
        .getPublicUrl(path);
      return { url: data.publicUrl, path };
    },
  };
}

export type MessagingClient = ReturnType<typeof createMessagingClient>;
