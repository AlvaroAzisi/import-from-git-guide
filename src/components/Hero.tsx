import React from 'react';
import { motion } from 'framer-motion';
import { ArrowDown, Users, BookOpen } from 'lucide-react';
import UserProfile from './UserProfile';
import { useAuth } from '../hooks/useAuth';

interface HeroProps {
  onAuthClick: () => void;
}

const Hero: React.FC<HeroProps> = ({ onAuthClick }) => {
  const { user } = useAuth();

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center px-4 py-20">
      {/* Navigation */}
      <motion.nav 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="fixed top-6 left-1/2 transform -translate-x-1/2 z-50 backdrop-blur-md bg-white/20 rounded-2xl border border-white/20 shadow-lg px-8 py-4"
      >
        <div className="flex items-center space-x-8">
          <div className="flex items-center space-x-2">
            <BookOpen className="w-6 h-6 text-blue-500" />
            <span className="font-bold text-gray-800">Kupintar</span>
          </div>
          <div className="hidden md:flex items-center space-x-6 text-sm">
            <button 
              onClick={() => scrollToSection('features')}
              className="text-gray-600 hover:text-blue-500 transition-colors"
            >
              Features
            </button>
            <button 
              onClick={() => scrollToSection('how-it-works')}
              className="text-gray-600 hover:text-blue-500 transition-colors"
            >
              How It Works
            </button>
            <button 
              onClick={() => scrollToSection('testimonials')}
              className="text-gray-600 hover:text-blue-500 transition-colors"
            >
              Reviews
            </button>
          </div>
          {user ? (
            <UserProfile 
              user={user} 
              onSignOut={() => window.location.reload()} 
            />
          ) : (
            <button 
              onClick={onAuthClick}
              className="bg-blue-500 text-white px-4 py-2 rounded-xl hover:bg-blue-600 transition-colors text-sm font-medium"
            >
              Sign Up
            </button>
          )}
        </div>
      </motion.nav>

      <div className="max-w-6xl mx-auto text-center relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mb-8"
        >
          <h1 className="text-5xl md:text-7xl font-bold text-gray-800 mb-6 leading-tight">
            Find Your Perfect
            <span className="bg-gradient-to-r from-blue-500 to-emerald-500 bg-clip-text text-transparent block">
              Study Buddy
            </span>
            <span className="text-4xl md:text-5xl">in Minutes</span>
          </h1>
          
          <p className="text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto mb-12 leading-relaxed">
            AI-powered matching connects you with compatible study partners who share your goals, schedule, and learning style.
          </p>
        </motion.div>

        {/* Floating CTA Panel */}
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="backdrop-blur-md bg-white/30 rounded-3xl border border-white/20 shadow-2xl p-8 mb-12 max-w-2xl mx-auto"
        >
          <div className="flex flex-col md:flex-row gap-4 items-center justify-center">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onAuthClick}
              className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-8 py-4 rounded-2xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2"
            >
              <Users className="w-5 h-5" />
              {user ? 'Find Study Buddies Now' : 'Get Started Free'}
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.02 }}
              onClick={() => scrollToSection('how-it-works')}
              className="text-gray-700 hover:text-blue-500 font-medium flex items-center gap-2 transition-colors"
            >
              How It Works
              <ArrowDown className="w-4 h-4" />
            </motion.button>
          </div>
        </motion.div>

        {/* Trust Badge */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="backdrop-blur-sm bg-white/20 rounded-2xl border border-white/20 px-6 py-3 inline-block"
        >
          <p className="text-gray-600 text-sm">
            {user ? (
              <>Welcome back! Ready to find your study buddy?</>
            ) : (
              <>Trusted by <span className="font-semibold text-blue-500">50,000+</span> students worldwide</>
            )}
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default Hero;