import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../hooks/useLanguage';
import { Navigate, useParams } from 'react-router-dom';
import { 
  ArrowLeft, 
  Users, 
  MessageCircle, 
  Send, 
  UserMinus,
  AlertTriangle,
  Crown,
  MoreVertical
} from 'lucide-react';
import { getRoomMembers, getRoom, leaveRoom, getMessages, sendMessage, isRoomMember } from '../lib/rooms';
import { useToast } from '../hooks/useToast';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Button } from '../components/ui/button';

import type { Room, RoomMember, Message } from '../lib/rooms';

const RuangkuPage: React.FC = () => {
  // ✅ All hooks called at the top level FIRST
  const { user, profile, loading } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const { roomId } = useParams<{ roomId: string }>();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [createRoomOpen, setCreateRoomOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'members'>('chat');
  const [room, setRoom] = useState<Room | null>(null);
  const [members, setMembers] = useState<RoomMember[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loadingRoom, setLoadingRoom] = useState(true);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [leavingRoom, setLeavingRoom] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [isMember, setIsMember] = useState(false);

  // Load room data
  useEffect(() => {
    const loadRoom = async () => {
      if (!roomId || !user) return;
      
      setLoadingRoom(true);
      try {
        const [roomData, memberCheck] = await Promise.all([
          getRoom(roomId),
          isRoomMember(roomId)
        ]);
        
        setRoom(roomData);
        setIsMember(memberCheck);
      } catch (error) {
        console.error('Error loading room:', error);
        toast({
          title: t('common.error'),
          description: 'Failed to load room details',
          variant: 'destructive'
        });
      } finally {
        setLoadingRoom(false);
      }
    };

    loadRoom();
  }, [roomId, user, toast, t]);

  // Load members
  useEffect(() => {
    const loadMembers = async () => {
      if (!roomId || !isMember) return;
      
      setLoadingMembers(true);
      try {
        const membersData = await getRoomMembers(roomId);
        setMembers(membersData);
      } catch (error) {
        console.error('Error loading members:', error);
      } finally {
        setLoadingMembers(false);
      }
    };

    loadMembers();
  }, [roomId, isMember]);

  // Load messages
  useEffect(() => {
    const loadMessages = async () => {
      if (!roomId || !isMember) return;
      
      setLoadingMessages(true);
      try {
        const messagesData = await getMessages(roomId, 50);
        setMessages(messagesData);
      } catch (error) {
        console.error('Error loading messages:', error);
      } finally {
        setLoadingMessages(false);
      }
    };

    loadMessages();
  }, [roomId, isMember]);

  // ✅ Early returns AFTER all hooks
  if (loading || loadingRoom) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 flex items-center justify-center">
        <div className="backdrop-blur-md bg-white/30 rounded-3xl border border-white/20 shadow-lg p-8">
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
          <p className="text-gray-600 mt-4">Loading room...</p>
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    return <Navigate to="/" replace />;
  }

  if (!room) {
    return <Navigate to="/home" replace />;
  }

  if (!isMember) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 flex items-center justify-center">
        <div className="backdrop-blur-md bg-white/30 rounded-3xl border border-white/20 shadow-lg p-8 text-center max-w-md">
          <AlertTriangle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-6">You need to be a member of this room to view its content.</p>
          <Button
            onClick={() => window.history.back()}
            className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !roomId || sendingMessage) return;

    setSendingMessage(true);
    try {
      const message = await sendMessage(roomId, newMessage.trim());
      if (message) {
        setMessages(prev => [...prev, message]);
        setNewMessage('');
      }
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error.message || 'Failed to send message',
        variant: 'destructive'
      });
    } finally {
      setSendingMessage(false);
    }
  };

  const handleLeaveRoom = async () => {
    if (!roomId || leavingRoom) return;

    setLeavingRoom(true);
    try {
      const success = await leaveRoom(roomId);
      if (success) {
        toast({
          title: t('common.success'),
          description: 'Successfully left the room'
        });
        // Navigate back to home
        window.location.href = '/home';
      } else {
        throw new Error('Failed to leave room');
      }
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error.message || 'Failed to leave room',
        variant: 'destructive'
      });
    } finally {
      setLeavingRoom(false);
      setShowLeaveConfirm(false);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <Crown className="w-4 h-4 text-yellow-500" />;
      default:
        return null;
    }
  };

  const isAdmin = members.find(m => m.user_id === user.id)?.role === 'admin';

  return (<>
    <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="backdrop-blur-md bg-white/30 dark:bg-gray-900/30 rounded-3xl border border-white/20 dark:border-gray-700/20 shadow-lg p-6 mb-6"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                onClick={() => window.history.back()}
                variant="ghost"
                size="icon"
                className="bg-white/20 dark:bg-gray-800/20 backdrop-blur-sm border border-white/20 dark:border-gray-700/20"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              
              <div>
                <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-200">
                  {room.name}
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  {room.subject} • {members.length} members
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {!isAdmin && (
                <Button
                  onClick={() => setShowLeaveConfirm(true)}
                  variant="outline"
                  className="bg-red-50/50 border-red-200 text-red-600 hover:bg-red-100/50"
                >
                  <UserMinus className="w-4 h-4 mr-2" />
                  Leave Room
                </Button>
              )}
              
              <Button
                variant="ghost"
                size="icon"
                className="bg-white/20 dark:bg-gray-800/20 backdrop-blur-sm border border-white/20 dark:border-gray-700/20"
              >
                <MoreVertical className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Tab Navigation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="backdrop-blur-md bg-white/30 dark:bg-gray-900/30 rounded-2xl border border-white/20 dark:border-gray-700/20 shadow-lg p-2 mb-6"
        >
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('chat')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium transition-all duration-300 ${
                activeTab === 'chat'
                  ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-white/20 dark:hover:bg-gray-800/20'
              }`}
            >
              <MessageCircle className="w-4 h-4" />
              Chat
            </button>
            <button
              onClick={() => setActiveTab('members')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium transition-all duration-300 ${
                activeTab === 'members'
                  ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-white/20 dark:hover:bg-gray-800/20'
              }`}
            >
              <Users className="w-4 h-4" />
              Members ({members.length})
            </button>
          </div>
        </motion.div>

        {/* Content Area */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="backdrop-blur-md bg-white/30 dark:bg-gray-900/30 rounded-3xl border border-white/20 dark:border-gray-700/20 shadow-lg overflow-hidden"
        >
          {activeTab === 'chat' ? (
            <div className="flex flex-col h-[600px]">
              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {loadingMessages ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                  </div>
                ) : messages.length > 0 ? (
                  messages.map((message) => (
                    <div key={message.id} className="flex gap-3">
                      <Avatar className="w-8 h-8 border border-white/20">
                        <AvatarImage 
                          src={message.profile?.avatar_url} 
                          alt={message.profile?.full_name}
                        />
                        <AvatarFallback className="text-xs bg-gradient-to-br from-blue-500 to-cyan-500 text-white">
                          {message.profile?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-gray-800 dark:text-gray-200 text-sm">
                            {message.profile?.full_name}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {new Date(message.created_at).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
                          {message.content}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-gray-500 dark:text-gray-400 h-full flex items-center justify-center">
                    <div>
                      <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No messages yet. Start the conversation!</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Message Input */}
              <div className="p-6 border-t border-white/20 dark:border-gray-700/20">
                <form onSubmit={handleSendMessage} className="flex gap-3">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your message..."
                    className="flex-1 px-4 py-3 backdrop-blur-sm bg-white/20 dark:bg-gray-800/20 border border-white/20 dark:border-gray-700/20 rounded-2xl placeholder-gray-500 dark:placeholder-gray-400 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-transparent transition-all duration-300"
                    disabled={sendingMessage}
                  />
                  <Button
                    type="submit"
                    disabled={sendingMessage || !newMessage.trim()}
                    className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-6"
                  >
                    {sendingMessage ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </form>
              </div>
            </div>
          ) : (
            <div className="p-6">
              <div className="max-h-[600px] overflow-y-auto">
                {loadingMembers ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {members.map((member) => (
                      <motion.div
                        key={member.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-4 p-4 bg-white/20 dark:bg-gray-800/20 backdrop-blur-sm border border-white/20 dark:border-gray-700/20 rounded-2xl"
                      >
                        <Avatar className="w-12 h-12 border-2 border-white/20">
                          <AvatarImage 
                            src={member.profile?.avatar_url} 
                            alt={member.profile?.full_name}
                          />
                          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-cyan-500 text-white font-medium">
                            {member.profile?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium text-gray-800 dark:text-gray-200">
                              {member.profile?.full_name}
                            </h3>
                            {getRoleIcon(member.role)}
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            @{member.profile?.username}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Joined {new Date(member.joined_at).toLocaleDateString()}
                          </p>
                        </div>

                        <div className="text-right">
                          <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${
                            member.role === 'admin' 
                              ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                              : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                          }`}>
                            {member.role}
                          </span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* Leave Room Confirmation Modal */}
      {showLeaveConfirm && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-md rounded-3xl border border-white/20 dark:border-gray-700/20 shadow-2xl p-8 max-w-md w-full"
          >
            <div className="text-center">
              <AlertTriangle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-2">
                Leave Room?
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Are you sure you want to leave this room? You'll need to be re-invited to join again.
              </p>
              
              <div className="flex gap-3">
                <Button
                  onClick={() => setShowLeaveConfirm(false)}
                  variant="outline"
                  className="flex-1 bg-white/20 dark:bg-gray-800/20 backdrop-blur-sm border-white/20 dark:border-gray-700/20"
                  disabled={leavingRoom}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleLeaveRoom}
                  className="flex-1 bg-gradient-to-r from-red-500 to-red-600 text-white"
                  disabled={leavingRoom}
                >
                  {leavingRoom ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    'Leave Room'
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
};

export default RuangkuPage;