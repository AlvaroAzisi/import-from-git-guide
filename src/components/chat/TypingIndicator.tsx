import React from 'react';
import { motion } from 'framer-motion';
import type { TypingEvent } from '../../lib/chat';

interface TypingIndicatorProps {
  users: TypingEvent[];
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({ users }) => {
  if (users.length === 0) return null;

  const getTypingText = () => {
    if (users.length === 1) {
      return `${users[0].username || 'Someone'} is typing...`;
    } else if (users.length === 2) {
      return `${users[0].username || 'Someone'} and ${users[1].username || 'someone'} are typing...`;
    } else {
      return `${users.length} people are typing...`;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="flex items-center gap-2"
    >
      <div className="flex items-center gap-1 backdrop-blur-sm bg-white/40 dark:bg-gray-800/40 rounded-2xl px-3 py-2">
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              animate={{ 
                scale: [1, 1.2, 1],
                opacity: [0.5, 1, 0.5]
              }}
              transition={{
                duration: 1.2,
                repeat: Infinity,
                delay: i * 0.2
              }}
              className="w-2 h-2 bg-gray-500 dark:bg-gray-400 rounded-full"
            />
          ))}
        </div>
        <span className="text-xs text-gray-600 dark:text-gray-400 ml-2">
          {getTypingText()}
        </span>
      </div>
    </motion.div>
  );
};