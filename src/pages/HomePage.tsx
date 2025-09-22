import React from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import RoomList from '../components/rooms/RoomList';
import CreateRoomModal from '../components/modals/CreateRoomModal';
import { useToast } from '../hooks/useToast';

const HomePage: React.FC = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [showCreateModal, setShowCreateModal] = React.useState(false);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-8"
      >
        {/* Welcome Section */}
        <div className="backdrop-blur-md bg-white/30 dark:bg-gray-900/30 rounded-3xl border border-white/20 dark:border-gray-700/20 shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Welcome back, {profile?.username || user?.email}!
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Find study rooms to join or create your own to start collaborating.
          </p>
        </div>

        {/* Rooms List */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-gray-800 dark:text-white">
              Your Study Rooms
            </h2>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors"
            >
              Create Room
            </button>
          </div>
          <RoomList />
        </div>
      </motion.div>

      {/* Create Room Modal */}
      <CreateRoomModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          setShowCreateModal(false);
          toast({
            title: 'Success!',
            description: 'Your study room has been created.',
          });
        }}
      />
    </div>
  );
};

export default HomePage;
