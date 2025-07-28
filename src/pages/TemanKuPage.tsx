import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../hooks/useLanguage';
import { Navigate } from 'react-router-dom';
import { 
  Search, 
  Users, 
  UserPlus, 
  MessageCircle,
  UserCheck,
  UserX,
  Clock
} from 'lucide-react';
import { searchUsers } from '../lib/auth';
import { sendFriendRequest, getFriendshipStatus } from '../lib/friends';
import { useToast } from '../hooks/useToast';
import TopBar from '../components/TopBar';
import Sidebar from '../components/Sidebar';
import CreateRoomModal from '../components/CreateRoomModal';
import type { UserProfile } from '../lib/auth';

const TemanKuPage: React.FC = () => {
  // ✅ All hooks called at the top level FIRST
  const { user, profile, loading } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [createRoomOpen, setCreateRoomOpen] = useState(false);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [friendshipStatuses, setFriendshipStatuses] = useState<Record<string, string>>({});

  // Search users
  React.useEffect(() => {
    const searchUsersDebounced = async () => {
      if (searchQuery.trim().length < 2) {
        setUsers([]);
        return;
      }

      setLoadingUsers(true);
      try {
        const results = await searchUsers(searchQuery);
        // Filter out current user
        const filteredResults = results.filter(u => u.id !== user?.id);
        setUsers(filteredResults);

        // Get friendship statuses
        const statuses: Record<string, string> = {};
        for (const u of filteredResults) {
          statuses[u.id] = await getFriendshipStatus(u.id);
        }
        setFriendshipStatuses(statuses);
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setLoadingUsers(false);
      }
    };

    const debounceTimer = setTimeout(searchUsersDebounced, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery, user?.id]);

  // ✅ Early returns AFTER all hooks
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 flex items-center justify-center">
        <div className="backdrop-blur-md bg-white/30 rounded-3xl border border-white/20 shadow-lg p-8">
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
          <p className="text-gray-600 mt-4">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    return <Navigate to="/" replace />;
  }


  const handleSendFriendRequest = async (friendId: string) => {
    try {
      await sendFriendRequest(friendId);
      setFriendshipStatuses(prev => ({ ...prev, [friendId]: 'pending' }));
      toast({
        title: t('common.success'),
        description: 'Friend request sent successfully!'
      });
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error.message || 'Failed to send friend request',
        variant: 'destructive'
      });
    }
  };

  const getFriendshipStatusIcon = (status: string) => {
    switch (status) {
      case 'accepted':
        return <UserCheck className="w-4 h-4" />;
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'blocked':
        return <UserX className="w-4 h-4" />;
      default:
        return <UserPlus className="w-4 h-4" />;
    }
  };

  const getFriendshipStatusText = (status: string) => {
    switch (status) {
      case 'accepted':
        return t('friends.accepted');
      case 'pending':
        return t('friends.pending');
      case 'blocked':
        return 'Blocked';
      default:
        return t('friends.addFriend');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Top Bar */}
      <TopBar onMenuClick={() => setSidebarOpen(true)} />
      
      {/* Sidebar */}
      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)}
        onCreateRoom={() => setCreateRoomOpen(true)}
      />

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl md:text-5xl font-bold text-gray-800 dark:text-gray-200 mb-4">
            {t('friends.title')}
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Connect with fellow students who share your subjects and study goals
          </p>
        </motion.div>

        {/* Search and Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="backdrop-blur-md bg-white/30 dark:bg-gray-900/30 rounded-3xl border border-white/20 dark:border-gray-700/20 shadow-lg p-6 mb-8"
        >
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or username..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 backdrop-blur-sm bg-white/20 dark:bg-gray-800/20 border border-white/20 dark:border-gray-700/20 rounded-2xl placeholder-gray-500 dark:placeholder-gray-400 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-transparent transition-all duration-300"
            />
          </div>
        </motion.div>

        {/* User Cards Grid */}
        {loadingUsers ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="backdrop-blur-md bg-white/30 dark:bg-gray-900/30 rounded-3xl border border-white/20 dark:border-gray-700/20 shadow-lg p-6">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-16 h-16 bg-gray-300 dark:bg-gray-600 rounded-2xl"></div>
                    <div className="flex-1">
                      <div className="h-5 bg-gray-300 dark:bg-gray-600 rounded mb-2"></div>
                      <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-2/3"></div>
                    </div>
                  </div>
                  <div className="h-16 bg-gray-300 dark:bg-gray-600 rounded mb-4"></div>
                  <div className="h-10 bg-gray-300 dark:bg-gray-600 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        ) : users.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {users.map((user, index) => (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                whileHover={{ y: -5, scale: 1.02 }}
                className="backdrop-blur-md bg-white/30 dark:bg-gray-900/30 rounded-3xl border border-white/20 dark:border-gray-700/20 shadow-lg p-6 hover:shadow-xl transition-all duration-300 group"
              >
                {/* User Header */}
                <div className="flex items-start gap-4 mb-4">
                  <div className="relative">
                    <img
                      src={user.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.full_name)}&background=3b82f6&color=fff`}
                      alt={user.full_name}
                      className="w-16 h-16 rounded-2xl object-cover border-2 border-white/20 dark:border-gray-700/20"
                    />
                  </div>
                  
                  <div className="flex-1">
                    <a 
                      href={`/@${user.username}`}
                      className="font-bold text-gray-800 dark:text-gray-200 text-lg group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors hover:underline"
                    >
                      {user.full_name}
                    </a>
                    <p className="text-blue-500 text-sm">@{user.username}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-blue-500 font-medium">
                        Level {Math.floor(user.xp / 1000) + 1}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {user.xp} XP
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bio */}
                {user.bio && (
                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 leading-relaxed">
                    {user.bio}
                  </p>
                )}

                {/* Interests */}
                {user.interests && Array.isArray(user.interests) && user.interests.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {user.interests.slice(0, 3).map((interest: string, idx: number) => (
                      <span
                        key={idx}
                        className="px-3 py-1 bg-blue-100/50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full text-xs font-medium"
                      >
                        {interest.trim()}
                      </span>
                    ))}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSendFriendRequest(user.id)}
                    disabled={friendshipStatuses[user.id] === 'pending' || friendshipStatuses[user.id] === 'accepted'}
                    className={`flex-1 py-2 px-4 rounded-2xl font-medium transition-all duration-300 flex items-center justify-center gap-2 ${
                      friendshipStatuses[user.id] === 'accepted'
                        ? 'bg-emerald-500 text-white'
                        : friendshipStatuses[user.id] === 'pending'
                        ? 'bg-amber-500 text-white'
                        : 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:shadow-lg'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {getFriendshipStatusIcon(friendshipStatuses[user.id] || 'none')}
                    {getFriendshipStatusText(friendshipStatuses[user.id] || 'none')}
                  </button>
                  <button className="bg-white/20 dark:bg-gray-800/20 backdrop-blur-sm border border-white/20 dark:border-gray-700/20 text-gray-600 dark:text-gray-400 p-2 rounded-2xl hover:bg-white/30 dark:hover:bg-gray-800/30 transition-all duration-300">
                    <MessageCircle className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        ) : searchQuery.length >= 2 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <div className="backdrop-blur-md bg-white/30 dark:bg-gray-900/30 rounded-3xl border border-white/20 dark:border-gray-700/20 shadow-lg p-8 max-w-md mx-auto">
              <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-2">No users found</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Try searching with different keywords.
              </p>
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <div className="backdrop-blur-md bg-white/30 dark:bg-gray-900/30 rounded-3xl border border-white/20 dark:border-gray-700/20 shadow-lg p-8 max-w-md mx-auto">
              <Search className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-2">Start searching</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Enter at least 2 characters to search for study buddies.
              </p>
            </div>
          </motion.div>
        )}
      </div>

      {/* Create Room Modal */}
      <CreateRoomModal
        isOpen={createRoomOpen}
        onClose={() => setCreateRoomOpen(false)}
        onSuccess={() => {}}
      />
    </div>
  );
};

export default TemanKuPage;