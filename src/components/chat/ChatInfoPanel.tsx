import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  X, 
  Users, 
  Settings, 
  UserMinus, 
  Crown,
  Hash,
  Calendar,
  MessageCircle
} from 'lucide-react';
// Removed unused useAuth import to fix lint error
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import type { Conversation, ConversationMember } from '../../lib/chat';

interface ChatInfoPanelProps {
  conversation: Conversation;
  onClose: () => void;
}

export const ChatInfoPanel: React.FC<ChatInfoPanelProps> = ({
  conversation,
  onClose
}) => {
  // Removed unused 'user' variable to fix lint error
  const [members, setMembers] = useState<ConversationMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadMembers = async () => {
      if (conversation.type === 'dm') {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('conversation_members')
          .select(`
            *,
            profile:profiles(*)
          `)
          .eq('conversation_id', conversation.id)
          .order('joined_at', { ascending: true });

        if (error) throw error;
        setMembers(data || []);
      } catch (error) {
        console.error('Error loading members:', error);
      } finally {
        setLoading(false);
      }
    };

    loadMembers();
  }, [conversation.id, conversation.type]);

  const getDisplayName = () => {
    if (conversation.type === 'dm' && conversation.other_user) {
      // fallback to username or 'Unknown' if full_name is missing
      return conversation.other_user.full_name ?? conversation.other_user.username ?? 'Unknown';
    }
    return conversation.name || 'Unnamed Group';
  };

  const getDisplayAvatar = () => {
    if (conversation.type === 'dm' && conversation.other_user) {
      // fallback to generated avatar if avatar_url is null/undefined
      return conversation.other_user.avatar_url ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(conversation.other_user.full_name ?? conversation.other_user.username ?? 'User')}&background=3b82f6&color=fff`;
    }
    return conversation.avatar_url ?? undefined;
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.22, ease: [0.22, 0.9, 0.26, 1] }}
      className="h-full backdrop-blur-md bg-white/30 dark:bg-gray-900/30 flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/20 dark:border-gray-700/20">
        <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200">
          {conversation.type === 'dm' ? 'Profile' : 'Group Info'}
        </h2>
        <Button
          onClick={onClose}
          variant="ghost"
          size="icon"
          className="hover:bg-white/20 dark:hover:bg-gray-800/20"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Profile/Group Header */}
        <div className="text-center">
          <div className="relative inline-block mb-4">
            {conversation.type === 'dm' ? (
              <Avatar className="w-20 h-20 border-4 border-white/20 dark:border-gray-700/20">
                <AvatarImage src={getDisplayAvatar()} alt={getDisplayName()} />
                <AvatarFallback className="text-xl font-bold bg-gradient-to-br from-blue-500 to-purple-500 text-white">
                  {getDisplayName().split(' ').map(n => n[0]).join('').toUpperCase()}
                </AvatarFallback>
              </Avatar>
            ) : (
              <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center border-4 border-white/20 dark:border-gray-700/20">
                <Hash className="w-10 h-10 text-white" />
              </div>
            )}
          </div>
          
          <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-1">
            {getDisplayName()}
          </h3>
          
          {conversation.type === 'dm' && conversation.other_user?.username && (
            <p className="text-blue-500 font-medium">
              @{conversation.other_user.username}
            </p>
          )}
          
          {conversation.description && (
            <p className="text-gray-600 dark:text-gray-400 text-sm mt-2">
              {conversation.description}
            </p>
          )}
        </div>

        {/* DM Profile Info */}
  {conversation.type === 'dm' && conversation.other_user && (
          <div className="space-y-4">
            {conversation.other_user.bio && (
              <div>
                <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">About</h4>
                <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                  {conversation.other_user.bio}
                </p>
              </div>
            )}

            {Array.isArray(conversation.other_user.interests) && conversation.other_user.interests.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">Interests</h4>
                <div className="flex flex-wrap gap-2">
                  {conversation.other_user.interests.map((interest: string, idx: number) => (
                    <span
                      key={idx}
                      className="px-2 py-1 bg-blue-100/50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg text-xs"
                    >
                      {interest}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-white/20 dark:bg-gray-800/20 rounded-xl">
                <div className="text-lg font-bold text-gray-800 dark:text-gray-200">
                  {conversation.other_user.xp ?? 0}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">XP</div>
              </div>
              <div className="text-center p-3 bg-white/20 dark:bg-gray-800/20 rounded-xl">
                <div className="text-lg font-bold text-gray-800 dark:text-gray-200">
                  {Math.floor((conversation.other_user.xp ?? 0) / 1000) + 1}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Level</div>
              </div>
            </div>
          </div>
        )}

        {/* Group Members */}
        {conversation.type === 'group' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Members ({members.length})
              </h4>
              <Button
                variant="ghost"
                size="sm"
                className="hover:bg-white/20 dark:hover:bg-gray-800/20"
              >
                <Settings className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-2">
              {loading ? (
                [...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-2 animate-pulse">
                    <div className="w-8 h-8 bg-white/20 dark:bg-gray-700/20 rounded-full"></div>
                    <div className="flex-1">
                      <div className="h-3 bg-white/20 dark:bg-gray-700/20 rounded w-3/4 mb-1"></div>
                      <div className="h-2 bg-white/10 dark:bg-gray-700/10 rounded w-1/2"></div>
                    </div>
                  </div>
                ))
              ) : (
                members.map((member) => (
                  <motion.div
                    key={member.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/20 dark:hover:bg-gray-800/20 transition-colors"
                  >
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={member.profile?.avatar_url ?? undefined} />
                      <AvatarFallback className="text-xs bg-gradient-to-br from-blue-500 to-purple-500 text-white">
                        {member.profile?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <p className="font-medium text-gray-800 dark:text-gray-200 text-sm truncate">
                          {member.profile?.full_name ?? member.profile?.username ?? 'Unknown'}
                        </p>
                        {member.role === 'admin' && (
                          <Crown className="w-3 h-3 text-yellow-500" />
                        )}
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        @{member.profile?.username ?? 'unknown'}
                      </p>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Conversation Info */}
        <div className="space-y-3">
          <h4 className="font-semibold text-gray-800 dark:text-gray-200">Details</h4>
          
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <Calendar className="w-4 h-4" />
              <span>Created {new Date(conversation.created_at).toLocaleDateString()}</span>
            </div>
            
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <MessageCircle className="w-4 h-4" />
              <span>Last active {conversation.last_message_at ? new Date(conversation.last_message_at).toLocaleDateString() : 'Unknown'}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2">
          {conversation.type === 'group' && (
            <Button
              variant="outline"
              className="w-full justify-start bg-red-50/50 border-red-200/50 text-red-600 hover:bg-red-100/50"
            >
              <UserMinus className="w-4 h-4 mr-2" />
              Leave Group
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
};