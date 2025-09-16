import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, Lock, Eye, EyeOff, Sparkles } from 'lucide-react';
import {
  signInWithGoogle,
  signInWithEmail,
  signUpWithEmail,
  validateSignUpForm as validateForm,
} from '../lib/auth';

import type { User } from '@supabase/supabase-js';

interface AuthPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: User) => void;
}

const AuthPanel: React.FC<AuthPanelProps> = ({ isOpen, onClose, onSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [generalError, setGeneralError] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
    // Clear field-specific error when user starts typing
    if (errors[e.target.name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[e.target.name];
        return newErrors;
      });
    }
    setGeneralError('');
  };

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setGeneralError('');

      const { error } = await signInWithGoogle();

      if (error) {
        setGeneralError(error);
      } else {
        // Google OAuth will redirect, so we don't need to do anything here
        onClose();
      }
    } catch (error: unknown) {
      setGeneralError(
        error && typeof error === 'object' && 'message' in error
          ? (error as { message?: string }).message || 'Failed to sign in with Google'
          : 'Failed to sign in with Google'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setGeneralError('');
    setErrors({});

    // Validate form
    const validation = validateForm(
      formData.email,
      formData.password,
      isLogin ? undefined : formData.confirmPassword
    );

    // Handle case where validateForm returns null or undefined
    if (!validation) {
      setGeneralError('Validation failed. Please try again.');
      setLoading(false);
      return;
    }

    if (!validation.isValid) {
      setErrors(validation.errors || {});
      setLoading(false);
      return;
    }

    try {
      if (isLogin) {
        const { data, error } = await signInWithEmail(formData.email, formData.password);

        if (error) {
          setGeneralError(error);
          return;
        }

        if (data?.user) {
          onSuccess(data.user);
          onClose();
        }
      } else {
        const { data, error } = await signUpWithEmail(formData.email, formData.password);

        if (error) {
          setGeneralError(error);
          return;
        }

        if (data?.user) {
          if (data.user.email_confirmed_at) {
            onSuccess(data.user);
            onClose();
          } else {
            setGeneralError(
              'Please check your email and click the confirmation link to complete registration.'
            );
          }
        }
      }
    } catch (error: unknown) {
      setGeneralError(
        error && typeof error === 'object' && 'message' in error
          ? (error as { message?: string }).message || 'An error occurred'
          : 'An error occurred'
      );
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setGeneralError('');
    setErrors({});
    setFormData({ email: '', password: '', confirmPassword: '' });
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="fixed inset-0 flex items-center justify-center z-50 p-4"
          >
            <div className="backdrop-blur-md bg-white/30 border border-white/20 rounded-3xl shadow-2xl p-8 w-full max-w-md relative overflow-hidden">
              {/* Animated Background Elements */}
              <div className="absolute inset-0 opacity-10">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                  className="absolute top-4 right-4 w-16 h-16 border-2 border-blue-300 rounded-full"
                />
                <motion.div
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                  className="absolute bottom-4 left-4 w-12 h-12 bg-gradient-to-br from-emerald-300 to-teal-300 rounded-full blur-sm"
                />
              </div>

              {/* Close Button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 w-8 h-8 backdrop-blur-sm bg-white/20 border border-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-all duration-300 z-10"
              >
                <X className="w-4 h-4 text-gray-600" />
              </button>

              {/* Header */}
              <div className="text-center mb-8 relative z-10">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: 'spring' }}
                  className="w-16 h-16 bg-gradient-to-br from-blue-500 to-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg"
                >
                  <Sparkles className="w-8 h-8 text-white" />
                </motion.div>

                <h2 className="text-2xl font-bold text-gray-800 mb-2">
                  {isLogin ? 'Welcome back to Kupintar' : 'Create your Kupintar account'}
                </h2>
                <p className="text-gray-600">
                  {isLogin
                    ? 'Sign in to find your study buddy'
                    : 'Create your account to get started'}
                </p>
              </div>

              {/* Login/Signup Toggle */}
              <div className="flex backdrop-blur-sm bg-white/20 rounded-2xl p-1 mb-6 border border-white/20">
                <button
                  type="button"
                  onClick={() => setIsLogin(true)}
                  className={`flex-1 py-2 px-4 rounded-xl font-medium transition-all duration-300 ${
                    isLogin
                      ? 'bg-white/40 text-gray-800 shadow-sm'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => setIsLogin(false)}
                  className={`flex-1 py-2 px-4 rounded-xl font-medium transition-all duration-300 ${
                    !isLogin
                      ? 'bg-white/40 text-gray-800 shadow-sm'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  Sign Up
                </button>
              </div>

              {/* Google Login Button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full backdrop-blur-sm bg-white/40 border border-white/30 rounded-2xl p-4 flex items-center justify-center gap-3 hover:bg-white/50 transition-all duration-300 mb-6 group disabled:opacity-50"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                <span className="font-medium text-gray-700 group-hover:text-gray-800">
                  Continue with Google
                </span>
              </motion.button>

              {/* Divider */}
              <div className="relative mb-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/20"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white/20 backdrop-blur-sm rounded-full text-gray-500">
                    or continue with email
                  </span>
                </div>
              </div>

              {/* Email Form */}
              <form onSubmit={handleEmailAuth} className="space-y-4">
                {/* Email Input */}
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    name="email"
                    placeholder="Enter your email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    className={`w-full pl-12 pr-4 py-4 backdrop-blur-sm bg-white/20 border rounded-2xl placeholder-gray-500 text-gray-800 focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-300 ${
                      errors.email
                        ? 'border-red-300 focus:ring-red-400/50'
                        : 'border-white/20 focus:ring-blue-400/50'
                    }`}
                  />
                  {errors.email && (
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-red-500 text-sm mt-1 ml-1"
                    >
                      {errors.email}
                    </motion.p>
                  )}
                </div>

                {/* Password Input */}
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={handleInputChange}
                    required
                    className={`w-full pl-12 pr-12 py-4 backdrop-blur-sm bg-white/20 border rounded-2xl placeholder-gray-500 text-gray-800 focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-300 ${
                      errors.password
                        ? 'border-red-300 focus:ring-red-400/50'
                        : 'border-white/20 focus:ring-blue-400/50'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                  {errors.password && (
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-red-500 text-sm mt-1 ml-1"
                    >
                      {errors.password}
                    </motion.p>
                  )}
                </div>

                {/* Confirm Password (Sign Up only) */}
                {!isLogin && (
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      name="confirmPassword"
                      placeholder="Confirm your password"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      required
                      className={`w-full pl-12 pr-12 py-4 backdrop-blur-sm bg-white/20 border rounded-2xl placeholder-gray-500 text-gray-800 focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-300 ${
                        errors.confirmPassword
                          ? 'border-red-300 focus:ring-red-400/50'
                          : 'border-white/20 focus:ring-blue-400/50'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                    {errors.confirmPassword && (
                      <motion.p
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-red-500 text-sm mt-1 ml-1"
                      >
                        {errors.confirmPassword}
                      </motion.p>
                    )}
                  </div>
                )}

                {/* Error Message */}
                {generalError && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 bg-red-50/50 border border-red-200/50 rounded-xl text-red-600 text-sm backdrop-blur-sm"
                  >
                    {generalError}
                  </motion.div>
                )}

                {/* Submit Button */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-blue-500 to-emerald-500 text-white py-4 rounded-2xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed relative z-10"
                >
                  {loading ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      {isLogin ? 'Signing in...' : 'Creating account...'}
                    </div>
                  ) : isLogin ? (
                    'Sign In'
                  ) : (
                    'Create Account'
                  )}
                </motion.button>
              </form>

              {/* Additional Info */}
              <div className="text-center mt-6">
                <p className="text-gray-500 text-xs">
                  {isLogin
                    ? 'By signing in, you agree to our Terms of Service and Privacy Policy'
                    : 'By creating an account, you agree to our Terms of Service and Privacy Policy'}
                </p>
              </div>

              {/* Mode Toggle at Bottom */}
              <div className="text-center mt-4">
                <button
                  type="button"
                  onClick={toggleMode}
                  className="text-blue-500 hover:text-blue-600 font-medium transition-colors text-sm"
                >
                  {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default AuthPanel;
