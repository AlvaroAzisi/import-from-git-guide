import React from 'react';
import { motion } from 'framer-motion';
import { Frown, Smile, Users, Target } from 'lucide-react';

const ProblemStatement: React.FC = () => {
  return (
    <section className="py-20 px-4 relative z-10">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">
            From Studying Alone to Learning Together
          </h2>
          <p className="text-gray-600 text-lg max-w-3xl mx-auto">
            We understand the struggles of solo studying. That's why we created Kupintar to transform your learning experience.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8 mb-16">
          {/* Problem Side */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="backdrop-blur-md bg-red-50/50 border border-red-100/50 rounded-3xl p-8 shadow-lg"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center">
                <Frown className="w-6 h-6 text-red-500" />
              </div>
              <h3 className="text-2xl font-bold text-gray-800">The Problem</h3>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-red-400 rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-gray-700">Studying alone leads to procrastination and lack of motivation</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-red-400 rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-gray-700">Difficult to find study partners with compatible schedules</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-red-400 rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-gray-700">No way to verify if potential partners are serious about studying</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-red-400 rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-gray-700">Awkward to approach strangers for study sessions</p>
              </div>
            </div>

            <div className="mt-8 p-4 bg-red-50 rounded-2xl border border-red-100">
              <p className="text-sm text-red-600 italic text-center">
                "I spent hours trying to find study partners, but gave up and studied alone again..."
              </p>
            </div>
          </motion.div>

          {/* Solution Side */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            viewport={{ once: true }}
            className="backdrop-blur-md bg-emerald-50/50 border border-emerald-100/50 rounded-3xl p-8 shadow-lg"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center">
                <Smile className="w-6 h-6 text-emerald-500" />
              </div>
              <h3 className="text-2xl font-bold text-gray-800">The Solution</h3>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-emerald-400 rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-gray-700">AI matches you with motivated study partners instantly</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-emerald-400 rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-gray-700">Smart scheduling finds compatible time slots automatically</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-emerald-400 rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-gray-700">Verified profiles and ratings ensure quality connections</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-emerald-400 rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-gray-700">Seamless chat and video integration for easy coordination</p>
              </div>
            </div>

            <div className="mt-8 p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
              <p className="text-sm text-emerald-600 italic text-center">
                "Found my study group in 5 minutes! My grades improved by 20% this semester."
              </p>
            </div>
          </motion.div>
        </div>

        {/* Bottom Stats */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          viewport={{ once: true }}
          className="backdrop-blur-md bg-white/30 rounded-3xl border border-white/20 shadow-lg p-8"
        >
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-white" />
              </div>
              <h4 className="font-bold text-gray-800 text-lg mb-2">Instant Matching</h4>
              <p className="text-gray-600 text-sm">Find study partners in under 5 minutes</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Target className="w-8 h-8 text-white" />
              </div>
              <h4 className="font-bold text-gray-800 text-lg mb-2">Perfect Compatibility</h4>
              <p className="text-gray-600 text-sm">AI ensures perfect learning style matches</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Smile className="w-8 h-8 text-white" />
              </div>
              <h4 className="font-bold text-gray-800 text-lg mb-2">Proven Results</h4>
              <p className="text-gray-600 text-sm">95% success rate for finding study partners</p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default ProblemStatement;