import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../hooks/useAuth';
import { Navigate, useNavigate } from 'react-router-dom';
import { getFriends, type Friend } from '../../lib/friends';
import { MessageCircle, Search, Users } from 'lucide-react';

/**
 * ChatListPage - Main chat hub showing DM and group list
 */
export const ChatListPage = () => {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingFriends, setLoadingFriends] = useState(true);

  // Load friends
  useEffect(() => {
    const loadFriends = async () => {
      setLoadingFriends(true);
      try {
        const friendsList = await getFriends();
        setFriends(friendsList);
      } catch (error) {
        console.error('Error loading friends:', error);
      } finally {
        setLoadingFriends(false);
      }
    };

    if (user) {
      loadFriends();
    }
  }, [user]);

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
    return <Navigate to="/auth/login" replace />;
  }

  const filteredFriends = friends.filter(
    (friend) =>
      friend.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      friend.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        {/* Header */}
        <div className="backdrop-blur-md bg-card/40 rounded-2xl border border-border/20 shadow-lg p-6">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
            Messages
          </h1>
          <p className="text-muted-foreground">
            Chat with your study buddies
          </p>
        </div>

        {/* Search */}
        <div className="backdrop-blur-md bg-card/30 rounded-2xl border border-border/20 shadow-lg p-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-background/50 border border-border/20 rounded-xl text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>
        </div>

        {/* Friends List */}
        {loadingFriends ? (
          <div className="backdrop-blur-md bg-card/30 rounded-2xl border border-border/20 shadow-lg p-8 text-center">
            <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
            <p className="text-sm text-muted-foreground">Loading conversations...</p>
          </div>
        ) : filteredFriends.length === 0 ? (
          <div className="backdrop-blur-md bg-card/30 rounded-2xl border border-border/20 shadow-lg p-12 text-center">
            <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-xl font-semibold text-foreground mb-2">
              {searchQuery ? 'No conversations found' : 'No friends yet'}
            </h3>
            <p className="text-muted-foreground mb-4">
              {!searchQuery && 'Add some friends to start chatting!'}
            </p>
            {!searchQuery && (
              <button
                onClick={() => navigate('/temanku')}
                className="px-6 py-2 bg-primary hover:opacity-90 text-primary-foreground rounded-xl font-medium transition-all"
              >
                Find Friends
              </button>
            )}
          </div>
        ) : (
          <div className="backdrop-blur-md bg-card/30 rounded-2xl border border-border/20 shadow-lg divide-y divide-border/20">
            {filteredFriends.map((friend, index) => (
              <motion.button
                key={friend.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => navigate(`/chat/${friend.id}`)}
                className="w-full p-4 flex items-center gap-4 hover:bg-muted/30 transition-all text-left"
              >
                <div className="relative">
                  <img
                    src={
                      friend.avatar_url ||
                      `https://ui-avatars.com/api/?name=${encodeURIComponent(friend.full_name)}&background=random`
                    }
                    alt={friend.full_name}
                    className="w-14 h-14 rounded-full object-cover border-2 border-border/20"
                  />
                  {friend.status === 'online' && (
                    <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-card" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground truncate">
                    {friend.full_name}
                  </p>
                  <p className="text-sm text-muted-foreground truncate">
                    @{friend.username}
                  </p>
                </div>
                <MessageCircle className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              </motion.button>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
};
