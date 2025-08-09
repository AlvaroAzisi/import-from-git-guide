import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { subscribeToGroupMessages } from '@/lib/supabaseRealtime';
import MessageComposer from './MessageComposer';

interface ChatGroupProps {
  groupId: string;
  name: string;
}

const ChatGroup: React.FC<ChatGroupProps> = ({ groupId, name }) => {
  const [messages, setMessages] = useState<any[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('group_messages')
        .select('*')
        .eq('group_id', groupId)
        .order('created_at');
      setMessages(data ?? []);
    }
    load();
    const unsub = subscribeToGroupMessages(groupId, (row) => setMessages((prev) => [...prev, row]));
    return () => unsub();
  }, [groupId]);

  const send = async (text: string) => {
    if (!userId) return;
    await supabase.from('group_messages').insert({ group_id: groupId, sender_id: userId, content: text });
  };

  return (
    <div className="h-full flex flex-col justify-between border rounded-lg bg-white dark:bg-gray-900 p-4">
      <div className="font-semibold mb-2 text-lg">#{name}</div>
      <div className="flex-1 overflow-y-auto space-y-2 mb-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`p-2 rounded ${msg.sender_id === userId ? 'bg-blue-200 dark:bg-blue-800 self-end' : 'bg-gray-100 dark:bg-gray-700 self-start'}`}
          >
            {msg.content}
          </div>
        ))}
      </div>
      <MessageComposer onSend={send} disabled={!userId} />
    </div>
  );
};

export default ChatGroup;
