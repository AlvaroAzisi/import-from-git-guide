import React from 'react';
import { motion } from 'framer-motion';
import { User, LogOut, Settings } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface UserProfileProps {
  user: any;
  onSignOut: () => void;
}

const UserProfile: React.FC<UserProfileProps> = ({ user, onSignOut }) => {
  const [isOpen, setIsOpen] = React.useState(false);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    onSignOut();
    setIsOpen(false);
  };

  const getDisplayName = () => {
    if (user.user_metadata?.full_name) {
      return user.user_metadata.full_name;
    }
    if (user.email) {
      return user.email.split('@')[0];
    }
    return 'User';
  };

  const getAvatarUrl = () => {
    return user.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(getDisplayName())}&background=3b82f6&color=fff`;
  };

  return (
    <div className="relative">
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 backdrop-blur-md bg-white/30 border border-white/20 rounded-2xl px-4 py-2 hover:bg-white/40 transition-all duration-300"
      >
        <img
          src={getAvatarUrl()}
          alt={getDisplayName()}
          className="w-8 h-8 rounded-full object-cover"
        />
        <span className="hidden md:block text-gray-700 font-medium">
          Hi, {getDisplayName()}
        </span>
      </motion.button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            className="absolute top-full right-0 mt-2 w-48 backdrop-blur-md bg-white/30 border border-white/20 rounded-2xl shadow-xl z-50 overflow-hidden"
          >
            <div className="p-4 border-b border-white/10">
              <p className="font-medium text-gray-800">{getDisplayName()}</p>
              <p className="text-sm text-gray-600">{user.email}</p>
            </div>
            
            <div className="p-2">
              <button className="w-full flex items-center gap-3 px-3 py-2 text-gray-700 hover:bg-white/20 rounded-xl transition-colors">
                <Settings className="w-4 h-4" />
                Settings
              </button>
              
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-3 px-3 py-2 text-red-600 hover:bg-red-50/50 rounded-xl transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </motion.div>
        </>
      )}
    </div>
  );
};

export default UserProfile;