import React from 'react';
import { motion } from 'framer-motion';

const FloatingShapes: React.FC = () => {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      <motion.div
        animate={{
          y: [0, -20, 0],
          rotate: [0, 5, 0],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="absolute top-20 left-10 w-64 h-64 bg-gradient-to-br from-blue-200/30 to-cyan-300/20 rounded-full blur-xl"
      />
      
      <motion.div
        animate={{
          y: [0, 30, 0],
          rotate: [0, -5, 0],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 2
        }}
        className="absolute top-1/3 right-20 w-48 h-48 bg-gradient-to-br from-emerald-200/30 to-mint-300/20 rounded-full blur-xl"
      />
      
      <motion.div
        animate={{
          y: [0, -25, 0],
          x: [0, 15, 0],
        }}
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 4
        }}
        className="absolute bottom-1/4 left-1/4 w-32 h-32 bg-gradient-to-br from-amber-200/30 to-orange-300/20 rounded-full blur-xl"
      />
      
      <motion.div
        animate={{
          y: [0, 20, 0],
          x: [0, -10, 0],
        }}
        transition={{
          duration: 9,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 1
        }}
        className="absolute bottom-20 right-1/3 w-40 h-40 bg-gradient-to-br from-purple-200/30 to-pink-300/20 rounded-full blur-xl"
      />
    </div>
  );
};

export default FloatingShapes;