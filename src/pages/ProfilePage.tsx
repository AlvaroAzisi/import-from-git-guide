import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
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
  LogOut,
  Plus,
} from 'lucide-react';
import { updateProfile, createOrUpdateProfile as upsertProfile } from '../lib/auth';
import { supabase } from '../lib/supabase';
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
  const { user, profile, loading: authLoading } = useAuth();
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
      if (authLoading) return;
      if (!user) {
        setLocalLoading(false);
        return;
      }
      try {
        await upsertProfile(user);
      } catch (err) {
        console.error('Error upserting profile:', err);
      } finally {
        setLocalLoading(false);
      }
    };
    init();
  }, [authLoading, user]);

  // 2) Sync editForm & stats when context profile changes
  useEffect(() => {
    if (profile) {
      setEditForm({
        full_name: profile.full_name,
        username: profile.username,
        bio: profile.bio,
        interests: Array.isArray(profile.interests) ? profile.interests : [],
      });
      setStats({
        roomsCreated: profile.rooms_created,
        roomsJoined: profile.rooms_joined,
        messagesSent: profile.messages_sent,
      });
    }
  }, [profile]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin w-8 h-8 text-gray-400" />
      </div>
    );
  }

  if (!user || !profile) {
    return <Navigate to="/" replace />;
  }

  // Handlers
  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfile(user.id, { ...editForm, interests: editForm.interests });
      toast({ title: 'Profile updated', description: 'Your profile has been updated.' });
      setIsEditing(false);
      await upsertProfile(user);
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to update profile.', variant: 'destructive' });
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveBio = async () => {
    setSaving(true);
    try {
      await updateProfile(user.id, { bio: editForm.bio, interests: editForm.interests });
      toast({ title: 'Bio updated', description: 'Your bio has been updated.' });
      setIsEditingBio(false);
      await upsertProfile(user);
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to update bio.', variant: 'destructive' });
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploadingAvatar(true);
    try {
      const url = await uploadAvatar(file, user.id);
      await updateProfile(user.id, { avatar_url: url ?? undefined });
      toast({ title: 'Avatar updated', description: 'Your avatar has been updated.' });
      await upsertProfile(user);
    } catch (err) {
      toast({ title: 'Error', description: 'Avatar upload failed.', variant: 'destructive' });
      console.error(err);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const handleAddInterest = () => {
    if (!newInterest.trim()) return;
    setEditForm((p) => ({ ...p, interests: [...p.interests, newInterest.trim()] }));
    setNewInterest('');
  };

  const handleRemoveInterest = (item: string) =>
    setEditForm((p) => ({ ...p, interests: p.interests.filter((i) => i !== item) }));

  // JSX
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50">
      <nav className="backdrop-blur bg-white/30 sticky top-0 z-50 border-b border-white/20">
        <div className="max-w-6xl mx-auto flex justify-between p-4">
          <div className="flex items-center gap-2">
            <BookOpen className="w-8 h-8 text-blue-500" />
            <span className="text-2xl font-bold">Kupintar</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="/home">Home</a>
            <a href="/temanku">Find Friends</a>
            <button onClick={handleSignOut} className="flex items-center gap-1">
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto p-6 space-y-8">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Card className="p-6 bg-white/30 backdrop-blur rounded-2xl shadow-lg">
            <CardContent>
              <div className="flex flex-col md:flex-row items-center gap-8">
                <div className="relative">
                  <Avatar className="w-32 h-32 border-4 border-white/20">
                    <AvatarImage src={profile.avatar_url || undefined} />
                    <AvatarFallback>
                      {profile.full_name.charAt(0).toUpperCase() || 'U'}
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
                  <label
                    htmlFor="avatar-upload"
                    className={cn(
                      'absolute -bottom-2 -right-2 p-2 rounded-full bg-blue-500 text-white cursor-pointer',
                      uploadingAvatar && 'opacity-50 pointer-events-none'
                    )}
                  >
                    {uploadingAvatar ? <Loader2 className="animate-spin" /> : <Camera />}
                  </label>
                </div>
                <div className="flex-1">
                  {isEditing ? (
                    <div className="space-y-4">
                      <Input
                        value={editForm.full_name}
                        onChange={(e) => setEditForm((p) => ({ ...p, full_name: e.target.value }))}
                        placeholder="Full Name"
                      />
                      <Input
                        value={editForm.username}
                        onChange={(e) => setEditForm((p) => ({ ...p, username: e.target.value }))}
                        placeholder="@username"
                      />
                      <div className="flex gap-2">
                        <Button onClick={handleSave} disabled={saving}>
                          {saving ? 'Saving...' : (<><Save className="w-4 h-4 mr-1" />Save</>)}
                        </Button>
                        <Button variant="outline" onClick={() => setIsEditing(false)}>
                          <X className="w-4 h-4 mr-1" />Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        <h1 className="text-3xl font-bold">{profile.full_name}</h1>
                        <Button size="icon" variant="ghost" onClick={() => setIsEditing(true)}>
                          <Edit3 className="w-4 h-4" />
                        </Button>
                      </div>
                      <p className="text-blue-500">@{profile.username}</p>
                      <p className="text-gray-600">{profile.email}</p>
                      <div className="mt-4 space-y-1">
                        <p>XP: {profile.xp}</p>
                        <p>Streak: {profile.streak} days</p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
          <Card className="bg-white/30 backdrop-blur rounded-2xl shadow-lg">
            <CardHeader className="flex justify-between items-center">
              <CardTitle>Bio & Interests</CardTitle>
              <Button size="icon" variant="ghost" onClick={() => setIsEditingBio(!isEditingBio)}>
                {isEditingBio ? <X className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
              </Button>
            </CardHeader>
            <CardContent>
              {isEditingBio ? (
                <>
                  <Textarea
                    rows={3}
                    value={editForm.bio}
                    onChange={(e) => setEditForm((p) => ({ ...p, bio: e.target.value }))}
                    placeholder="Tell us about yourself"
                  />
                  <div className="flex gap-2 my-2">
                    <Input
                      value={newInterest}
                      onChange={(e) => setNewInterest(e.target.value)}
                      placeholder="Add interest"
                      onKeyDown={(e) => e.key === 'Enter' && handleAddInterest()}
                    />
                    <Button size="icon" onClick={handleAddInterest}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {editForm.interests.map((i) => (
                      <Badge key={i} onClick={() => handleRemoveInterest(i)}>
                        {i} <X className="w-3 h-3 ml-1" />
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleSaveBio} disabled={saving}>
                      {saving ? 'Saving...' : 'Save Changes'}
                    </Button>
                    <Button variant="outline" onClick={() => setIsEditingBio(false)}>
                      Cancel
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <p className="mb-4">{profile.bio || 'No bio yet.'}</p>
                  <div className="flex flex-wrap gap-2">
                    {profile.interests.map((i) => (
                      <Badge key={i}>{i}</Badge>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Stats Grid */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Users, label: 'Rooms Created', value: stats.roomsCreated },
              { icon: BookOpen, label: 'Rooms Joined', value: stats.roomsJoined },
              { icon: MessageCircle, label: 'Messages Sent', value: stats.messagesSent },
              { icon: Award, label: 'Study Streak', value: profile.streak },
            ].map((s) => (
              <Card key={s.label} className="p-4 bg-white/30 backdrop-blur rounded-xl">
                <CardContent className="flex flex-col items-center">
                  <s.icon className="w-7 h-7 mb-2 text-blue-500" />
                  <p className="text-xl font-bold">{s.value}</p>
                  <p className="text-gray-600">{s.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </motion.div>

        {/* Recent Activity (dummy) */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
          <Card className="bg-white/30 backdrop-blur rounded-xl">
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                'Joined Mathematics room',
                'Completed Physics session',
                'Created Chemistry group',
              ].map((act) => (
                <div key={act} className="flex justify-between">
                  <span>{act}</span>
                  <span className="text-gray-500 text-sm">2h ago</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default ProfilePage;
