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
    <div className="max-w-[1600px] 2xl:max-w-screen-2xl mx-auto px-4 md:px-6 lg:px-8 2xl:px-12 3xl:px-16 4xl:px-24 py-6 md:py-8 lg:py-10 2xl:py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6 md:space-y-8 2xl:space-y-10"
      >
        {/* Welcome Section */}
        <div className="backdrop-blur-md bg-background/40 dark:bg-background/40 rounded-2xl md:rounded-3xl border border-border/20 shadow-lg p-6 md:p-8 2xl:p-10">
          <h1 className="text-2xl md:text-3xl 2xl:text-4xl font-bold text-foreground mb-3 md:mb-4">
            Welcome back, {profile?.username || user?.email}!
          </h1>
          <p className="text-sm md:text-base 2xl:text-lg text-muted-foreground">
            Find study rooms to join or create your own to start collaborating.
          </p>
        </div>

        {/* Rooms List */}
        <div className="space-y-4 md:space-y-6">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl md:text-2xl 2xl:text-3xl font-semibold text-foreground">
              Your Study Rooms
            </h2>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 md:px-6 py-2 md:py-2.5 bg-primary text-primary-foreground rounded-xl hover:opacity-90 transition-all text-sm md:text-base"
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
