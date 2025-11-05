import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, ArrowLeft } from 'lucide-react';

/**
 * NotFound - 404 page
 * Friendly glassmorphism card with navigation back to home
 */
export const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-muted flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="backdrop-blur-md bg-card/50 rounded-3xl border border-border/20 shadow-lg p-8 md:p-12 max-w-md w-full text-center"
      >
        {/* Icon */}
        <motion.div
          initial={{ rotate: -10 }}
          animate={{ rotate: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-block mb-6"
        >
          <div className="w-20 h-20 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-4xl">🧭</span>
          </div>
        </motion.div>

        {/* Title */}
        <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-2">
          404
        </h1>
        <h2 className="text-xl md:text-2xl font-semibold text-foreground/90 mb-4">
          Page Not Found
        </h2>

        {/* Description */}
        <p className="text-muted-foreground mb-8">
          This page doesn't exist or has moved. Let's get you back on track.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate(-1)}
            className="flex-1 px-6 py-3 bg-muted hover:bg-muted/80 text-foreground rounded-xl font-medium transition-all flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/home')}
            className="flex-1 px-6 py-3 bg-primary hover:opacity-90 text-primary-foreground rounded-xl font-medium transition-all flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" />
            Go Home
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
};
