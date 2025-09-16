import React from 'react';
import { motion } from 'framer-motion';
import { Users, ArrowRight, Sparkles } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

interface FinalCTAProps {
  onAuthClick?: () => void;
}

const FinalCTA: React.FC<FinalCTAProps> = ({ onAuthClick }) => {
  const { user } = useAuth();

  return (
    <section className="py-20 px-4 relative z-10">
      <div className="max-w-4xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="backdrop-blur-md bg-gradient-to-br from-blue-50/50 via-white/30 to-emerald-50/50 border border-white/20 rounded-3xl shadow-2xl p-8 md:p-12 relative overflow-hidden"
        >
          {/* Animated Background Elements */}
          <div className="absolute inset-0 opacity-20">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
              className="absolute top-10 right-10 w-20 h-20 border-2 border-blue-300 rounded-full"
            />
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute bottom-10 left-10 w-16 h-16 bg-gradient-to-br from-emerald-300 to-teal-300 rounded-full blur-sm"
            />
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute top-1/2 left-1/4 w-8 h-8 bg-amber-300 rounded-full opacity-60"
            />
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
            className="relative z-10"
          >
            <div className="flex items-center justify-center mb-6">
              <motion.div
                whileHover={{ rotate: 180 }}
                transition={{ duration: 0.5 }}
                className="w-16 h-16 bg-gradient-to-br from-blue-500 to-emerald-500 rounded-2xl flex items-center justify-center shadow-lg"
              >
                <Sparkles className="w-8 h-8 text-white" />
              </motion.div>
            </div>

            <h2 className="text-3xl md:text-5xl font-bold text-gray-800 mb-6 leading-tight">
              Ready to Transform Your
              <span className="bg-gradient-to-r from-blue-500 to-emerald-500 bg-clip-text text-transparent block">
                Study Experience?
              </span>
            </h2>

            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto leading-relaxed">
              Join over 50,000 students who've already discovered the power of collaborative
              learning with Kupintar.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 items-center justify-center mb-8">
              <motion.button
                whileHover={{ scale: 1.05, boxShadow: '0 20px 40px rgba(59, 130, 246, 0.3)' }}
                whileTap={{ scale: 0.95 }}
                onClick={onAuthClick}
                className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-8 py-4 rounded-2xl font-bold text-lg shadow-xl hover:shadow-2xl transition-all duration-300 flex items-center gap-3 group"
              >
                <Users className="w-6 h-6" />
                {user ? 'Find Study Buddies Now' : 'Start Finding Study Buddies'}
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                className="text-gray-600 hover:text-blue-500 font-medium flex items-center gap-2 transition-colors px-4 py-2"
              >
                Watch Demo Video
              </motion.button>
            </div>

            <div className="backdrop-blur-sm bg-white/20 rounded-2xl border border-white/20 p-6 max-w-lg mx-auto">
              <div className="grid grid-cols-3 gap-6 text-center">
                <div>
                  <div className="text-2xl font-bold text-blue-500 mb-1">Free</div>
                  <p className="text-gray-600 text-sm">Always</p>
                </div>
                <div>
                  <div className="text-2xl font-bold text-emerald-500 mb-1">5 min</div>
                  <p className="text-gray-600 text-sm">Setup Time</p>
                </div>
                <div>
                  <div className="text-2xl font-bold text-amber-500 mb-1">24/7</div>
                  <p className="text-gray-600 text-sm">Support</p>
                </div>
              </div>
            </div>

            <p className="text-gray-500 text-sm mt-6">
              {user
                ? 'Your perfect study partner is just a click away!'
                : 'No credit card required • Join in seconds • Start studying better today'}
            </p>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default FinalCTA;
