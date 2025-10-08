import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Loader2, AlertCircle, UserPlus } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { 
  getOrCreateConversation, 
  fetchMessages, 
  sendMessage, 
  subscribeToMessages,
  checkFriendship,
  type Message 
} from '../../lib/messaging';

interface DirectMessageWindowProps {
  otherUserId: string;
  otherUser: {
    id: string;
    username: string;
    full_name: string;
    avatar_url?: string;
  };
}

export const DirectMessageWindow: React.FC<DirectMessageWindowProps> = ({ 
  otherUserId, 
  otherUser 
}) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [areFriends, setAreFriends] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Check friendship and load conversation
  useEffect(() => {
    const init = async () => {
      if (!user) return;

      setLoading(true);
      setError(null);

      // Check if users are friends
      const friendshipStatus = await checkFriendship(user.id, otherUserId);
      setAreFriends(friendshipStatus);

      if (!friendshipStatus) {
        setLoading(false);
        return;
      }

      try {
        // Get or create conversation
        const convId = await getOrCreateConversation(otherUserId);
        
        if (convId) {
          setConversationId(convId);
          
          // Load messages
          const msgs = await fetchMessages(convId);
          setMessages(msgs);
        }
      } catch (err: any) {
        console.error('Error initializing chat:', err);
        if (err.message === 'MUST_BE_FRIENDS') {
          setAreFriends(false);
        } else {
          setError('Failed to load conversation');
        }
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [user, otherUserId]);

  // Subscribe to new messages
  useEffect(() => {
    if (!conversationId) return;

    const unsubscribe = subscribeToMessages(conversationId, (newMsg) => {
      setMessages((prev) => {
        // Avoid duplicates
        if (prev.some((m) => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });
    });

    return unsubscribe;
  }, [conversationId]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !conversationId || sending) return;

    setSending(true);
    const content = newMessage.trim();
    setNewMessage('');

    try {
      const sentMsg = await sendMessage(conversationId, content);
      
      if (sentMsg) {
        // Message will be added via realtime subscription
        // But add optimistically for instant feedback
        setMessages((prev) => {
          if (prev.some((m) => m.id === sentMsg.id)) return prev;
          return [...prev, sentMsg];
        });
      }
    } catch (err) {
      console.error('Error sending message:', err);
      setNewMessage(content); // Restore message on error
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!areFriends) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <div className="backdrop-blur-md bg-card/40 rounded-2xl p-8 max-w-md border border-border/20">
          <UserPlus className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-xl font-semibold text-foreground mb-2">
            Not Friends Yet
          </h3>
          <p className="text-muted-foreground mb-6">
            You can only chat with accepted friends. Send {otherUser.full_name} a friend request to start chatting.
          </p>
          <button className="px-6 py-2.5 bg-primary text-primary-foreground rounded-xl hover:opacity-90 transition-all">
            Send Friend Request
          </button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="backdrop-blur-md bg-destructive/10 rounded-2xl p-6 max-w-md border border-destructive/20 flex items-center gap-3">
          <AlertCircle className="w-6 h-6 text-destructive" />
          <p className="text-destructive">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="backdrop-blur-md bg-card/40 border-b border-border/20 p-4 md:p-6">
        <div className="flex items-center gap-3">
          {otherUser.avatar_url ? (
            <img
              src={otherUser.avatar_url}
              alt={otherUser.full_name}
              className="w-10 h-10 md:w-12 md:h-12 rounded-full object-cover border-2 border-primary/20"
            />
          ) : (
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-primary/20 flex items-center justify-center">
              <span className="text-lg font-semibold text-primary">
                {otherUser.full_name[0].toUpperCase()}
              </span>
            </div>
          )}
          <div>
            <h2 className="text-lg md:text-xl font-semibold text-foreground">
              {otherUser.full_name}
            </h2>
            <p className="text-sm text-muted-foreground">@{otherUser.username}</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
        <AnimatePresence initial={false}>
          {messages.map((message) => {
            const isOwn = message.sender_id === user?.id;
            
            return (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[70%] md:max-w-[60%] ${
                    isOwn
                      ? 'bg-gradient-to-br from-primary to-primary/80 text-primary-foreground'
                      : 'backdrop-blur-md bg-card/60 border border-border/30 text-foreground'
                  } rounded-2xl px-4 py-2.5 shadow-lg`}
                >
                  {!isOwn && message.sender && (
                    <p className="text-xs font-medium mb-1 opacity-70">
                      {message.sender.full_name}
                    </p>
                  )}
                  <p className="whitespace-pre-wrap break-words">{message.content}</p>
                  <p className={`text-xs mt-1 ${isOwn ? 'opacity-70' : 'opacity-50'}`}>
                    {new Date(message.created_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="backdrop-blur-md bg-card/40 border-t border-border/20 p-4 md:p-6">
        <div className="flex gap-3 items-end">
          <textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message... (Press Enter to send)"
            rows={1}
            className="flex-1 resize-none rounded-xl border border-border/50 bg-background/60 backdrop-blur-sm px-4 py-3 text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all outline-none max-h-32"
            disabled={sending}
          />
          <motion.button
            type="submit"
            disabled={!newMessage.trim() || sending}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="p-3 rounded-xl bg-primary text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
          >
            {sending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </motion.button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Press <kbd className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground">Enter</kbd> to send, <kbd className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground">Shift+Enter</kbd> for new line
        </p>
      </form>
    </div>
  );
};
