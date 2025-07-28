import React, { useState } from 'react';
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
  Calendar,
  LogOut,
  Plus
} from 'lucide-react';
import { updateProfile } from '../lib/auth';
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
  // ✅ All hooks called at the top level FIRST
  const { user, profile, loading } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [language, setLanguage] = useState<'ID' | 'EN'>('EN');
  const [newInterest, setNewInterest] = useState('');
  const [editForm, setEditForm] = useState({
    full_name: profile?.full_name || '',
    username: profile?.username || '',
    bio: profile?.bio || '',
    interests: Array.isArray(profile?.interests) ? profile.interests : []
  });
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState({
    roomsCreated: 0,
    roomsJoined: 0,
    messagesSent: 0
  });

  // Fetch user stats
  React.useEffect(() => {
    const fetchStats = async () => {
      if (!user) return;
      
      try {
        // This would be replaced with actual queries to your rooms/messages tables
        // For now, using mock data based on profile
        setStats({
          roomsCreated: profile?.rooms_created || 0,
          roomsJoined: profile?.rooms_joined || 0,
          messagesSent: profile?.messages_sent || 0
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    };

    fetchStats();
  }, [user, profile]);

  // Update form when profile changes
  React.useEffect(() => {
    if (profile) {
      setEditForm({
        full_name: profile.full_name || '',
        username: profile.username || '',
        bio: profile.bio || '',
        interests: Array.isArray(profile.interests) ? profile.interests : []
      });
    }
  }, [profile]);

  // ✅ Early returns AFTER all hooks
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 flex items-center justify-center">
        <div className="backdrop-blur-md bg-white/30 rounded-3xl border border-white/20 shadow-lg p-8">
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
          <p className="text-gray-600 mt-4">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    return <Navigate to="/" replace />;
  }

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      // Navigation will be handled by the auth state change
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };


  const handleSave = async () => {
    if (!user) return;
    
    setSaving(true);
    try {
      await updateProfile(user.id, {
        ...editForm,
        interests: Array.isArray(editForm.interests) ? editForm.interests : []
      });
      toast({
        title: "Profile updated",
        description: "Your profile has been successfully updated.",
      });
      setIsEditing(false);
      // Refresh the page to get updated data
      window.location.reload();
    } catch (error) {
      console.error('Failed to update profile:', error);
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveBio = async () => {
    if (!user) return;
    
    setSaving(true);
    try {
      await updateProfile(user.id, { 
        bio: editForm.bio,
        interests: Array.isArray(editForm.interests) ? editForm.interests : []
      });
      toast({
        title: "Bio updated",
        description: "Your bio and interests have been updated.",
      });
      setIsEditingBio(false);
      window.location.reload();
    } catch (error) {
      console.error('Failed to update bio:', error);
      toast({
        title: "Error",
        description: "Failed to update bio. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file",
        description: "Please select an image file.",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image smaller than 5MB.",
        variant: "destructive",
      });
      return;
    }

    setUploadingAvatar(true);
    try {
      const avatarUrl = await uploadAvatar(file, user.id);
      if (avatarUrl) {
        await updateProfile(user.id, { avatar_url: avatarUrl });
        toast({
          title: "Avatar updated",
          description: "Your profile picture has been updated.",
        });
        window.location.reload();
      } else {
        throw new Error('Failed to upload avatar');
      }
    } catch (error) {
      console.error('Avatar upload error:', error);
      toast({
        title: "Upload failed",
        description: "Failed to upload avatar. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleCancel = () => {
    setEditForm({
      full_name: profile?.full_name || '',
      username: profile?.username || '',
      bio: profile?.bio || '',
      interests: Array.isArray(profile?.interests) ? profile.interests : []
    });
    setIsEditing(false);
    setIsEditingBio(false);
  };

  const handleAddInterest = () => {
    if (!newInterest.trim()) return;
    
    const currentInterests = Array.isArray(editForm.interests) ? editForm.interests : [];
    if (!currentInterests.includes(newInterest.trim())) {
      const updatedInterests = [...currentInterests, newInterest.trim()];
      setEditForm(prev => ({ ...prev, interests: updatedInterests }));
    }
    setNewInterest('');
  };

  const handleRemoveInterest = (interestToRemove: string) => {
    const currentInterests = Array.isArray(editForm.interests) ? editForm.interests : [];
    const updatedInterests = currentInterests.filter(i => i !== interestToRemove);
    setEditForm(prev => ({ ...prev, interests: updatedInterests }));
  };

  const getInterestsArray = (interests: string[] | string) => {
    if (Array.isArray(interests)) {
      return interests.filter(i => i.length > 0);
    }
    return interests ? interests.split(',').map(i => i.trim()).filter(i => i.length > 0) : [];
  };

  const xpProgress = Math.min((profile.xp % 1000) / 1000 * 100, 100);
  const currentLevel = Math.floor(profile.xp / 1000) + 1;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50">
      {/* Navigation */}
      <nav className="backdrop-blur-md bg-white/20 border-b border-white/20 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <BookOpen className="w-8 h-8 text-blue-500" />
              <span className="text-2xl font-bold text-gray-800">Kupintar</span>
            </div>
            
            <div className="flex items-center space-x-6">
              <a href="/home" className="text-gray-600 hover:text-blue-500 transition-colors">
                Home
              </a>
              <a href="/temanku" className="text-gray-600 hover:text-blue-500 transition-colors">
                Find Friends
              </a>
              
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 text-gray-600 hover:text-red-500 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Profile Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <Card className="backdrop-blur-md bg-white/30 border-white/20 shadow-xl mb-8">
            <CardContent className="p-8">
              <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
                {/* Avatar Section */}
                <div className="relative">
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    className="relative"
                  >
                    <Avatar className="w-32 h-32 border-4 border-white/20 shadow-lg">
                      <AvatarImage 
                        src={profile.avatar_url} 
                        alt={profile.full_name}
                        className="object-cover"
                      />
                      <AvatarFallback className="text-2xl font-bold bg-gradient-to-br from-blue-500 to-cyan-500 text-white">
                        {profile.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      className="hidden"
                      id="avatar-upload"
                      disabled={uploadingAvatar}
                    />
                    <label
                      htmlFor="avatar-upload"
                      className={cn(
                        "absolute -bottom-2 -right-2 w-10 h-10 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer",
                        uploadingAvatar && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      {uploadingAvatar ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <Camera className="w-5 h-5 text-white" />
                      )}
                    </label>
                  </motion.div>
                </div>

                {/* Profile Info */}
                <div className="flex-1 text-center md:text-left">
                  {isEditing ? (
                    <div className="space-y-4">
                      <Input
                        value={editForm.full_name}
                        onChange={(e) => setEditForm(prev => ({ ...prev, full_name: e.target.value }))}
                        className="text-3xl font-bold bg-white/20 backdrop-blur-sm border-white/20"
                        placeholder="Full Name"
                      />
                      <Input
                        value={editForm.username}
                        onChange={(e) => setEditForm(prev => ({ ...prev, username: e.target.value }))}
                        className="bg-white/20 backdrop-blur-sm border-white/20"
                        placeholder="@username"
                      />
                      <div className="flex gap-3">
                        <Button
                          onClick={handleSave}
                          disabled={saving}
                          className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"
                        >
                          <Save className="w-4 h-4 mr-2" />
                          {saving ? 'Saving...' : 'Save'}
                        </Button>
                        <Button
                          onClick={handleCancel}
                          variant="outline"
                          className="bg-white/20 backdrop-blur-sm border-white/20"
                        >
                          <X className="w-4 h-4 mr-2" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-4 mb-2">
                        <h1 className="text-3xl md:text-4xl font-bold text-gray-800">
                          {profile.full_name}
                        </h1>
                        <Button
                          onClick={() => setIsEditing(true)}
                          variant="ghost"
                          size="icon"
                          className="bg-white/20 backdrop-blur-sm border border-white/20 hover:bg-white/30"
                        >
                          <Edit3 className="w-4 h-4" />
                        </Button>
                        
                        {/* Language Toggle */}
                        <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm border border-white/20 rounded-full p-1">
                          <Button
                            onClick={() => setLanguage('ID')}
                            variant="ghost"
                            size="sm"
                            className={cn(
                              "h-8 px-3 rounded-full text-xs",
                              language === 'ID' ? "bg-blue-500 text-white" : "text-gray-600"
                            )}
                          >
                            ID
                          </Button>
                          <Button
                            onClick={() => setLanguage('EN')}
                            variant="ghost"
                            size="sm"
                            className={cn(
                              "h-8 px-3 rounded-full text-xs",
                              language === 'EN' ? "bg-blue-500 text-white" : "text-gray-600"
                            )}
                          >
                            EN
                          </Button>
                        </div>
                      </div>
                      <p className="text-blue-500 font-medium mb-2">@{profile.username}</p>
                      <p className="text-gray-600 mb-4">{profile.email}</p>
                    </>
                  )}
                </div>
              </div>

              {/* XP Progress Bar */}
              <div className="mt-8">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-700 font-medium">Level {currentLevel}</span>
                  <div className="flex items-center gap-4">
                    <span className="text-gray-600 text-sm">{profile.xp} XP</span>
                    {profile.streak > 0 && (
                      <div className="flex items-center gap-1 bg-orange-100/50 px-2 py-1 rounded-full">
                        <Award className="w-4 h-4 text-orange-500" />
                        <span className="text-orange-600 text-sm font-medium">{profile.streak} day streak</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="w-full bg-white/20 rounded-full h-3 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${xpProgress}%` }}
                    transition={{ duration: 1, delay: 0.5 }}
                    className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full"
                  />
                </div>
                <p className="text-gray-500 text-sm mt-1">
                  {1000 - (profile.xp % 1000)} XP to next level
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[
            { 
              icon: Users, 
              label: 'Rooms Created',
              value: stats.roomsCreated,
              color: 'from-blue-500 to-cyan-500',
              description: 'Study rooms you\'ve created'
            },
            { 
              icon: BookOpen, 
              label: 'Rooms Joined',
              value: stats.roomsJoined,
              color: 'from-emerald-500 to-teal-500',
              description: 'Study sessions attended'
            },
            { 
              icon: MessageCircle, 
              label: 'Messages Sent',
              value: stats.messagesSent,
              color: 'from-amber-500 to-orange-500',
              description: 'Total messages in chats'
            },
            { 
              icon: Award, 
              label: 'Study Streak', 
              value: profile.streak, 
              color: 'from-purple-500 to-pink-500',
              description: 'Consecutive study days'
            }
          ].map((stat, index) => (
            <motion.div 
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              whileHover={{ y: -5, scale: 1.02 }}
            >
              <Card className="backdrop-blur-md bg-white/30 border-white/20 shadow-lg hover:shadow-xl transition-all duration-300 group">
                <CardContent className="p-6 text-center">
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${stat.color} flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                    <stat.icon className="w-7 h-7 text-white" />
                  </div>
                  <div className="text-2xl font-bold text-gray-800 mb-1">{stat.value}</div>
                  <p className="text-gray-600 font-medium mb-2">{stat.label}</p>
                  <p className="text-gray-500 text-xs">{stat.description}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Bio & Interests Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
        >
          <Card className="backdrop-blur-md bg-white/30 border-white/20 shadow-lg mb-8">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-3">
                  <Edit3 className="w-6 h-6 text-blue-500" />
                  Bio & Interests
                </CardTitle>
                <Button
                  onClick={() => setIsEditingBio(!isEditingBio)}
                  variant="ghost"
                  size="sm"
                  className="bg-white/20 backdrop-blur-sm border border-white/20 hover:bg-white/30"
                >
                  {isEditingBio ? <X className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isEditingBio ? (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Bio</label>
                    <Textarea
                      value={editForm.bio}
                      onChange={(e) => setEditForm(prev => ({ ...prev, bio: e.target.value }))}
                      className="bg-white/20 backdrop-blur-sm border-white/20 resize-none"
                      placeholder="Tell us about yourself..."
                      rows={4}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Interests</label>
                    <div className="flex gap-2 mb-3">
                      <Input
                        value={newInterest}
                        onChange={(e) => setNewInterest(e.target.value)}
                        className="bg-white/20 backdrop-blur-sm border-white/20"
                        placeholder="Add an interest..."
                        onKeyPress={(e) => e.key === 'Enter' && handleAddInterest()}
                      />
                      <Button
                        onClick={handleAddInterest}
                        variant="outline"
                        size="icon"
                        className="bg-white/20 backdrop-blur-sm border-white/20"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                    
                    <div className="flex flex-wrap gap-2 mb-4">
                      {getInterestsArray(editForm.interests).map((interest, index) => (
                        <Badge
                          key={index}
                          variant="secondary"
                          className="bg-blue-100/50 text-blue-700 hover:bg-blue-200/50 cursor-pointer"
                          onClick={() => handleRemoveInterest(interest)}
                        >
                          {interest}
                          <X className="w-3 h-3 ml-1" />
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex gap-3">
                    <Button
                      onClick={handleSaveBio}
                      disabled={saving}
                      className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {saving ? 'Saving...' : 'Save Changes'}
                    </Button>
                    <Button
                      onClick={handleCancel}
                      variant="outline"
                      className="bg-white/20 backdrop-blur-sm border-white/20"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div>
                    <h3 className="font-medium text-gray-700 mb-2">Bio</h3>
                    <p className="text-gray-600 leading-relaxed">
                      {profile.bio || 'No bio added yet. Click edit to add one!'}
                    </p>
                  </div>
                  
                  <div>
                    <h3 className="font-medium text-gray-700 mb-3">Interests</h3>
                    <div className="flex flex-wrap gap-2">
                      {getInterestsArray(profile.interests || '').length > 0 ? (
                        getInterestsArray(profile.interests || '').map((interest, index) => (
                          <Badge
                            key={index}
                            variant="secondary"
                            className="bg-blue-100/50 text-blue-700"
                          >
                            {interest}
                          </Badge>
                        ))
                      ) : (
                        <p className="text-gray-500 text-sm">No interests added yet. Click edit to add some!</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Activity Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
        >
          <Card className="backdrop-blur-md bg-white/30 border-white/20 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Calendar className="w-6 h-6 text-blue-500" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { action: 'Joined study room', subject: 'Mathematics', time: '2 hours ago', color: 'bg-blue-100 text-blue-600' },
                  { action: 'Completed study session', subject: 'Physics', time: '1 day ago', color: 'bg-emerald-100 text-emerald-600' },
                  { action: 'Created study group', subject: 'Chemistry', time: '3 days ago', color: 'bg-amber-100 text-amber-600' }
                ].map((activity, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: 1.0 + index * 0.1 }}
                    className="flex items-center gap-4 p-4 bg-white/20 backdrop-blur-sm rounded-2xl border border-white/20 hover:bg-white/30 transition-all duration-300"
                  >
                    <div className={`w-3 h-3 rounded-full ${activity.color.split(' ')[0]}`} />
                    <div className="flex-1">
                      <p className="text-gray-800 font-medium">{activity.action}</p>
                      <p className="text-gray-600 text-sm">{activity.subject}</p>
                    </div>
                    <span className="text-gray-500 text-sm">{activity.time}</span>
                  </motion.div>
                ))}
              </div>
              
              <div className="text-center mt-6">
                <Button variant="ghost" className="text-blue-500 hover:text-blue-600">
                  View All Activity
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default ProfilePage;