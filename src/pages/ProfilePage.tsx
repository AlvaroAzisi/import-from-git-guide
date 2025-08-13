import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import {
  BookOpen,
  Users,
  MessageCircle,
  Edit3,
  Save,
  X,
  Camera,
  Award,
  Loader2,
  Plus,
  TrendingUp,
} from 'lucide-react';
import { updateProfile, createOrUpdateProfile as upsertProfile } from '../lib/auth';
import { uploadAvatar } from '../lib/storage';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Textarea } from '../components/ui/textarea';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { useToast } from '../hooks/useToast';
import { cn } from '../lib/utils';

const ProfilePage: React.FC = () => {
  const { user, profile, loading: authLoading, refreshProfile } = useAuth();
  const { toast } = useToast();

  // Local loading state for fetch-or-create
  const [localLoading, setLocalLoading] = useState(true);

  // Form and UI states
  const [editForm, setEditForm] = useState({
    full_name: '',
    username: '',
    bio: '',
    interests: [] as string[],
  });
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [newInterest, setNewInterest] = useState('');
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState({ roomsCreated: 0, roomsJoined: 0, messagesSent: 0 });

  // Combined loading
  const loading = authLoading || localLoading;

  // 1) Fetch or create profile on mount
  useEffect(() => {
    const init = async () => {
      console.log('[ProfilePage] Initializing...', { authLoading, user: user?.id });
      if (authLoading) return;
      if (!user) {
        console.log('[ProfilePage] No user, setting localLoading to false');
        setLocalLoading(false);
        return;
      }
      try {
        console.log('[ProfilePage] Upserting profile for user:', user.id);
        await upsertProfile(user);
        console.log('[ProfilePage] Profile upsert complete');
      } catch (err) {
        console.error('[ProfilePage] Error upserting profile:', err);
      } finally {
        setLocalLoading(false);
      }
    };
    init();
  }, [authLoading, user]);

  // 2) Sync editForm & stats when context profile changes
  useEffect(() => {
    console.log('[ProfilePage] Profile changed:', profile);
    if (profile) {
      console.log('[ProfilePage] Profile data:', {
        full_name: profile.full_name,
        username: profile.username,
        bio: profile.bio,
        interests: profile.interests,
        interests_type: typeof profile.interests,
        interests_is_array: Array.isArray(profile.interests),
        rooms_created: profile.rooms_created,
        rooms_joined: profile.rooms_joined,
        messages_sent: profile.messages_sent,
      });

      setEditForm({
        full_name: profile.full_name || '',
        username: profile.username || '',
        bio: profile.bio || '',
        interests: Array.isArray(profile.interests) ? profile.interests : [],
      });
      setStats({
        roomsCreated: profile.rooms_created || 0,
        roomsJoined: profile.rooms_joined || 0,
        messagesSent: profile.messages_sent || 0,
      });
    }
  }, [profile]);

  if (loading) {
    console.log('[ProfilePage] Showing loading state');
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 flex items-center justify-center">
        <div className="backdrop-blur-md bg-white/30 rounded-3xl border border-white/20 shadow-lg p-8">
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    console.log('[ProfilePage] No user or profile, redirecting', { user: !!user, profile: !!profile });
    return <Navigate to="/" replace />;
  }

  console.log('[ProfilePage] Rendering profile page for:', user.id);

  // Handlers with debug logging
  const handleSave = async () => {
    setSaving(true);
    console.log('[ProfilePage] Starting profile update...');
    console.log('[ProfilePage] User ID:', user.id);
    console.log('[ProfilePage] Form data:', editForm);
    
    try {
      const result = await updateProfile(user.id, {
        full_name: editForm.full_name,
        username: editForm.username,
        bio: editForm.bio,
        interests: editForm.interests
      });
      
      console.log('[ProfilePage] Update result:', result);
      
      toast({ title: 'Profile updated', description: 'Your profile has been updated.' });
      setIsEditing(false);
      
      // Wait a moment before refreshing
      setTimeout(async () => {
        console.log('[ProfilePage] Refreshing profile...');
        await refreshProfile();
      }, 300);
      
    } catch (err) {
      console.error('[ProfilePage] Update failed:', err);
      toast({ 
        title: 'Error', 
        description: `Update failed: ${err instanceof Error ? err.message : 'Unknown error'}`, 
        variant: 'destructive' 
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveBio = async () => {
    setSaving(true);
    console.log('[ProfilePage] Updating bio and interests:', { bio: editForm.bio, interests: editForm.interests });
    
    try {
      const result = await updateProfile(user.id, { 
        bio: editForm.bio, 
        interests: editForm.interests 
      });
      
      console.log('[ProfilePage] Bio update result:', result);
      
      toast({ title: 'Bio updated', description: 'Your bio has been updated.' });
      setIsEditingBio(false);
      
      setTimeout(async () => {
        console.log('[ProfilePage] Refreshing profile after bio update...');
        await refreshProfile();
      }, 300);
      
    } catch (err) {
      console.error('[ProfilePage] Bio update failed:', err);
      toast({ 
        title: 'Error', 
        description: `Bio update failed: ${err instanceof Error ? err.message : 'Unknown error'}`, 
        variant: 'destructive' 
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    
    console.log('[ProfilePage] Starting avatar upload:', { fileName: file.name, fileSize: file.size });
    setUploadingAvatar(true);
    try {
      const url = await uploadAvatar(file, user.id);
      console.log('[ProfilePage] Avatar uploaded successfully:', url);
      
      if (url) {
        await updateProfile(user.id, { avatar_url: url });
        toast({ title: 'Avatar updated', description: 'Your avatar has been updated.' });
        await refreshProfile();
      } else {
        throw new Error('Failed to upload avatar');
      }
    } catch (err) {
      console.error('[ProfilePage] Avatar upload failed:', err);
      toast({ title: 'Error', description: 'Avatar upload failed.', variant: 'destructive' });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleAddInterest = () => {
    if (!newInterest.trim()) {
      console.log('[ProfilePage] Cannot add empty interest');
      return;
    }
    console.log('[ProfilePage] Adding interest:', newInterest.trim());
    setEditForm((p) => ({ ...p, interests: [...p.interests, newInterest.trim()] }));
    setNewInterest('');
  };

  const handleRemoveInterest = (item: string) => {
    console.log('[ProfilePage] Removing interest:', item);
    setEditForm((p) => ({ ...p, interests: p.interests.filter((i) => i !== item) }));
  };

  // This is now correctly placed at top level with other hooks
  const safeInterests = React.useMemo(() => {
    if (!profile) return []; // Condition is INSIDE the callback
    const interests = profile.interests;
    if (!interests) return [];
    if (Array.isArray(interests)) return interests;
    if (typeof interests === 'string') {
      try {
        const parsed = JSON.parse(interests);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [interests];
      }
    }
    return [];
  }, [profile]); // Only depend on profile, not nested property

  // Log after the hook declaration
  console.log('[ProfilePage] Safe interests:', safeInterests);

  // JSX
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
        <motion.div 
          initial={{ opacity: 0, y: 30 }} 
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <Card className="p-6 backdrop-blur-md bg-white/30 dark:bg-gray-900/30 border-white/20 dark:border-gray-700/20 rounded-3xl shadow-2xl">
            <CardContent>
              <div className="flex flex-col md:flex-row items-center gap-8">
                <motion.div 
                  className="relative"
                  whileHover={{ scale: 1.05, rotate: 2 }}
                  transition={{ duration: 0.3 }}
                >
                  <Avatar className="w-36 h-36 border-4 border-white/30 dark:border-gray-700/30 shadow-xl">
                    <AvatarImage src={profile.avatar_url || undefined} />
                    <AvatarFallback className="text-2xl font-bold">
                      {profile.full_name?.charAt(0)?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <input
                    id="avatar-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarUpload}
                    disabled={uploadingAvatar}
                  />
                  <motion.label
                    htmlFor="avatar-upload"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    className={cn(
                      'absolute -bottom-2 -right-2 p-3 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 text-white cursor-pointer shadow-lg',
                      uploadingAvatar && 'opacity-50 pointer-events-none'
                    )}
                  >
                    {uploadingAvatar ? <Loader2 className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5" />}
                  </motion.label>
                </motion.div>
                <div className="flex-1">
                  {isEditing ? (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-4"
                    >
                      <Input
                        value={editForm.full_name}
                        onChange={(e) => setEditForm((p) => ({ ...p, full_name: e.target.value }))}
                        placeholder="Full Name"
                        className="backdrop-blur-sm bg-white/50 dark:bg-gray-800/50"
                      />
                      <Input
                        value={editForm.username}
                        onChange={(e) => setEditForm((p) => ({ ...p, username: e.target.value }))}
                        placeholder="@username"
                        className="backdrop-blur-sm bg-white/50 dark:bg-gray-800/50"
                      />
                      <div className="flex gap-2">
                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                          <Button onClick={handleSave} disabled={saving} className="bg-gradient-to-r from-emerald-500 to-teal-500">
                            {saving ? 'Saving...' : (<><Save className="w-4 h-4 mr-1" />Save</>)}
                          </Button>
                        </motion.div>
                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                          <Button variant="outline" onClick={() => setIsEditing(false)}>
                            <X className="w-4 h-4 mr-1" />Cancel
                          </Button>
                        </motion.div>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5 }}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <motion.h1 
                          initial={{ scale: 0.9 }}
                          animate={{ scale: 1 }}
                          transition={{ duration: 0.5, delay: 0.2 }}
                          className="text-4xl font-bold text-gray-800 dark:text-gray-200"
                        >
                          {profile.full_name || 'Unknown User'}
                        </motion.h1>
                        <motion.div whileHover={{ scale: 1.1, rotate: 15 }} whileTap={{ scale: 0.9 }}>
                          <Button size="icon" variant="ghost" onClick={() => setIsEditing(true)} className="hover:bg-blue-100 dark:hover:bg-blue-900/20">
                            <Edit3 className="w-5 h-5 text-blue-500" />
                          </Button>
                        </motion.div>
                      </div>
                      <p className="text-blue-500 dark:text-blue-400 text-lg font-medium mb-1">@{profile.username || 'unknown'}</p>
                      <p className="text-gray-600 dark:text-gray-400 mb-4">{profile.email || 'No email'}</p>
                      <div className="grid grid-cols-2 gap-4">
                        <motion.div
                          whileHover={{ scale: 1.02 }}
                          className="backdrop-blur-sm bg-gradient-to-r from-amber-500/20 to-orange-500/20 rounded-2xl p-4 text-center"
                        >
                          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{profile.xp || 0}</div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">XP Points</div>
                        </motion.div>
                        <motion.div
                          whileHover={{ scale: 1.02 }}
                          className="backdrop-blur-sm bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-2xl p-4 text-center"
                        >
                          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{profile.streak || 0}</div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">Day Streak</div>
                        </motion.div>
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 30 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.2, duration: 0.8 }}
        >
          <Card className="backdrop-blur-md bg-white/30 dark:bg-gray-900/30 border-white/20 dark:border-gray-700/20 rounded-3xl shadow-lg hover:shadow-xl transition-all duration-300">
            <CardHeader className="flex flex-row justify-between items-center">
              <CardTitle className="text-2xl font-bold text-gray-800 dark:text-gray-200">Bio & Interests</CardTitle>
              <motion.div whileHover={{ scale: 1.1, rotate: 15 }} whileTap={{ scale: 0.9 }}>
                <Button size="icon" variant="ghost" onClick={() => setIsEditingBio(!isEditingBio)} className="hover:bg-blue-100 dark:hover:bg-blue-900/20">
                  {isEditingBio ? <X className="w-5 h-5 text-red-500" /> : <Edit3 className="w-5 h-5 text-blue-500" />}
                </Button>
              </motion.div>
            </CardHeader>
            <CardContent>
              {isEditingBio ? (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <Textarea
                    rows={4}
                    value={editForm.bio}
                    onChange={(e) => setEditForm((p) => ({ ...p, bio: e.target.value }))}
                    placeholder="Tell us about yourself..."
                    className="backdrop-blur-sm bg-white/50 dark:bg-gray-800/50 border-white/30 dark:border-gray-700/30 focus:border-blue-400 transition-all duration-300"
                  />
                  <div className="flex gap-2 my-4">
                    <Input
                      value={newInterest}
                      onChange={(e) => setNewInterest(e.target.value)}
                      placeholder="Add interest (press Enter)"
                      onKeyDown={(e) => e.key === 'Enter' && handleAddInterest()}
                      className="backdrop-blur-sm bg-white/50 dark:bg-gray-800/50 border-white/30 dark:border-gray-700/30"
                    />
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button size="icon" onClick={handleAddInterest} className="bg-gradient-to-r from-emerald-500 to-teal-500">
                        <Plus className="w-4 h-4" />
                      </Button>
                    </motion.div>
                  </div>
                  <motion.div className="flex flex-wrap gap-2 mb-4">
                    {(editForm.interests || []).map((interest, index) => (
                      <motion.div
                        key={interest}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                        whileHover={{ scale: 1.05 }}
                      >
                        <Badge 
                          onClick={() => handleRemoveInterest(interest)}
                          className="cursor-pointer bg-gradient-to-r from-blue-500/20 to-purple-500/20 hover:from-red-500/20 hover:to-pink-500/20 transition-all duration-300"
                        >
                          {interest} <X className="w-3 h-3 ml-1" />
                        </Badge>
                      </motion.div>
                    ))}
                  </motion.div>
                  <div className="flex gap-2">
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button onClick={handleSaveBio} disabled={saving} className="bg-gradient-to-r from-emerald-500 to-teal-500">
                        {saving ? 'Saving...' : 'Save Changes'}
                      </Button>
                    </motion.div>
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button variant="outline" onClick={() => setIsEditingBio(false)}>
                        Cancel
                      </Button>
                    </motion.div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5 }}
                >
                  <p className="text-gray-700 dark:text-gray-300 text-lg leading-relaxed mb-6">
                    {profile.bio || 'No bio yet. Click edit to add one!'}
                  </p>
                  <div className="flex flex-wrap gap-3">
                    {safeInterests.length > 0 ? (
                      safeInterests.map((interest, index) => (
                        <motion.div
                          key={`${interest}-${index}`}
                          initial={{ opacity: 0, scale: 0.8, y: 20 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          transition={{ duration: 0.4, delay: index * 0.1 }}
                          whileHover={{ scale: 1.05, y: -2 }}
                        >
                          <Badge className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-blue-700 dark:text-blue-300 border-blue-200/50 dark:border-blue-700/50 px-3 py-1 text-sm">
                            {interest}
                          </Badge>
                        </motion.div>
                      ))
                    ) : (
                      <p className="text-gray-500 dark:text-gray-400 italic">No interests added yet.</p>
                    )}
                  </div>
                </motion.div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Stats Grid */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.4, duration: 0.8 }}
        >
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-6">Statistics</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Users, label: 'Rooms Created', value: stats.roomsCreated, color: 'from-blue-500 to-cyan-500' },
              { icon: BookOpen, label: 'Rooms Joined', value: stats.roomsJoined, color: 'from-emerald-500 to-teal-500' },
              { icon: MessageCircle, label: 'Messages Sent', value: stats.messagesSent, color: 'from-amber-500 to-orange-500' },
              { icon: Award, label: 'Study Streak', value: profile.streak || 0, color: 'from-purple-500 to-pink-500' },
            ].map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.5 + index * 0.1 }}
                whileHover={{ scale: 1.05, y: -5 }}
              >
                <Card className="backdrop-blur-md bg-white/30 dark:bg-gray-900/30 border-white/20 dark:border-gray-700/20 rounded-3xl shadow-lg hover:shadow-xl transition-all duration-300 p-6">
                  <CardContent className="flex flex-col items-center">
                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${stat.color} flex items-center justify-center mb-4 shadow-lg`}>
                      <stat.icon className="w-7 h-7 text-white" />
                    </div>
                    <motion.p 
                      className="text-3xl font-bold text-gray-800 dark:text-gray-200 mb-2"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ duration: 0.5, delay: 0.6 + index * 0.1 }}
                    >
                      {stat.value}
                    </motion.p>
                    <p className="text-gray-600 dark:text-gray-400 text-center font-medium">{stat.label}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Recent Activity */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.6, duration: 0.8 }}
        >
          <Card className="backdrop-blur-md bg-white/30 dark:bg-gray-900/30 border-white/20 dark:border-gray-700/20 rounded-3xl shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-gray-800 dark:text-gray-200 flex items-center gap-3">
                <TrendingUp className="w-6 h-6 text-blue-500" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { activity: 'Joined Mathematics room', time: '2h ago', icon: BookOpen },
                { activity: 'Completed Physics session', time: '1d ago', icon: Award },
                { activity: 'Created Chemistry group', time: '3d ago', icon: Users },
              ].map((item, index) => (
                <motion.div 
                  key={item.activity}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: 0.7 + index * 0.1 }}
                  whileHover={{ scale: 1.02, x: 5 }}
                  className="flex items-center justify-between p-4 backdrop-blur-sm bg-white/20 dark:bg-gray-800/20 rounded-2xl border border-white/10 dark:border-gray-700/10"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                      <item.icon className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-gray-700 dark:text-gray-300 font-medium">{item.activity}</span>
                  </div>
                  <span className="text-gray-500 dark:text-gray-400 text-sm">{item.time}</span>
                </motion.div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      </div>
  );
};

export default ProfilePage;