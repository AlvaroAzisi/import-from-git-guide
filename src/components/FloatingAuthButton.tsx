import React from 'react';
import { motion } from 'framer-motion';
import { LogIn } from 'lucide-react';

interface FloatingAuthButtonProps {
  onClick: () => void;
}

const FloatingAuthButton: React.FC<FloatingAuthButtonProps> = ({ onClick }) => {
  return (
    <motion.button
      initial={{ scale: 0, rotate: -180 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{
        type: 'spring',
        stiffness: 260,
        damping: 20,
        delay: 1,
      }}
      whileHover={{
        scale: 1.1,
        boxShadow: '0 20px 40px rgba(59, 130, 246, 0.3)',
      }}
      whileTap={{ scale: 0.9 }}
      onClick={onClick}
      className="fixed bottom-8 right-8 w-16 h-16 bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full shadow-2xl flex items-center justify-center z-40 group overflow-hidden"
    >
      {/* Animated background */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
        className="absolute inset-0 bg-gradient-to-r from-blue-400 via-emerald-400 to-blue-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
      />

      {/* Icon container */}
      <div className="relative z-10 flex items-center justify-center">
        <motion.div whileHover={{ rotate: 15 }} transition={{ type: 'spring', stiffness: 300 }}>
          <LogIn className="w-7 h-7 text-white" />
        </motion.div>
      </div>

      {/* Pulse effect */}
      <motion.div
        animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="absolute inset-0 bg-blue-400 rounded-full"
      />
    </motion.button>
  );
};

export default FloatingAuthButton;
