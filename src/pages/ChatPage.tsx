import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import { Navigate, useParams } from 'react-router-dom';
import { DirectMessageWindow } from '../components/chat/DirectMessageWindow';
import { getFriends, type Friend } from '../lib/friends';
import { MessageCircle, Search, Users } from 'lucide-react';

const ChatPage: React.FC = () => {
  const { user, profile, loading } = useAuth();
  const { userId } = useParams<{ userId?: string }>();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingFriends, setLoadingFriends] = useState(true);

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
          <DirectMessageWindow
            otherUserId={selectedFriend.id}
            otherUser={{
              id: selectedFriend.id,
              username: selectedFriend.username,
              full_name: selectedFriend.full_name,
              avatar_url: selectedFriend.avatar_url || undefined,
            }}
          />
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
