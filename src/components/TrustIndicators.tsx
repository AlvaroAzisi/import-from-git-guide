import React from 'react';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { Users, Clock, Star, Award } from 'lucide-react';

interface CounterProps {
  end: number;
  duration: number;
  suffix?: string;
  prefix?: string;
}

const Counter: React.FC<CounterProps> = ({ end, duration, suffix = '', prefix = '' }) => {
  const [count, setCount] = React.useState(0);
  const { ref, inView } = useInView({ triggerOnce: true });

  React.useEffect(() => {
    if (inView) {
      let start = 0;
      const increment = end / (duration * 60);
      const timer = setInterval(() => {
        start += increment;
        if (start >= end) {
          setCount(end);
          clearInterval(timer);
        } else {
          setCount(Math.floor(start));
        }
      }, 1000 / 60);

      return () => clearInterval(timer);
    }
  }, [inView, end, duration]);

  return (
    <span ref={ref}>
      {prefix}{count.toLocaleString()}{suffix}
    </span>
  );
};

const TrustIndicators: React.FC = () => {
  const stats = [
    {
      icon: Users,
      number: 50000,
      suffix: '+',
      label: 'Active Students',
      color: 'from-blue-500 to-cyan-500'
    },
    {
      icon: Clock,
      number: 2500000,
      suffix: '+',
      label: 'Study Hours',
      color: 'from-emerald-500 to-teal-500'
    },
    {
      icon: Star,
      number: 4.9,
      prefix: '',
      suffix: '/5',
      label: 'Average Rating',
      color: 'from-amber-500 to-orange-500'
    },
    {
      icon: Award,
      number: 95,
      suffix: '%',
      label: 'Success Rate',
      color: 'from-purple-500 to-pink-500'
    }
  ];

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
            Trusted by Students Everywhere
          </h2>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            Join thousands of successful students who've found their perfect study companions
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              viewport={{ once: true }}
              whileHover={{ y: -5 }}
              className="backdrop-blur-md bg-white/30 rounded-3xl border border-white/20 shadow-lg p-8 text-center group hover:shadow-xl transition-all duration-300"
            >
              <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                <stat.icon className="w-8 h-8 text-white" />
              </div>
              
              <div className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">
                <Counter
                  end={stat.number}
                  duration={2}
                  suffix={stat.suffix}
                  prefix={stat.prefix}
                />
              </div>
              
              <p className="text-gray-600 font-medium">{stat.label}</p>
            </motion.div>
          ))}
        </div>

        {/* University Logos */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          viewport={{ once: true }}
          className="mt-16 text-center"
        >
          <p className="text-gray-500 mb-8 text-sm uppercase tracking-wide font-medium">
            Trusted at Top Universities
          </p>
          
          <div className="backdrop-blur-sm bg-white/20 rounded-2xl border border-white/20 p-6 inline-block">
            <div className="flex items-center gap-8 text-gray-400">
              <div className="font-bold text-lg">Harvard</div>
              <div className="font-bold text-lg">MIT</div>
              <div className="font-bold text-lg">Stanford</div>
              <div className="font-bold text-lg">Berkeley</div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default TrustIndicators;