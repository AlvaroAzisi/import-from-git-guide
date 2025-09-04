import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  Info, 
  Send, 
  Paperclip, 
  Smile,
  MoreVertical,
  Hash
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { 
  getMessages, 
  sendChatMessage, 
  markMessagesAsRead, 
  subscribeToConversation,
  sendTypingIndicator,
  uploadChatAttachment
} from '../../lib/chat';
import { useToast } from '../../hooks/useToast';
import { MessageBubble } from './MessageBubble';
import { TypingIndicator } from './TypingIndicator';
import { Button } from '../ui/button';
import type { Conversation, ChatMessage, TypingEvent } from '../../lib/chat';

interface ChatWindowProps {
  conversation: Conversation;
  onBack: () => void;
  onToggleInfo: () => void;
  loading?: boolean;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({
  conversation,
  onBack,
  onToggleInfo,
  loading = false
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [typingUsers] = useState<TypingEvent[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(true);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  // Load messages when conversation changes
  useEffect(() => {
    const loadMessages = async () => {
      if (!conversation.id) return;
      
      setLoadingMessages(true);
      try {
        const messagesData = await getMessages(conversation.id);
        setMessages(messagesData);
        
        // Mark messages as read
        await markMessagesAsRead(conversation.id);
      } catch (error) {
        console.error('Error loading messages:', error);
      } finally {
        setLoadingMessages(false);
      }
    };

    loadMessages();
  }, [conversation.id]);

  // Set up real-time subscription
  useEffect(() => {
    if (!conversation.id) return;

    const unsubscribe = subscribeToConversation(
      conversation.id,
      (message) => {
        setMessages(prev => [...prev, message]);
        
        // Mark as read if message is from someone else
        if (message.sender_id !== user?.id) {
          setTimeout(() => markMessagesAsRead(conversation.id), 100);
        }
      }
    );

    return unsubscribe;
  }, [conversation.id, user?.id]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle typing indicator
  const handleTyping = () => {
    sendTypingIndicator(conversation.id);
    
    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Stop typing after 3 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      sendTypingIndicator(conversation.id);
    }, 3000);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    setSending(true);
    try {
  const message = await sendChatMessage(conversation.id, newMessage.trim() ?? '');
      if (message) {
        setNewMessage('');
        sendTypingIndicator(conversation.id);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to send message',
        variant: 'destructive'
      });
    } finally {
      setSending(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileUrl = await uploadChatAttachment(file);
      if (fileUrl) {
        const isImage = file.type.startsWith('image/');
        const content = isImage ? '📷 Image' : `📎 ${file.name}`;
        
        await sendChatMessage(conversation.id, content);
      }
    } catch (error: any) {
      toast({
        title: 'Upload failed',
        description: error.message || 'Failed to upload file',
        variant: 'destructive'
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const getDisplayName = () => {
    if (conversation.type === 'dm' && conversation.other_user) {
      return conversation.other_user.full_name;
    }
    return conversation.name || 'Unnamed Group';
  };

  const getDisplayAvatar = () => {
    if (conversation.type === 'dm' && conversation.other_user) {
      return conversation.other_user.avatar_url || 
             `https://ui-avatars.com/api/?name=${encodeURIComponent(conversation.other_user.full_name ?? conversation.other_user.username ?? 'User')}&background=3b82f6&color=fff`;
    }
    return conversation.avatar_url;
  };

  if (loading || loadingMessages) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Chat Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="flex items-center justify-between p-4 border-b border-white/20 dark:border-gray-700/20 backdrop-blur-md bg-white/20 dark:bg-gray-900/20"
      >
        <div className="flex items-center gap-3">
          <Button
            onClick={onBack}
            variant="ghost"
            size="icon"
            className="lg:hidden"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          
          <div className="flex items-center gap-3">
            {conversation.type === 'dm' ? (
              <img
                src={getDisplayAvatar() || ''}
                alt={getDisplayName()}
                className="w-10 h-10 rounded-full object-cover border-2 border-white/20 dark:border-gray-700/20"
              />
            ) : (
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center border-2 border-white/20 dark:border-gray-700/20">
                <Hash className="w-5 h-5 text-white" />
              </div>
            )}
            
            <div>
              <h2 className="font-semibold text-gray-800 dark:text-gray-200">
                {getDisplayName()}
              </h2>
              {conversation.type === 'dm' && conversation.other_user && (
                <p className="text-sm text-blue-500">
                  @{conversation.other_user.username}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={onToggleInfo}
            variant="ghost"
            size="icon"
            className="hover:bg-white/20 dark:hover:bg-gray-800/20"
          >
            <Info className="w-4 h-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            className="hover:bg-white/20 dark:hover:bg-gray-800/20"
          >
            <MoreVertical className="w-4 h-4" />
          </Button>
        </div>
      </motion.div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <AnimatePresence initial={false}>
          {messages.map((message, index) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.16, delay: index * 0.02 }}
            >
              <MessageBubble
                message={message}
                isOwn={message.sender_id === user?.id}
                showAvatar={
                  index === 0 || 
                  messages[index - 1]?.sender_id !== message.sender_id
                }
              />
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Typing Indicator */}
        <AnimatePresence>
          {typingUsers.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.15 }}
            >
              <TypingIndicator users={typingUsers} />
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, delay: 0.1 }}
        className="p-4 border-t border-white/20 dark:border-gray-700/20 backdrop-blur-md bg-white/20 dark:bg-gray-900/20"
      >
        <form onSubmit={handleSendMessage} className="flex items-end gap-3">
          {/* File Upload */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf,.doc,.docx,.txt"
            onChange={handleFileUpload}
            className="hidden"
          />
          
          <Button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            variant="ghost"
            size="icon"
            disabled={uploading}
            className="hover:bg-white/20 dark:hover:bg-gray-800/20"
          >
            {uploading ? (
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Paperclip className="w-4 h-4" />
            )}
          </Button>

          {/* Message Input */}
          <div className="flex-1 relative">
            <textarea
              value={newMessage}
              onChange={(e) => {
                setNewMessage(e.target.value);
                handleTyping();
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage(e);
                }
              }}
              placeholder="Type a message..."
              rows={1}
              className="w-full px-4 py-3 backdrop-blur-sm bg-white/20 dark:bg-gray-800/20 border border-white/20 dark:border-gray-700/20 rounded-2xl placeholder-gray-500 dark:placeholder-gray-400 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400/50 resize-none"
              style={{ minHeight: '48px', maxHeight: '120px' }}
            />
          </div>

          {/* Emoji Button */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="hover:bg-white/20 dark:hover:bg-gray-800/20"
          >
            <Smile className="w-4 h-4" />
          </Button>

          {/* Send Button */}
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Button
              type="submit"
              disabled={sending || !newMessage.trim()}
              className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-4 py-3 rounded-2xl hover:shadow-lg transition-all duration-200 disabled:opacity-50"
            >
              {sending ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </motion.div>
        </form>
      </motion.div>
    </div>
  );
};