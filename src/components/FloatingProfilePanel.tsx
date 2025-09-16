import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, UserPlus, UserMinus, MessageCircle, BookOpen, Award, Clock } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { useNavigate } from 'react-router-dom';
import {
  getProfileDetails,
  sendFriendRequest,
  removeFriend,
  canStartDM,
  type ProfileDetails,
} from '../lib/supabase-rpc';

import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';

import { Badge } from './ui/badge';

import type { Room } from '../types/room';

import { Button } from './ui/button'; // Fixed import statement
interface FloatingProfilePanelProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}

/**
 * FloatingProfilePanel - Detailed profile view with actions for /temanku
 *
 * Manual test steps:
 * 1. Click username in /temanku search results
 * 2. Panel should open centered with profile details
 * 3. Add Friend button should work (respect existing friendship status)
 * 4. DM button should respect DM limits and navigate to chat
 * 5. ESC/backdrop should close panel
 * 6. Show mutual rooms and shared interests
 */
export const FloatingProfilePanel: React.FC<FloatingProfilePanelProps> = ({
  isOpen,
  onClose,
  userId,
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<ProfileDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [canDM, setCanDM] = useState(false);

  // Load profile details when panel opens
  useEffect(() => {
    const loadProfile = async () => {
      if (!isOpen || !userId) return;

      setLoading(true);
      try {
        // TODO: DB/RLS: Varo will paste SQL for get_profile_details RPC
        // Expected params: { user_id: string, viewer_id: string }
        // Expected response: ProfileDetails with mutual_rooms, friendship_status, etc.
        const profileData = await getProfileDetails(userId);
        setProfile(profileData);

        // TODO: DB/RLS: Varo will paste SQL for can_start_dm RPC
        // Expected params: { target_user_id: string }
        // Expected response: { can_dm: boolean, reason?: string }
        const dmCheck = await canStartDM(userId);
        setCanDM(dmCheck.can_dm);
      } catch (error: unknown) {
        console.error('Error loading profile:', error);
        toast({
          title: 'Error',
          description:
            error && typeof error === 'object' && 'message' in error
              ? (error as { message?: string }).message || 'Failed to load profile details'
              : 'Failed to load profile details',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [isOpen, userId, toast]);

  // Handle ESC key and focus trap
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  const handleFriendAction = async () => {
    if (!profile || actionLoading) return;

    const action = profile.friendship_status === 'accepted' ? 'remove' : 'add';
    setActionLoading('friend');

    try {
      if (action === 'add') {
        // TODO: DB/RLS: Varo will paste SQL for send_friend_request RPC
        // Expected params: { to_user_id: string }
        // Expected response: { success: boolean, status: string, error?: string }
        const result = await sendFriendRequest(userId);

        if (result.success) {
          setProfile((prev) =>
            prev
              ? {
                  ...prev,
                  friendship_status: result.status as 'pending' | 'accepted' | 'none' | 'blocked',
                }
              : null
          );
          toast({
            title: 'Friend Request Sent',
            description: `Friend request sent to ${profile.full_name}`,
          });
        } else {
          throw new Error(result.error || 'Failed to send friend request');
        }
      } else {
        // TODO: DB/RLS: Varo will paste SQL for remove_friend RPC
        // Expected params: { friend_id: string }
        // Expected response: { success: boolean, error?: string }
        const result = await removeFriend(userId);

        if (result.success) {
          setProfile((prev) => (prev ? { ...prev, friendship_status: 'none' } : null));
          toast({
            title: 'Friend Removed',
            description: `Removed ${profile.full_name} from friends`,
          });
        } else {
          throw new Error(result.error || 'Failed to remove friend');
        }
      }
    } catch (error: unknown) {
      toast({
        title: 'Error',
        description:
          error && typeof error === 'object' && 'message' in error
            ? (error as { message?: string }).message || `Failed to ${action} friend`
            : `Failed to ${action} friend`,
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleStartDM = async () => {
    if (!profile || !canDM || actionLoading) return;

    setActionLoading('dm');
    try {
      // Navigate to DM chat
      navigate(`/chat/@${profile.username}`);
      onClose();
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to start conversation',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const getFriendButtonText = () => {
    switch (profile?.friendship_status) {
      case 'accepted':
        return 'Remove Friend';
      case 'pending':
        return 'Request Sent';
      default:
        return 'Add Friend';
    }
  };

  const getFriendButtonIcon = () => {
    switch (profile?.friendship_status) {
      case 'accepted':
        return UserMinus;
      case 'pending':
        return Clock;
      default:
        return UserPlus;
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={handleBackdropClick}
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0"
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.15 }}
            className="relative w-full max-w-md bg-white/90 dark:bg-gray-900/90 backdrop-blur-lg rounded-2xl border border-white/20 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="relative p-6 bg-gradient-to-br from-blue-500/10 to-purple-500/10">
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-1 rounded-lg hover:bg-white/20 transition-colors"
                aria-label="Close panel"
              >
                <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>

              {loading ? (
                <div className="text-center">
                  <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto mb-4 animate-pulse"></div>
                  <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-32 mx-auto mb-2 animate-pulse"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 mx-auto animate-pulse"></div>
                </div>
              ) : profile ? (
                <div className="text-center">
                  <Avatar className="w-16 h-16 mx-auto mb-4 border-4 border-white/20">
                    <AvatarImage src={profile.avatar_url || undefined} alt={profile.full_name} />
                    <AvatarFallback className="text-xl font-bold bg-gradient-to-br from-blue-500 to-purple-500 text-white">
                      {profile.full_name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1">
                    {profile.full_name}
                  </h3>

                  <p className="text-blue-500 font-medium mb-2">@{profile.username}</p>

                  <div className="flex items-center justify-center gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <Award className="w-4 h-4 text-amber-500" />
                      <span className="text-gray-600 dark:text-gray-400">
                        Level {Math.floor((profile.xp || 0) / 1000) + 1}
                      </span>
                    </div>
                    {profile.streak && profile.streak > 0 && (
                      <div className="flex items-center gap-1">
                        <span className="text-orange-500">🔥</span>
                        <span className="text-gray-600 dark:text-gray-400">
                          {profile.streak} day streak
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-gray-600 dark:text-gray-400">Profile not found</p>
                </div>
              )}
            </div>

            {/* Content */}
            {!loading && profile && (
              <div className="p-6 space-y-6">
                {/* Bio */}
                {profile.bio && (
                  <div>
                    <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">About</h4>
                    <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                      {profile.bio}
                    </p>
                  </div>
                )}

                {/* Interests */}
                {profile.interests && profile.interests.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">
                      Interests
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {profile.interests.map((interest: string, idx: number) => (
                        <Badge
                          key={idx}
                          className="bg-blue-100/50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                        >
                          {interest}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Mutual Rooms */}
                {profile.mutual_rooms && profile.mutual_rooms.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-2 flex items-center gap-2">
                      <BookOpen className="w-4 h-4" />
                      Mutual Study Rooms ({profile.mutual_rooms.length})
                    </h4>
                    <div className="space-y-2">
                      {profile.mutual_rooms.slice(0, 3).map((room: Room) => (
                        <div
                          key={room.id}
                          className="flex items-center gap-2 p-2 bg-white/20 dark:bg-gray-800/20 rounded-lg"
                        >
                          <BookOpen className="w-4 h-4 text-blue-500" />
                          <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
                            {room.name}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3 bg-white/20 dark:bg-gray-800/20 rounded-xl">
                    <div className="text-lg font-bold text-gray-800 dark:text-gray-200">
                      {profile.xp || 0}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">XP</div>
                  </div>
                  <div className="text-center p-3 bg-white/20 dark:bg-gray-800/20 rounded-xl">
                    <div className="text-lg font-bold text-gray-800 dark:text-gray-200">
                      {profile.rooms_joined || 0}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">Rooms</div>
                  </div>
                  <div className="text-center p-3 bg-white/20 dark:bg-gray-800/20 rounded-xl">
                    <div className="text-lg font-bold text-gray-800 dark:text-gray-200">
                      {profile.streak || 0}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">Streak</div>
                  </div>
                </div>

                {/* Action Buttons */}
                {user?.id !== userId && (
                  <div className="flex gap-3">
                    <Button
                      onClick={handleFriendAction}
                      disabled={
                        actionLoading === 'friend' || profile.friendship_status === 'pending'
                      }
                      className={`flex-1 ${
                        profile.friendship_status === 'accepted'
                          ? 'bg-red-500 hover:bg-red-600'
                          : profile.friendship_status === 'pending'
                            ? 'bg-amber-500 hover:bg-amber-600'
                            : 'bg-gradient-to-r from-blue-500 to-purple-500'
                      } text-white`}
                    >
                      {actionLoading === 'friend' ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          {React.createElement(getFriendButtonIcon(), {
                            className: 'w-4 h-4 mr-2',
                          })}
                          {getFriendButtonText()}
                        </>
                      )}
                    </Button>

                    <Button
                      onClick={handleStartDM}
                      disabled={!canDM || actionLoading === 'dm'}
                      variant="outline"
                      className="bg-white/20 dark:bg-gray-800/20 backdrop-blur-sm border-white/20 dark:border-gray-700/20"
                      title={!canDM ? 'DM limit reached or user unavailable' : 'Send message'}
                    >
                      {actionLoading === 'dm' ? (
                        <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <MessageCircle className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
