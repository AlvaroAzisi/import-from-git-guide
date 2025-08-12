import React from 'react';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';

import { Navigate } from 'react-router-dom';
import { BookOpen, Users, MessageCircle, TrendingUp, Plus, Search, UserPlus } from 'lucide-react';
import { JoinRoomButton } from '../components/JoinRoomButton';
import { getRooms } from '../lib/rooms';
import { searchUsers } from '../lib/auth';
import { JoinRoomModal } from '../components/modals/JoinRoomModal';
import { Button } from '../components/ui/button';
import CreateRoomModal from '../components/CreateRoomModal';
import type { Room } from '../lib/rooms';
import type { UserProfile } from '../lib/auth';

const HomePage: React.FC = () => {
  // ✅ All hooks called at the top level FIRST
  const { user, profile, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [joinRoomOpen, setJoinRoomOpen] = useState(false);
  const [createRoomOpen, setCreateRoomOpen] = useState(false);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [recommendedUsers, setRecommendedUsers] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);

  // Load initial data
  React.useEffect(() => {
    const loadData = async () => {
      try {
        const [roomsData, usersData] = await Promise.all([
          getRooms(6),
          searchUsers('') // Get some random users
        ]);
        
        setRooms(roomsData);
        setRecommendedUsers(usersData.slice(0, 4));
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoadingRooms(false);
        setLoadingUsers(false);
      }
    };

    if (user) {
      loadData();
    }
  }, [user]);

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

  if (!user) {
    return <Navigate to="/" replace />;
  }

  const handleRoomCreated = (room: Room) => {
    setRooms(prev => [room, ...prev.slice(0, 5)]);
  };

  return (<>
    <div className="max-w-6xl mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-8"
        >
          <motion.h1 
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-4xl md:text-5xl font-bold text-gray-800 dark:text-gray-200 mb-4"
          >
            Welcome back, {profile?.full_name?.split(' ')[0] || 'Friend'}! 
            <motion.span
              animate={{ rotate: [0, 14, -8, 14, -4, 10, 0] }}
              transition={{ repeat: Infinity, duration: 2.5, delay: 1 }}
              className="inline-block"
            >
              👋
            </motion.span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto"
          >
            {(profile?.streak || 0) > 0 
              ? `🔥 Amazing ${profile?.streak || 0} day streak! Keep the momentum going!`
              : "Ready to find your perfect study buddy and boost your learning?"
            }
          </motion.p>
          
          {/* Welcome Animation - Confetti Effect */}
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="mt-4"
          >
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="text-6xl"
            >
              {(profile?.xp || 0) > 0 ? '🎉' : '📚'}
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Search Bar */}
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
              placeholder="Search for rooms, subjects, or study buddies..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 backdrop-blur-sm bg-white/20 dark:bg-gray-800/20 border border-white/20 dark:border-gray-700/20 rounded-2xl placeholder-gray-500 dark:placeholder-gray-400 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-transparent transition-all duration-300"
            />
          </div>
        </motion.div>

        {/* Quick Stats */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          {[
            { icon: Users, label: 'Study Sessions', value: profile?.rooms_joined || 0, color: 'from-blue-500 to-cyan-500' },
            { icon: MessageCircle, label: 'Messages', value: profile?.messages_sent || 0, color: 'from-emerald-500 to-teal-500' },
            { icon: TrendingUp, label: 'XP Points', value: profile?.xp || 0, color: 'from-amber-500 to-orange-500' },
            { icon: BookOpen, label: 'Study Streak', value: profile?.streak || 0, color: 'from-purple-500 to-pink-500' }
          ].map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 + index * 0.1 }}
              className="backdrop-blur-md bg-white/30 dark:bg-gray-900/30 rounded-3xl border border-white/20 dark:border-gray-700/20 shadow-lg p-6 text-center hover:shadow-xl transition-all duration-300"
            >
              <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${stat.color} flex items-center justify-center mx-auto mb-4`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
              <div className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-1">{stat.value}</div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">{stat.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Recent Rooms */}
        <div className="grid lg:grid-cols-2 gap-8 mb-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.8 }}
            className="backdrop-blur-md bg-white/30 dark:bg-gray-900/30 rounded-3xl border border-white/20 dark:border-gray-700/20 shadow-lg p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200">Recent Study Rooms</h3>
              <button
                onClick={() => setCreateRoomOpen(true)}
                className="p-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl hover:shadow-lg transition-all duration-300"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            
            <div className="space-y-3">
              {loadingRooms ? (
                [...Array(3)].map((_, i) => (
                  <div key={i} className="p-4 bg-white/20 dark:bg-gray-800/20 rounded-2xl animate-pulse">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="h-4 bg-white/30 dark:bg-gray-700/30 rounded w-3/4 mb-2"></div>
                        <div className="h-3 bg-white/20 dark:bg-gray-700/20 rounded w-1/2"></div>
                      </div>
                      <div className="h-4 bg-white/20 dark:bg-gray-700/20 rounded w-16"></div>
                    </div>
                  </div>
                ))
              ) : rooms.length > 0 ? (
                rooms.slice(0, 3).map((room) => (
                  <motion.a
                    key={room.id}
                    href={`/room/${room.id}`}
                    whileHover={{ y: -5, scale: 1.02 }}
                    className="block p-4 bg-white/20 dark:bg-gray-800/20 rounded-2xl border border-white/10 dark:border-gray-700/10 hover:bg-white/30 dark:hover:bg-gray-800/30 transition-all duration-300 cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold text-gray-800 dark:text-gray-200">{room.name}</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{room.subject}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {room.member_count || 0}/{room.max_members}
                        </span>
                      </div>
                    </div>
                  </motion.a>
                ))
              ) : (
                <div className="text-center py-8">
                  <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600 dark:text-gray-400">No rooms yet. Create your first one!</p>
                </div>
              )}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 1.0 }}
            className="backdrop-blur-md bg-white/30 dark:bg-gray-900/30 rounded-3xl border border-white/20 dark:border-gray-700/20 shadow-lg p-6"
          >
            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-4">Recommended Study Buddies</h3>
            
            <div className="space-y-3">
              {loadingUsers ? (
                [...Array(3)].map((_, i) => (
                  <div key={i} className="p-4 bg-white/20 dark:bg-gray-800/20 rounded-2xl animate-pulse">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white/30 dark:bg-gray-700/30 rounded-full"></div>
                      <div className="flex-1">
                        <div className="h-4 bg-white/30 dark:bg-gray-700/30 rounded w-3/4 mb-1"></div>
                        <div className="h-3 bg-white/20 dark:bg-gray-700/20 rounded w-1/2"></div>
                      </div>
                      <div className="h-3 bg-white/20 dark:bg-gray-700/20 rounded w-12"></div>
                    </div>
                  </div>
                ))
              ) : recommendedUsers.length > 0 ? (
                recommendedUsers.map((user) => (
                  <div
                    key={user.id}
                    className="p-4 bg-white/20 dark:bg-gray-800/20 rounded-2xl border border-white/10 dark:border-gray-700/10 hover:bg-white/30 dark:hover:bg-gray-800/30 transition-all duration-300 cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={user.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.full_name)}&background=3b82f6&color=fff`}
                        alt={user.full_name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-800 dark:text-gray-200">{user.full_name}</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">@{user.username}</p>
                      </div>
                      <div className="text-xs text-blue-500 font-medium">
                        Level {Math.floor(user.xp / 1000) + 1}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600 dark:text-gray-400">No study buddies found yet.</p>
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.2 }}
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          <button
            onClick={() => setCreateRoomOpen(true)}
            className="p-6 backdrop-blur-md bg-gradient-to-r from-blue-500/20 to-cyan-500/20 dark:from-blue-500/10 dark:to-cyan-500/10 rounded-3xl border border-blue-200/50 dark:border-blue-700/50 hover:shadow-xl transition-all duration-300 text-left group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <Plus className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-1">Create Study Room</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">Start a new collaborative learning session</p>
              </div>
            </div>
          </button>

          <div className="p-6 backdrop-blur-md bg-gradient-to-r from-purple-500/20 to-pink-500/20 dark:from-purple-500/10 dark:to-pink-500/10 rounded-3xl border border-purple-200/50 dark:border-purple-700/50 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center">
                <Search className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-1">Join Study Room</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">Enter a room code to join instantly</p>
              </div>
              <Button
                onClick={() => setJoinRoomOpen(true)}
                className="bg-primary hover:bg-primary/90"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Join Room
              </Button>
            </div>
          </div>

          <button
            onClick={() => window.location.href = '/temanku'}
            className="p-6 backdrop-blur-md bg-gradient-to-r from-emerald-500/20 to-teal-500/20 dark:from-emerald-500/10 dark:to-teal-500/10 rounded-3xl border border-emerald-200/50 dark:border-emerald-700/50 hover:shadow-xl transition-all duration-300 text-left group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-1">Find Study Buddies</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">Connect with like-minded learners</p>
              </div>
            </div>
          </button>
        </motion.div>
      </div>

      {/* Join Room Modal */}
      <JoinRoomModal
        isOpen={joinRoomOpen}
        onClose={() => setJoinRoomOpen(false)}
      />
      {/* Create Room Modal */}
      <CreateRoomModal
        isOpen={createRoomOpen}
        onClose={() => setCreateRoomOpen(false)}
        onSuccess={handleRoomCreated}
      />
    </>
  );
};

export default HomePage;