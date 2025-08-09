import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

interface ChatWindowProps {
  chatId: string;
  type: 'friend' | 'group';
  name: string;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({
  chatId,
  type,
  name,
}) => {
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState('');
  const [userId, setUserId] = useState<string | null>(null);

  // fetch current user once
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id);
    });
  }, []);

  useEffect(() => {
    if (!chatId) return;

    // fetch existing messages
    async function load() {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('room_id', chatId)
        .order('created_at');
      setMessages(data ?? []);
    }

    // subscribe to new ones
    const channel = supabase
      .channel(`chat-${chatId}`)
      .on(
        'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `room_id=eq.${chatId}`,
          },
        (payload: any) => {
          setMessages((prev) => [...prev, payload.new]);
        }
      )
      .subscribe();

    load();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatId, type]);

  const sendMessage = async () => {
    if (!text.trim() || !userId) return;
    await supabase.from('messages').insert({
      content: text,
      user_id: userId,
      room_id: chatId,
    });
    setText('');
  };

  return (
    <div className="h-full flex flex-col justify-between border rounded-lg bg-white dark:bg-gray-900 p-4">
      <div className="font-semibold mb-2 text-lg">
        {type === 'friend' ? '@' : '#'}
        {name}
      </div>
      <div className="flex-1 overflow-y-auto space-y-2 mb-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`p-2 rounded ${
              msg.user_id === userId
                ? 'bg-blue-200 dark:bg-blue-800 self-end'
                : 'bg-gray-100 dark:bg-gray-700 self-start'
            }`}
          >
            {msg.content}
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 px-3 py-2 border rounded dark:bg-gray-800"
        />
        <button
          onClick={sendMessage}
          className="px-4 py-2 bg-blue-500 text-white rounded"
        >
          Send
        </button>
      </div>
    </div>
  );
};
