import React from 'react';
import { motion } from 'framer-motion';
import { Brain, Calendar, Shield, MessageCircle, Video, Users, Target, Star } from 'lucide-react';

const Features: React.FC = () => {
  const features = [
    {
      icon: Brain,
      title: 'AI-Powered Matching',
      description: 'Smart algorithms match you with study partners based on learning style, schedule, and goals.',
      color: 'from-purple-500 to-pink-500'
    },
    {
      icon: Calendar,
      title: 'Smart Scheduling',
      description: 'Automatically find common free time slots and sync with your calendar.',
      color: 'from-blue-500 to-cyan-500'
    },
    {
      icon: Shield,
      title: 'Verified Profiles',
      description: 'All users are verified students with ratings and reviews for safety.',
      color: 'from-emerald-500 to-teal-500'
    },
    {
      icon: MessageCircle,
      title: 'Built-in Chat',
      description: 'Seamless messaging to coordinate study sessions and share resources.',
      color: 'from-amber-500 to-orange-500'
    },
    {
      icon: Video,
      title: 'Video Study Rooms',
      description: 'Virtual study spaces with video calls, screen sharing, and whiteboards.',
      color: 'from-red-500 to-pink-500'
    },
    {
      icon: Users,
      title: 'Group Formation',
      description: 'Create or join study groups for larger collaborative sessions.',
      color: 'from-indigo-500 to-purple-500'
    },
    {
      icon: Target,
      title: 'Goal Tracking',
      description: 'Set and track study goals together with accountability partners.',
      color: 'from-green-500 to-emerald-500'
    },
    {
      icon: Star,
      title: 'Success Analytics',
      description: 'Track your progress and see how studying with partners improves your performance.',
      color: 'from-yellow-500 to-orange-500'
    }
  ];

  return (
    <section id="features" className="py-20 px-4 relative z-10">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">
            Everything You Need to Study Better
          </h2>
          <p className="text-gray-600 text-lg max-w-3xl mx-auto">
            Powerful features designed to make finding and collaborating with study partners effortless and effective.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              viewport={{ once: true }}
              whileHover={{ y: -8, scale: 1.02 }}
              className="backdrop-blur-md bg-white/30 rounded-3xl border border-white/20 shadow-lg p-6 group hover:shadow-2xl transition-all duration-300"
            >
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                <feature.icon className="w-7 h-7 text-white" />
              </div>
              
              <h3 className="font-bold text-gray-800 text-lg mb-3 group-hover:text-gray-900 transition-colors">
                {feature.title}
              </h3>
              
              <p className="text-gray-600 text-sm leading-relaxed group-hover:text-gray-700 transition-colors">
                {feature.description}
              </p>

              <motion.div
                initial={{ scaleX: 0 }}
                whileHover={{ scaleX: 1 }}
                transition={{ duration: 0.3 }}
                className={`h-1 bg-gradient-to-r ${feature.color} rounded-full mt-4 origin-left`}
              />
            </motion.div>
          ))}
        </div>

        {/* Feature Highlight */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          viewport={{ once: true }}
          className="mt-16 backdrop-blur-md bg-gradient-to-r from-blue-50/50 to-emerald-50/50 border border-white/20 rounded-3xl p-8 shadow-lg"
        >
          <div className="text-center max-w-3xl mx-auto">
            <h3 className="text-2xl md:text-3xl font-bold text-gray-800 mb-4">
              Why Students Love Kupintar
            </h3>
            <p className="text-gray-600 text-lg mb-8">
              Our platform combines cutting-edge AI with intuitive design to create the most effective study partner experience possible.
            </p>
            
            <div className="grid md:grid-cols-3 gap-6 text-center">
              <div>
                <div className="text-3xl font-bold text-blue-500 mb-2">2x</div>
                <p className="text-gray-600 text-sm">Faster Learning</p>
              </div>
              <div>
                <div className="text-3xl font-bold text-emerald-500 mb-2">85%</div>
                <p className="text-gray-600 text-sm">Higher Retention</p>
              </div>
              <div>
                <div className="text-3xl font-bold text-amber-500 mb-2">95%</div>
                <p className="text-gray-600 text-sm">Satisfaction Rate</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Features;