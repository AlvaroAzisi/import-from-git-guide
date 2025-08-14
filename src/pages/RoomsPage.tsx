import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  Users, 
  Filter, 
  Clock,
  Star,
  Plus
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { getRooms, joinRoom, isRoomMember } from '../lib/rooms';
import { useToast } from '../hooks/useToast';
import { JoinRoomModal } from '../components/modals/JoinRoomModal';
import type { Room } from '../lib/rooms';

const RoomsPage: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  // Remove unused state variables
  const [rooms, setRooms] = useState<Room[]>([]);
  const [filteredRooms, setFilteredRooms] = useState<Room[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState<string | null>(null);
  const [isMemberMap, setIsMemberMap] = useState<{ [key: string]: boolean }>({});
  const [joinModalOpen, setJoinModalOpen] = useState(false);

  const filterOptions = [
    'Mathematics', 'Science', 'History', 'Literature', 'Programming', 
    'Language', 'Physics', 'Chemistry', 'Biology', 'Art'
  ];

  useEffect(() => {
    loadRooms();
  }, []);

  useEffect(() => {
    filterRooms();
  }, [searchQuery, selectedFilters, rooms]);

  const loadRooms = async () => {
    try {
      const data = await getRooms(50);
      setRooms(data);
      
      // Check membership status for each room
      if (user && data.length > 0) {
        const membershipStatus = await Promise.all(
          data.map(async (room) => {
            try {
              const isMember = await isRoomMember(room.id);
              return { [room.id]: isMember || false };
            } catch (error) {
              console.error(`Error checking membership for room ${room.id}:`, error);
              return { [room.id]: false };
            }
          })
        );
        setIsMemberMap(Object.assign({}, ...membershipStatus));
      }
    } catch (error) {
      console.error('Error loading rooms:', error);
      toast({
        title: 'Error',
        description: 'Failed to load rooms',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const filterRooms = () => {
    let filtered = rooms;

    if (searchQuery.trim()) {
      filtered = filtered.filter(room =>
        room.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        room.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        room.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (selectedFilters.length > 0) {
      filtered = filtered.filter(room =>
        selectedFilters.some(filter =>
          room.subject.toLowerCase().includes(filter.toLowerCase()) ||
          room.name.toLowerCase().includes(filter.toLowerCase())
        )
      );
    }

    setFilteredRooms(filtered);
  };

  const toggleFilter = (filter: string) => {
    setSelectedFilters(prev =>
      prev.includes(filter)
        ? prev.filter(f => f !== filter)
        : [...prev, filter]
    );
  };

  const handleJoinRoom = async (roomId: string) => {
    if (!user) return;
    
    // Check if user is already a member
    if (isMemberMap[roomId]) {
      toast({
        title: "Already joined",
        description: "You are already a member of this room.",
        variant: "default"
      });
      navigate(`/room/${roomId}`);
      return;
    }
    
    setJoining(roomId);
    try {
      await joinRoom(roomId);
      setIsMemberMap(prev => ({ ...prev, [roomId]: true }));
      toast({
        title: 'Success',
        description: 'Joined room successfully!'
      });
      navigate(`/room/${roomId}`);
    } catch (error: any) {
      console.error('Error joining room:', error);
      
      // Handle specific error cases
      if (error.message?.includes('already a member')) {
        setIsMemberMap(prev => ({ ...prev, [roomId]: true }));
        toast({
          title: "Already joined",
          description: "You are already a member of this room.",
          variant: "default"
        });
        navigate(`/room/${roomId}`);
      } else {
        toast({
          title: 'Error',
          description: error.message || 'Failed to join room',
          variant: 'destructive'
        });
      }
    } finally {
      setJoining(null);
    }
  };

  // Remove unused function

  return (
    <div>
      {/* Hero Section */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20 backdrop-blur-sm"></div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="relative max-w-6xl mx-auto px-4 py-16"
        >
          <div className="text-center mb-12">
            <motion.h1
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-5xl md:text-6xl font-bold text-gray-800 dark:text-gray-200 mb-6"
            >
              Find Your Perfect
              <span className="block bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
                Study Room
              </span>
            </motion.h1>
            
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-8"
            >
              Join thousands of learners in collaborative study sessions
            </motion.p>

            {/* Main Search Bar */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="relative max-w-2xl mx-auto"
            >
              <div className="backdrop-blur-md bg-white/30 dark:bg-gray-900/30 rounded-3xl border border-white/20 dark:border-gray-700/20 shadow-2xl p-2">
                <div className="relative">
                  <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search rooms by name, subject, or description..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-16 pr-6 py-6 bg-transparent text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 text-lg focus:outline-none"
                  />
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="absolute right-2 top-1/2 -translate-y-1/2"
                  >
                    <button
                      onClick={() => setJoinModalOpen(true)}
                      className="p-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl hover:shadow-xl transition-all duration-300"
                    >
                      <Plus className="w-6 h-6" />
                    </button>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>

      {/* Filter Chips */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="backdrop-blur-md bg-white/30 dark:bg-gray-900/30 rounded-3xl border border-white/20 dark:border-gray-700/20 shadow-lg p-6 mb-8"
        >
          <div className="flex items-center gap-4 mb-4">
            <Filter className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <span className="font-medium text-gray-700 dark:text-gray-300">Filter by subject:</span>
          </div>
          
          <div className="flex flex-wrap gap-3">
            {filterOptions.map((filter, index) => (
              <motion.button
                key={filter}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: 0.9 + index * 0.05 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => toggleFilter(filter)}
                className={`px-4 py-2 rounded-xl font-medium transition-all duration-300 ${
                  selectedFilters.includes(filter)
                    ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg'
                    : 'bg-white/40 dark:bg-gray-800/40 text-gray-700 dark:text-gray-300 hover:bg-white/60 dark:hover:bg-gray-800/60'
                }`}
              >
                {filter}
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Results Section */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">
            Study Rooms {filteredRooms.length > 0 && `(${filteredRooms.length})`}
          </h2>
        </div>

        {/* Room Grid */}
        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="backdrop-blur-md bg-white/30 dark:bg-gray-900/30 rounded-3xl border border-white/20 dark:border-gray-700/20 p-6 animate-pulse">
                <div className="h-4 bg-white/40 dark:bg-gray-700/40 rounded w-3/4 mb-4"></div>
                <div className="h-3 bg-white/30 dark:bg-gray-700/30 rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-white/20 dark:bg-gray-700/20 rounded w-2/3 mb-4"></div>
                <div className="flex justify-between items-center">
                  <div className="h-3 bg-white/20 dark:bg-gray-700/20 rounded w-1/4"></div>
                  <div className="h-8 bg-white/30 dark:bg-gray-700/30 rounded w-16"></div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredRooms.length > 0 ? (
          <AnimatePresence>
            <motion.div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredRooms.map((room, index) => (
                <motion.div
                  key={room.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -30 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  whileHover={{ y: -10, scale: 1.02 }}
                  className="backdrop-blur-md bg-white/30 dark:bg-gray-900/30 rounded-3xl border border-white/20 dark:border-gray-700/20 shadow-lg hover:shadow-2xl transition-all duration-300 p-6 cursor-pointer group"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {room.name}
                      </h3>
                      <span className="inline-block px-3 py-1 bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-blue-700 dark:text-blue-300 rounded-xl text-sm font-medium">
                        {room.subject}
                      </span>
                    </div>
                    {room.is_public && (
                      <Star className="w-5 h-5 text-yellow-500" />
                    )}
                  </div>

                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-2">
                    {room.description || "Join this amazing study room to learn together!"}
                  </p>

                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        <span>{room.member_count || 0}/{room.max_members}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>Active</span>
                      </div>
                    </div>
                  </div>

                  {!isMemberMap[room.id] ? (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleJoinRoom(room.id)}
                      disabled={joining === room.id}
                      className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl font-medium hover:shadow-lg transition-all duration-300 disabled:opacity-50"
                    >
                      {joining === room.id ? 'Joining...' : 'Join Room'}
                    </motion.button>
                  ) : (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => navigate(`/room/${room.id}`)}
                      className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-medium hover:shadow-lg transition-all duration-300"
                    >
                      Enter Room
                    </motion.button>
                  )}
                </motion.div>
              ))}
            </motion.div>
          </AnimatePresence>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="text-center py-16"
          >
            <div className="backdrop-blur-md bg-white/30 dark:bg-gray-900/30 rounded-3xl border border-white/20 dark:border-gray-700/20 shadow-lg p-12 max-w-md mx-auto">
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="text-6xl mb-6"
              >
                🔍
              </motion.div>
              <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-4">
                No rooms found
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Try adjusting your search or filters, or create a new room!
              </p>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setJoinModalOpen(true)}
                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl font-medium hover:shadow-lg transition-all duration-300"
              >
                Join Room
              </motion.button>
            </div>
          </motion.div>
        )}
      </div>

      {/* Join Room Modal */}
      <JoinRoomModal
        isOpen={joinModalOpen}
        onClose={() => setJoinModalOpen(false)}
      />
    </div>
  );
};

export default RoomsPage;