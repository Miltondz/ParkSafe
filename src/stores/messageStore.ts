import { create } from 'zustand';
import { supabase } from '../lib/supabase';

interface Message {
  id: string;
  sender_id: string;
  recipient_id?: string;
  group_id?: string;
  content: string;
  type: 'normal' | 'emergency' | 'system';
  created_at: string;
  sender?: {
    email: string;
    full_name: string | null;
    avatar_url: string | null;
  };
}

interface MessageState {
  messages: Message[];
  loading: boolean;
  error: string | null;
  fetchMessages: () => Promise<void>;
  sendMessage: (content: string, recipientId?: string, groupId?: string, type?: 'normal' | 'emergency') => Promise<void>;
  subscribeToMessages: () => void;
  unsubscribeFromMessages: () => void;
}

export const useMessageStore = create<MessageState>((set, get) => ({
  messages: [],
  loading: false,
  error: null,

  fetchMessages: async () => {
    set({ loading: true });
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:profiles!messages_sender_id_fkey (
            email,
            full_name,
            avatar_url
          )
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      set({ messages: data || [], error: null });
    } catch (error: any) {
      set({ error: error.message });
    } finally {
      set({ loading: false });
    }
  },

  sendMessage: async (content, recipientId, groupId, type = 'normal') => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .insert([
          {
            content,
            recipient_id: recipientId,
            group_id: groupId,
            type
          }
        ])
        .select(`
          *,
          sender:profiles!messages_sender_id_fkey (
            email,
            full_name,
            avatar_url
          )
        `)
        .single();

      if (error) throw error;

      const messages = get().messages;
      set({ messages: [data, ...messages] });
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },

  subscribeToMessages: () => {
    const subscription = supabase
      .channel('messages')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'messages' 
      }, async (payload) => {
        if (payload.eventType === 'INSERT') {
          const { data, error } = await supabase
            .from('messages')
            .select(`
              *,
              sender:profiles!messages_sender_id_fkey (
                email,
                full_name,
                avatar_url
              )
            `)
            .eq('id', payload.new.id)
            .single();

          if (!error && data) {
            const messages = get().messages;
            set({ messages: [data, ...messages] });
          }
        }
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  },

  unsubscribeFromMessages: () => {
    supabase.removeAllChannels();
  }
}));