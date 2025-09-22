import React, { useState, useEffect, useRef } from 'react';
import { sendMessage, subscribeToMessages } from '../../lib/chat';
import type { Conversation, ChatMessage } from '../../lib/chat';
import MessageComposer from './MessageComposer';
import { MessageBubble } from './MessageBubble';
import { supabase } from '../../integrations/supabase/client';

interface ChatWindowProps {
  conversation: Conversation | null;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ conversation }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages([]); // Clear messages when conversation changes
    if (!conversation) return;

    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('*, profiles(username, avatar_url)')
        .eq('conversation_id', conversation.id)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching messages:', error);
      } else {
        setMessages(data as ChatMessage[]);
      }
    };

    fetchMessages();

    const channel = subscribeToMessages(conversation.id, (newMessage) => {
      setMessages((prevMessages) => [...prevMessages, newMessage]);
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (content: string) => {
    if (!conversation) return;
    const { error } = await sendMessage(conversation.id, content);
    if (error) {
      console.error('Error sending message:', error);
    }
  };

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <p className="text-gray-500">Select a conversation to start chatting.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-gray-50 dark:bg-gray-900">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-bold">{conversation.name}</h2>
      </div>
      <div className="flex-1 p-4 overflow-y-auto">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
        <div ref={messagesEndRef} />
      </div>
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <MessageComposer onSend={handleSendMessage} />
      </div>
    </div>
  );
};
