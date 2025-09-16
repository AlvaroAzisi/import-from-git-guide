import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Minus } from 'lucide-react';

const FAQ: React.FC = () => {
  const [openItems, setOpenItems] = React.useState<number[]>([]);

  const toggleItem = (index: number) => {
    setOpenItems((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  const faqItems = [
    {
      question: 'How does the AI matching work?',
      answer:
        'Our AI analyzes your learning style, schedule, subject preferences, study goals, and location to find compatible study partners. It considers factors like your preferred study times, learning pace, and study methods to ensure high-quality matches.',
    },
    {
      question: 'Is Kupintar free to use?',
      answer:
        'Yes! Kupintar is completely free for basic features including profile creation, AI matching, and messaging. We offer premium features like advanced scheduling tools and priority matching for students who want additional functionality.',
    },
    {
      question: 'How do I know if someone is a legitimate student?',
      answer:
        'All users go through a verification process using their student email addresses. We also have a rating and review system where users can rate their study sessions, helping maintain a trustworthy community of serious learners.',
    },
    {
      question: 'Can I study with people from different schools?',
      answer:
        'Absolutely! While we can match you with students from your own institution, you can also connect with students from other schools who are studying similar subjects or preparing for similar exams.',
    },
    {
      question: "What if I don't get along with my matched study partner?",
      answer:
        'No problem! You can easily end a study partnership at any time and request new matches. Our AI learns from your feedback to provide better matches in the future. We also have community guidelines and reporting features to ensure a positive experience.',
    },
    {
      question: 'How secure is my personal information?',
      answer:
        'We take privacy seriously. Your personal information is encrypted and never shared without your permission. You control what information is visible in your profile, and you can adjust your privacy settings at any time.',
    },
    {
      question: 'Can I create or join study groups?',
      answer:
        'Yes! In addition to one-on-one study partnerships, you can create study groups or join existing ones. This is perfect for larger subjects or when you want to learn from multiple perspectives.',
    },
    {
      question: 'Do you support virtual study sessions?',
      answer:
        "Definitely! We have built-in video calling, screen sharing, and virtual whiteboard features. You can study together online whether you're in different buildings or different countries.",
    },
  ];

  return (
    <section className="py-20 px-4 relative z-10">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            Got questions? We've got answers. Here are some common questions about Kupintar.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          viewport={{ once: true }}
          className="backdrop-blur-md bg-white/30 rounded-3xl border border-white/20 shadow-lg overflow-hidden"
        >
          {faqItems.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="border-b border-white/10 last:border-b-0"
            >
              <button
                onClick={() => toggleItem(index)}
                className="w-full px-6 md:px-8 py-6 text-left flex items-center justify-between hover:bg-white/10 transition-colors duration-300 group"
              >
                <h3 className="font-semibold text-gray-800 text-lg pr-8 group-hover:text-blue-600 transition-colors">
                  {item.question}
                </h3>
                <div className="flex-shrink-0">
                  {openItems.includes(index) ? (
                    <Minus className="w-6 h-6 text-blue-500" />
                  ) : (
                    <Plus className="w-6 h-6 text-gray-400 group-hover:text-blue-500 transition-colors" />
                  )}
                </div>
              </button>

              <AnimatePresence>
                {openItems.includes(index) && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="px-6 md:px-8 pb-6">
                      <p className="text-gray-600 leading-relaxed">{item.answer}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </motion.div>

        {/* Still have questions CTA */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          viewport={{ once: true }}
          className="text-center mt-16"
        >
          <div className="backdrop-blur-md bg-white/30 rounded-2xl border border-white/20 shadow-lg p-6 max-w-md mx-auto">
            <h3 className="font-bold text-gray-800 text-lg mb-2">Still have questions?</h3>
            <p className="text-gray-600 text-sm mb-4">
              We're here to help! Reach out to our friendly support team.
            </p>
            <button className="bg-blue-500 text-white px-6 py-2 rounded-xl hover:bg-blue-600 transition-colors text-sm font-medium">
              Contact Support
            </button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default FAQ;
