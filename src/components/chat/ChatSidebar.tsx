import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MessageCircle } from 'lucide-react';
import type { Conversation } from '../../lib/chat';
import { supabase } from '../../integrations/supabase/client';

interface ChatSidebarProps {
  conversations?: Conversation[];
  activeConversation: Conversation | null;
  onConversationSelect: (conversation: Conversation) => void;
  minimized?: boolean;
  onToggleMinimized?: () => void;
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({ conversations = [], activeConversation, onConversationSelect }) => {
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);

  useEffect(() => {
    const channel = supabase.channel('users', { config: { presence: { key: 'user_id' } } });

    channel.on('presence', { event: 'sync' }, () => {
      const newState = channel.presenceState();
      const currentOnlineUsers = Object.values(newState).flatMap((users: any) => users.map((user: any) => user.user_id));
      setOnlineUsers(currentOnlineUsers);
    });

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          channel.track({ user_id: user.id, username: user.email });
        }
      }
    });

    return () => {
      channel.unsubscribe();
    };
  }, []);

  return (
    <div className="h-full backdrop-blur-md bg-background/40 border border-border/50 rounded-2xl p-4 md:p-6 2xl:p-8">
      <h2 className="text-base md:text-lg 2xl:text-xl font-bold mb-4 md:mb-6 text-foreground flex items-center gap-2">
        <MessageCircle className="w-4 h-4 md:w-5 md:h-5 text-primary" />
        Conversations
      </h2>
      <div className="space-y-2 2xl:space-y-3">
        {conversations.map((convo, index) => (
          <motion.div
            key={convo.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
          >
            <motion.div
              whileHover={{ scale: 1.02, x: 4 }}
              whileTap={{ scale: 0.98 }}
              className={`group p-2.5 md:p-3 2xl:p-4 cursor-pointer rounded-xl transition-all duration-300 ${
                activeConversation?.id === convo.id
                  ? 'bg-primary/20 border border-primary/30 shadow-md'
                  : 'backdrop-blur-sm bg-card/30 hover:bg-card/50 border border-border/30 hover:border-border/50'
              }`}
              onClick={() => onConversationSelect(convo)}
            >
              <div className="flex items-center gap-2 md:gap-3">
                <div className="relative">
                  <div className="w-8 h-8 md:w-10 md:h-10 2xl:w-12 2xl:h-12 rounded-full bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center">
                    <span className="text-xs md:text-sm 2xl:text-base font-semibold text-foreground">
                      {convo.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  {onlineUsers.includes(convo.id) && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 dark:bg-green-400 rounded-full border-2 border-background"
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm md:text-base 2xl:text-lg font-medium truncate transition-colors ${
                    activeConversation?.id === convo.id
                      ? 'text-primary'
                      : 'text-foreground group-hover:text-primary'
                  }`}>
                    {convo.name}
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
