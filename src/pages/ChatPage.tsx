import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import { Navigate, useParams } from 'react-router-dom';
import { getFriends, findOrCreateDirectChat, type Friend } from '../lib/friends';
import { MessageCircle, Search, Users, ArrowLeft } from 'lucide-react';
import { getDirectMessages, sendDirectMessage, type DirectMessage } from '../lib/friends';
import { supabase } from '../integrations/supabase/client';

const ChatPage: React.FC = () => {
  const { user, profile, loading } = useAuth();
  const { userId } = useParams<{ userId?: string }>();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingFriends, setLoadingFriends] = useState(true);
  const [chatId, setChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);

  // Load friends
  useEffect(() => {
    const loadFriends = async () => {
      setLoadingFriends(true);
      try {
        const friendsList = await getFriends();
        setFriends(friendsList);
        
        // If userId is provided in URL, select that friend
        if (userId) {
          const friend = friendsList.find(f => f.id === userId);
          if (friend) setSelectedFriend(friend);
        }
      } catch (error) {
        console.error('Error loading friends:', error);
      } finally {
        setLoadingFriends(false);
      }
    };

    if (user) {
      loadFriends();
    }
  }, [user, userId]);

  // Load or create chat when friend is selected
  useEffect(() => {
    const loadChat = async () => {
      if (!selectedFriend || !user) return;
      
      setLoadingMessages(true);
      try {
        const id = await findOrCreateDirectChat(selectedFriend.id);
        setChatId(id);
        
        const msgs = await getDirectMessages(id);
        setMessages(msgs);
      } catch (error) {
        console.error('Error loading chat:', error);
      } finally {
        setLoadingMessages(false);
      }
    };

    loadChat();
  }, [selectedFriend, user]);

  // Subscribe to new messages
  useEffect(() => {
    if (!chatId) return;

    const channel = supabase
      .channel(`direct_messages:${chatId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'direct_messages',
          filter: `chat_id=eq.${chatId}`,
        },
        async (payload) => {
          const newMessage = payload.new as DirectMessage;
          
          // Only add if we're not the sender (avoid duplicates)
          if (newMessage.sender && newMessage.sender !== user?.id) {
            // Fetch sender profile
            const { data: senderProfile } = await supabase
              .from('profiles')
              .select('id, username, full_name, avatar_url')
              .eq('id', newMessage.sender)
              .single();
            
            setMessages((prev) => [...prev, { ...newMessage, sender_profile: senderProfile || null }]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatId]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !chatId || sendingMessage) return;

    setSendingMessage(true);
    try {
      await sendDirectMessage(chatId, messageInput.trim());
      setMessageInput('');
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSendingMessage(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center">
        <div className="backdrop-blur-md bg-card/50 rounded-3xl border border-border/20 shadow-lg p-8">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
          <p className="text-muted-foreground mt-4">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    return <Navigate to="/login" replace />;
  }

  const filteredFriends = friends.filter(
    (friend) =>
      friend.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      friend.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-[calc(100vh-4rem)] flex overflow-hidden bg-gradient-to-br from-background to-muted">
      {/* Friends Sidebar */}
      <div className="w-80 border-r border-border/20 backdrop-blur-md bg-card/30 flex flex-col">
        {/* Search */}
        <div className="p-4 border-b border-border/20">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search friends..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-background/50 border border-border/20 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>
        </div>

        {/* Friends List */}
        <div className="flex-1 overflow-y-auto">
          {loadingFriends ? (
            <div className="p-8 text-center">
              <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
              <p className="text-sm text-muted-foreground">Loading friends...</p>
            </div>
          ) : filteredFriends.length === 0 ? (
            <div className="p-8 text-center">
              <Users className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
              <p className="text-sm text-muted-foreground mb-2">
                {searchQuery ? 'No friends found' : 'No friends yet'}
              </p>
              <p className="text-xs text-muted-foreground">
                {!searchQuery && 'Add some friends to start chatting!'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/20">
              {filteredFriends.map((friend) => (
                <motion.button
                  key={friend.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setSelectedFriend(friend)}
                  className={`w-full p-4 flex items-center gap-3 transition-all ${
                    selectedFriend?.id === friend.id
                      ? 'bg-primary/10 border-l-2 border-primary'
                      : 'hover:bg-muted/30'
                  }`}
                >
                  <div className="relative">
                    <img
                      src={
                        friend.avatar_url ||
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(friend.full_name)}&background=random`
                      }
                      alt={friend.full_name}
                      className="w-12 h-12 rounded-full object-cover border-2 border-border/20"
                    />
                    {friend.status === 'online' && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-card" />
                    )}
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-medium text-foreground line-clamp-1">
                      {friend.full_name}
                    </p>
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      @{friend.username}
                    </p>
                  </div>
                  <MessageCircle className="w-4 h-4 text-muted-foreground" />
                </motion.button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedFriend ? (
          <>
            {/* Chat Header */}
            <div className="border-b border-border/20 backdrop-blur-md bg-card/30 p-4 flex items-center gap-3">
              <button
                onClick={() => setSelectedFriend(null)}
                className="md:hidden p-2 hover:bg-muted rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <img
                src={
                  selectedFriend.avatar_url ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedFriend.full_name)}&background=random`
                }
                alt={selectedFriend.full_name}
                className="w-10 h-10 rounded-full object-cover border-2 border-border/20"
              />
              <div>
                <h3 className="font-bold text-foreground">{selectedFriend.full_name}</h3>
                <p className="text-xs text-muted-foreground">@{selectedFriend.username}</p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {loadingMessages ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full"></div>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <MessageCircle className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-30" />
                    <p className="text-muted-foreground">No messages yet. Say hi! 👋</p>
                  </div>
                </div>
              ) : (
                messages.map((msg) => {
                  const isMe = msg.sender === user?.id;
                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`flex gap-2 max-w-[70%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                        {!isMe && (
                          <img
                            src={
                              msg.sender_profile?.avatar_url ||
                              `https://ui-avatars.com/api/?name=${encodeURIComponent(msg.sender_profile?.full_name || 'User')}&background=random`
                            }
                            alt={msg.sender_profile?.full_name}
                            className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                          />
                        )}
                        <div>
                          <div
                            className={`rounded-2xl px-4 py-2 ${
                              isMe
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted text-foreground'
                            }`}
                          >
                            <p className="text-sm">{msg.content}</p>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 px-2">
                            {msg.created_at && new Date(msg.created_at).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>

            {/* Message Input */}
            <form onSubmit={handleSendMessage} className="border-t border-border/20 backdrop-blur-md bg-card/30 p-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-3 bg-background/50 border border-border/20 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  disabled={sendingMessage}
                />
                <button
                  type="submit"
                  disabled={!messageInput.trim() || sendingMessage}
                  className="px-6 py-3 bg-primary hover:opacity-90 text-primary-foreground rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Send
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageCircle className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-30" />
              <h3 className="text-xl font-semibold text-foreground mb-2">
                Select a friend to start chatting
              </h3>
              <p className="text-muted-foreground">
                Choose from your friends list on the left
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatPage;
