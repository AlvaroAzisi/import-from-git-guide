import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../integrations/supabase/client';
import { useToast } from '../../hooks/useToast';
import { Sparkles, Users, Target } from 'lucide-react';

/**
 * OnboardingPage - First-time user setup
 * Collects: interests, avatar (optional), language preference
 */
export const OnboardingPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [interests, setInterests] = useState<string[]>([]);
  const [interestInput, setInterestInput] = useState('');
  const [loading, setLoading] = useState(false);

  const commonInterests = [
    'Mathematics', 'Physics', 'Chemistry', 'Biology', 'Computer Science',
    'English', 'History', 'Geography', 'Economics', 'Art',
  ];

  const handleAddInterest = (interest: string) => {
    if (interests.includes(interest)) {
      setInterests(interests.filter(i => i !== interest));
    } else if (interests.length < 5) {
      setInterests([...interests, interest]);
    }
  };

  const handleCustomInterest = (e: React.FormEvent) => {
    e.preventDefault();
    if (interestInput.trim() && !interests.includes(interestInput.trim()) && interests.length < 5) {
      setInterests([...interests, interestInput.trim()]);
      setInterestInput('');
    }
  };

  const handleComplete = async () => {
    if (interests.length === 0) {
      toast({
        title: 'Select at least one interest',
        description: 'This helps us find the best study buddies for you.',
        variant: 'destructive',
      });
      return;
    }

    if (!user?.id) {
      toast({
        title: 'Error',
        description: 'User not found',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ interests })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: 'Welcome to Kupintar! 🎉',
        description: 'Your profile is all set up.',
      });

      navigate('/home', { replace: true });
    } catch (error: any) {
      console.error('Onboarding error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save preferences',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-muted flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="backdrop-blur-md bg-card/50 rounded-3xl border border-border/20 shadow-lg p-8 md:p-12 max-w-2xl w-full"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
            Welcome to Kupintar!
          </h1>
          <p className="text-muted-foreground">
            Let's personalize your learning experience
          </p>
        </div>

        {/* Interests Selection */}
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-foreground mb-4">
              <Target className="w-4 h-4 inline mr-2" />
              Select your interests (up to 5)
            </label>
            <div className="flex flex-wrap gap-2 mb-4">
              {commonInterests.map((interest) => (
                <motion.button
                  key={interest}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleAddInterest(interest)}
                  className={`px-4 py-2 rounded-xl font-medium transition-all ${
                    interests.includes(interest)
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted hover:bg-muted/80 text-foreground'
                  }`}
                >
                  {interest}
                </motion.button>
              ))}
            </div>

            {/* Custom Interest Input */}
            <form onSubmit={handleCustomInterest} className="flex gap-2">
              <input
                type="text"
                value={interestInput}
                onChange={(e) => setInterestInput(e.target.value)}
                placeholder="Add custom interest..."
                className="flex-1 px-4 py-2 bg-background/50 border border-border/20 rounded-xl text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                maxLength={30}
              />
              <button
                type="submit"
                disabled={!interestInput.trim() || interests.length >= 5}
                className="px-4 py-2 bg-primary hover:opacity-90 text-primary-foreground rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add
              </button>
            </form>

            {/* Selected Count */}
            <p className="text-sm text-muted-foreground mt-2">
              {interests.length}/5 interests selected
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={() => navigate('/home')}
              className="flex-1 px-6 py-3 bg-muted hover:bg-muted/80 text-foreground rounded-xl font-medium transition-all"
            >
              Skip for now
            </button>
            <button
              onClick={handleComplete}
              disabled={loading || interests.length === 0}
              className="flex-1 px-6 py-3 bg-primary hover:opacity-90 text-primary-foreground rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full" />
                  Saving...
                </>
              ) : (
                <>
                  <Users className="w-4 h-4" />
                  Continue
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
