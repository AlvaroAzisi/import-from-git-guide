import React from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Star, Quote } from 'lucide-react';

const Testimonials: React.FC = () => {
  const [currentIndex, setCurrentIndex] = React.useState(0);

  const testimonials = [
    {
      name: 'Sarah Chen',
      role: 'Computer Science Student',
      university: 'Stanford University',
      image:
        'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=150',
      content:
        'Kupintar completely transformed my study habits. I went from struggling alone to having an amazing study group that keeps me motivated and accountable.',
      rating: 5,
    },
    {
      name: 'Marcus Johnson',
      role: 'Pre-Med Student',
      university: 'Harvard University',
      image:
        'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=150',
      content:
        'The AI matching is incredibly accurate. I found study partners who not only share my schedule but also complement my learning style perfectly.',
      rating: 5,
    },
    {
      name: 'Emily Rodriguez',
      role: 'Business Major',
      university: 'Wharton School',
      image:
        'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=150',
      content:
        "I was skeptical at first, but Kupintar delivered. Found my study group within hours, and we've been studying together for 6 months now!",
      rating: 5,
    },
    {
      name: 'David Kim',
      role: 'Engineering Student',
      university: 'MIT',
      image:
        'https://images.pexels.com/photos/1681010/pexels-photo-1681010.jpeg?auto=compress&cs=tinysrgb&w=150',
      content:
        'The virtual study rooms are a game-changer. We can share screens, use the whiteboard, and stay focused even when studying remotely.',
      rating: 5,
    },
    {
      name: 'Priya Patel',
      role: 'Psychology Major',
      university: 'Berkeley',
      image:
        'https://images.pexels.com/photos/1043471/pexels-photo-1043471.jpeg?auto=compress&cs=tinysrgb&w=150',
      content:
        'My grades improved by 25% after using Kupintar. Having study partners who understand my goals makes all the difference.',
      rating: 5,
    },
  ];

  const nextTestimonial = () => {
    setCurrentIndex((prev) => (prev + 1) % testimonials.length);
  };

  const prevTestimonial = () => {
    setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  React.useEffect(() => {
    const interval = setInterval(nextTestimonial, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section id="testimonials" className="py-20 px-4 relative z-10">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">
            What Students Are Saying
          </h2>
          <p className="text-gray-600 text-lg max-w-3xl mx-auto">
            Don't just take our word for it. See how Kupintar has helped thousands of students study
            better together.
          </p>
        </motion.div>

        <div className="relative max-w-4xl mx-auto">
          <div className="backdrop-blur-md bg-white/30 rounded-3xl border border-white/20 shadow-xl overflow-hidden">
            <div
              className="flex transition-transform duration-500 ease-in-out"
              style={{ transform: `translateX(-${currentIndex * 100}%)` }}
            >
              {testimonials.map((testimonial, index) => (
                <div key={index} className="w-full flex-shrink-0 p-8 md:p-12">
                  <div className="text-center">
                    <div className="relative mb-6">
                      <Quote className="w-12 h-12 text-blue-200 mx-auto mb-4" />
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className="text-xl md:text-2xl text-gray-700 italic leading-relaxed mb-8"
                      >
                        "{testimonial.content}"
                      </motion.p>
                    </div>

                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.4 }}
                      className="flex items-center justify-center space-x-4"
                    >
                      <img
                        src={testimonial.image}
                        alt={testimonial.name}
                        className="w-16 h-16 rounded-full object-cover border-4 border-white shadow-lg"
                      />
                      <div className="text-left">
                        <h4 className="font-bold text-gray-800 text-lg">{testimonial.name}</h4>
                        <p className="text-gray-600">{testimonial.role}</p>
                        <p className="text-blue-500 text-sm font-medium">
                          {testimonial.university}
                        </p>
                      </div>
                    </motion.div>

                    <div className="flex justify-center mt-4 space-x-1">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star key={i} className="w-5 h-5 text-amber-400 fill-current" />
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Navigation Buttons */}
          <button
            onClick={prevTestimonial}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 backdrop-blur-md bg-white/30 border border-white/20 rounded-full flex items-center justify-center hover:bg-white/40 transition-all duration-300 shadow-lg"
          >
            <ChevronLeft className="w-6 h-6 text-gray-600" />
          </button>

          <button
            onClick={nextTestimonial}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 backdrop-blur-md bg-white/30 border border-white/20 rounded-full flex items-center justify-center hover:bg-white/40 transition-all duration-300 shadow-lg"
          >
            <ChevronRight className="w-6 h-6 text-gray-600" />
          </button>

          {/* Dots Indicator */}
          <div className="flex justify-center mt-8 space-x-2">
            {testimonials.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`w-3 h-3 rounded-full transition-all duration-300 ${
                  index === currentIndex ? 'bg-blue-500 scale-125' : 'bg-gray-300 hover:bg-gray-400'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
