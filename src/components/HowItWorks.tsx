import React from 'react';
import { motion } from 'framer-motion';
import { UserPlus, Search, MessageCircle, BookOpen } from 'lucide-react';

const HowItWorks: React.FC = () => {
  const steps = [
    {
      icon: UserPlus,
      title: 'Create Your Profile',
      description: 'Tell us about your subjects, schedule, learning style, and study goals.',
      color: 'from-blue-500 to-cyan-500',
    },
    {
      icon: Search,
      title: 'Get Matched',
      description:
        'Our AI finds compatible study partners based on your preferences and availability.',
      color: 'from-emerald-500 to-teal-500',
    },
    {
      icon: MessageCircle,
      title: 'Connect & Plan',
      description: 'Chat with potential study partners and schedule your first study session.',
      color: 'from-amber-500 to-orange-500',
    },
    {
      icon: BookOpen,
      title: 'Study Together',
      description: 'Meet up in person or join virtual study rooms to learn collaboratively.',
      color: 'from-purple-500 to-pink-500',
    },
  ];

  return (
    <section id="how-it-works" className="py-20 px-4 relative z-10">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">How It Works</h2>
          <p className="text-gray-600 text-lg max-w-3xl mx-auto">
            Get started with Kupintar in just a few simple steps. Finding your perfect study partner
            has never been easier.
          </p>
        </motion.div>

        <div className="relative">
          {/* Connection Line */}
          <div className="hidden lg:block absolute top-1/2 left-1/4 right-1/4 h-0.5 bg-gradient-to-r from-blue-200 via-emerald-200 via-amber-200 to-purple-200 -translate-y-1/2 z-0"></div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 relative z-10">
            {steps.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.2 }}
                viewport={{ once: true }}
                className="text-center relative"
              >
                <motion.div
                  whileHover={{ scale: 1.05, rotate: 5 }}
                  transition={{ type: 'spring', stiffness: 300 }}
                  className="backdrop-blur-md bg-white/40 rounded-3xl border border-white/30 shadow-lg p-8 mb-4 hover:shadow-xl transition-all duration-300"
                >
                  <div
                    className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${step.color} flex items-center justify-center mx-auto mb-6 shadow-lg`}
                  >
                    <step.icon className="w-8 h-8 text-white" />
                  </div>

                  <div className="absolute -top-3 -left-3 w-8 h-8 bg-white rounded-full border-4 border-blue-100 flex items-center justify-center text-sm font-bold text-blue-500">
                    {index + 1}
                  </div>

                  <h3 className="font-bold text-gray-800 text-xl mb-4">{step.title}</h3>

                  <p className="text-gray-600 leading-relaxed">{step.description}</p>
                </motion.div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          viewport={{ once: true }}
          className="mt-16 text-center"
        >
          <div className="backdrop-blur-md bg-white/30 rounded-3xl border border-white/20 shadow-lg p-8 max-w-2xl mx-auto">
            <h3 className="text-2xl font-bold text-gray-800 mb-4">
              Ready to Start Studying Smarter?
            </h3>
            <p className="text-gray-600 mb-6">
              Join thousands of students who've already found their perfect study companions.
            </p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="bg-gradient-to-r from-blue-500 to-emerald-500 text-white px-8 py-4 rounded-2xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-300"
            >
              Get Started for Free
            </motion.button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default HowItWorks;
