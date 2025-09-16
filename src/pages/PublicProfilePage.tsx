import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../hooks/useLanguage';
import { Navigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Users,
  MessageCircle,
  BookOpen,
  Award,
  UserPlus,
  UserCheck,
  Clock,
  UserX,
  Send,
} from 'lucide-react';
import { getProfileByUsername, UserProfile } from '../lib/auth';
import { sendFriendRequest, getFriendshipStatus } from '../lib/friends';
import { useToast } from '../hooks/useToast';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { BadgeGallery } from '../components/badges/BadgeGallery';
import {
  fetchAllBadges,
  fetchProfileBadges,
  type Badge as BadgeType,
  type ProfileBadge as ProfileBadgeType,
} from '../lib/badges';

const PublicProfilePage: React.FC = () => {
  // ✅ All hooks called at the top level FIRST
  const { user, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const { username } = useParams<{ username: string }>();
  // Remove unused state variables
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [friendshipStatus, setFriendshipStatus] = useState<string>('none');
  const [sendingRequest, setSendingRequest] = useState(false);
  const [allBadges, setAllBadges] = useState<BadgeType[]>([]);
  const [earnedBadges, setEarnedBadges] = useState<ProfileBadgeType[]>([]);

  // Load profile data
  useEffect(() => {
    const loadProfile = async () => {
      if (!username) return;

      setLoading(true);
      try {
        const profileData = await getProfileByUsername(username);
        setProfile(profileData.data);

        // Get friendship status if user is logged in
        if (user && profileData) {
          const status = await getFriendshipStatus(profileData.data?.id || '');
          setFriendshipStatus(status);
        }
      } catch (error) {
        console.error('Error loading profile:', error);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [username, user]);

  // Load badges when profile is available
  useEffect(() => {
    const loadBadges = async () => {
      if (!profile) return;
      const [all, earned] = await Promise.all([fetchAllBadges(), fetchProfileBadges(profile.id)]);
      setAllBadges(all);
      setEarnedBadges(earned);
    };
    loadBadges();
  }, [profile]);

  // SEO
  useEffect(() => {
    if (profile) {
      document.title = `${profile.full_name} (@${profile.username}) | Profile`;
    }
  }, [profile]);

  // ✅ Early returns AFTER all hooks
  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 flex items-center justify-center">
        <div className="backdrop-blur-md bg-white/30 rounded-3xl border border-white/20 shadow-lg p-8">
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
          <p className="text-gray-600 mt-4">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 flex items-center justify-center">
        <div className="backdrop-blur-md bg-white/30 rounded-3xl border border-white/20 shadow-lg p-8 text-center max-w-md">
          <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Profile Not Found</h2>
          <p className="text-gray-600 mb-6">
            The user you're looking for doesn't exist or their profile is private.
          </p>
          <Button
            onClick={() => window.history.back()}
            className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  // Don't allow viewing own profile via this route
  if (user && profile.id === user.id) {
    return <Navigate to="/profile" replace />;
  }

  const handleSendFriendRequest = async () => {
    if (!user || !profile || sendingRequest) {
      toast({
        title: 'Authentication Required',
        description: 'Please sign in to send friend requests',
        variant: 'destructive',
      });
      return;
    }

    setSendingRequest(true);
    try {
      await sendFriendRequest(profile.id);
      setFriendshipStatus('pending');
      toast({
        title: t('common.success'),
        description: 'Friend request sent successfully!',
      });
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error.message || 'Failed to send friend request',
        variant: 'destructive',
      });
    } finally {
      setSendingRequest(false);
    }
  };

  const getFriendshipStatusIcon = (status: string) => {
    switch (status) {
      case 'accepted':
        return <UserCheck className="w-4 h-4" />;
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'blocked':
        return <UserX className="w-4 h-4" />;
      default:
        return <UserPlus className="w-4 h-4" />;
    }
  };

  const getFriendshipStatusText = (status: string) => {
    switch (status) {
      case 'accepted':
        return 'Friends';
      case 'pending':
        return 'Request Sent';
      case 'blocked':
        return 'Blocked';
      default:
        return 'Add Friend';
    }
  };

  const canSendMessage = friendshipStatus === 'accepted' || !user;
  const currentLevel = Math.floor((profile.xp || 0) / 1000) + 1;
  const xpProgress = Math.min((((profile.xp || 0) % 1000) / 1000) * 100, 100);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header Navigation */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-6"
      >
        <Button
          onClick={() => window.history.back()}
          variant="ghost"
          className="bg-white/20 dark:bg-gray-800/20 backdrop-blur-sm border border-white/20 dark:border-gray-700/20 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      </motion.div>

      {/* Profile Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="backdrop-blur-md bg-white/30 dark:bg-gray-900/30 rounded-3xl border border-white/20 dark:border-gray-700/20 shadow-lg p-8 mb-8"
      >
        <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
          {/* Avatar Section */}
          <div className="relative">
            <Avatar className="w-32 h-32 border-4 border-white/20 shadow-lg">
              <AvatarImage
                src={profile.avatar_url || undefined}
                alt={profile.full_name}
                className="object-cover"
              />
              <AvatarFallback className="text-2xl font-bold bg-gradient-to-br from-blue-500 to-cyan-500 text-white">
                {profile.full_name
                  ?.split(' ')
                  .map((n) => n[0])
                  .join('')
                  .toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
          </div>

          {/* Profile Info */}
          <div className="flex-1 text-center md:text-left">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-800 dark:text-gray-200 mb-2">
              {profile.full_name}
            </h1>
            <p className="text-blue-500 font-medium mb-2">@{profile.username}</p>

            <div className="flex items-center justify-center md:justify-start gap-4 mb-4">
              <span className="text-sm text-blue-500 font-medium">Level {currentLevel}</span>
              <span className="text-sm text-gray-500 dark:text-gray-400">{profile.xp || 0} XP</span>
              {(profile.streak || 0) > 0 && (
                <div className="flex items-center gap-1 bg-orange-100/50 dark:bg-orange-900/30 px-2 py-1 rounded-full">
                  <Award className="w-4 h-4 text-orange-500" />
                  <span className="text-orange-600 dark:text-orange-400 text-sm font-medium">
                    {profile.streak} day streak
                  </span>
                </div>
              )}
            </div>

            {/* XP Progress Bar */}
            <div className="mb-6">
              <div className="w-full bg-white/20 dark:bg-gray-800/20 rounded-full h-2 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${xpProgress}%` }}
                  transition={{ duration: 1, delay: 0.5 }}
                  className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full"
                />
              </div>
              <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">
                {1000 - ((profile.xp || 0) % 1000)} XP to next level
              </p>
            </div>

            {/* Action Buttons */}
            {user && (
              <div className="flex gap-3 justify-center md:justify-start">
                <Button
                  onClick={handleSendFriendRequest}
                  disabled={
                    sendingRequest ||
                    friendshipStatus === 'pending' ||
                    friendshipStatus === 'accepted'
                  }
                  className={`${
                    friendshipStatus === 'accepted'
                      ? 'bg-emerald-500 hover:bg-emerald-600'
                      : friendshipStatus === 'pending'
                        ? 'bg-amber-500 hover:bg-amber-600'
                        : 'bg-gradient-to-r from-blue-500 to-cyan-500 hover:shadow-lg'
                  } text-white`}
                >
                  {sendingRequest ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                  ) : (
                    getFriendshipStatusIcon(friendshipStatus)
                  )}
                  <span className="ml-2">{getFriendshipStatusText(friendshipStatus)}</span>
                </Button>

                <Button
                  disabled={!canSendMessage}
                  variant="outline"
                  className="bg-white/20 dark:bg-gray-800/20 backdrop-blur-sm border-white/20 dark:border-gray-700/20 hover:bg-white/30 dark:hover:bg-gray-800/30"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Message
                </Button>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Bio and Interests */}
      {(profile.bio || (profile.interests && profile.interests.length > 0)) && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="backdrop-blur-md bg-white/30 dark:bg-gray-900/30 rounded-3xl border border-white/20 dark:border-gray-700/20 shadow-lg p-8 mb-8"
        >
          {profile.bio && (
            <div className="mb-6">
              <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-3">About</h3>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{profile.bio}</p>
            </div>
          )}

          {profile.interests &&
            Array.isArray(profile.interests) &&
            profile.interests.length > 0 && (
              <div>
                <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-3">
                  Interests
                </h3>
                <div className="flex flex-wrap gap-2">
                  {profile.interests.map((interest: string, idx: number) => (
                    <Badge
                      key={idx}
                      className="bg-blue-100/50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-blue-200/50 dark:border-blue-700/50"
                    >
                      {interest.trim()}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
        </motion.div>
      )}

      {/* Badges */}
      {allBadges.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15 }}
          className="mb-8"
        >
          <BadgeGallery badges={allBadges} earned={earnedBadges} />
        </motion.div>
      )}

      {/* Stats Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.4 }}
        className="grid md:grid-cols-3 gap-6"
      >
        {[
          {
            icon: Users,
            label: 'Rooms Created',
            value: profile.rooms_created || 0,
            color: 'from-blue-500 to-cyan-500',
            description: 'Study rooms created',
          },
          {
            icon: BookOpen,
            label: 'Rooms Joined',
            value: profile.rooms_joined || 0,
            color: 'from-emerald-500 to-teal-500',
            description: 'Study sessions attended',
          },
          {
            icon: MessageCircle,
            label: 'Messages Sent',
            value: profile.messages_sent || 0,
            color: 'from-amber-500 to-orange-500',
            description: 'Messages in study rooms',
          },
        ].map((stat, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 + index * 0.1 }}
            className="backdrop-blur-md bg-white/30 dark:bg-gray-900/30 rounded-3xl border border-white/20 dark:border-gray-700/20 shadow-lg p-6 text-center"
          >
            <div
              className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${stat.color} flex items-center justify-center mx-auto mb-4`}
            >
              <stat.icon className="w-6 h-6 text-white" />
            </div>
            <div className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-1">
              {stat.value}
            </div>
            <p className="text-gray-600 dark:text-gray-400 font-medium mb-1">{stat.label}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{stat.description}</p>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
};

export default PublicProfilePage;
