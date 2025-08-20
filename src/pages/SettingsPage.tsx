import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Settings,
  User,
  Bell,
  Palette,
  Shield,
  Download,
  Moon,
  Sun,
  Volume2,
  VolumeX,
  Eye,
  EyeOff,
  Save,
  RotateCcw,
  Lock,
  Mail,
  Globe
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { useToast } from '../hooks/useToast';
import { updateProfile } from '../lib/auth';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';

const SettingsPage: React.FC = () => {
  const { user, profile, refreshProfile } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();
  
  // Remove unused state variable
  const [activeTab, setActiveTab] = useState('account');
  const [saving, setSaving] = useState(false);
  
  // Settings state
  const [settings, setSettings] = useState({
    notifications: {
      messages: true,
      friendRequests: true,
      roomInvites: true,
      emailNotifications: false,
    },
    appearance: {
      darkMode: theme === 'dark',
      animations: true,
      soundEffects: true,
    },
    privacy: {
      publicProfile: true,
      showOnlineStatus: true,
      allowFriendRequests: true,
    },
    account: {
      email: profile?.email || '',
      username: profile?.username || '',
    }
  });

  useEffect(() => {
    if (profile) {
      setSettings(prev => ({
        ...prev,
        account: {
          email: profile.email || '',
          username: profile.username || '',
        }
      }));
    }
  }, [profile]);

  const settingsTabs = [
    { id: 'account', label: 'Account', icon: User },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'privacy', label: 'Privacy', icon: Shield },
  ];

  const handleSettingChange = (category: string, key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category as keyof typeof prev],
        [key]: value
      }
    }));
    
    // Handle theme change immediately
    if (category === 'appearance' && key === 'darkMode') {
      if (value !== (theme === 'dark')) {
        toggleTheme();
      }
    }
  };

  const handleSave = async () => {
    if (!user) return;
    
    setSaving(true);
    try {
      // Save account settings
      if (settings.account.username !== profile?.username) {
        await updateProfile(user.id, {
          username: settings.account.username,
        });
        await refreshProfile();
      }
      
      // Here you could save other settings to a settings table
      // For now, we'll just show success
      
      toast({
        title: 'Settings saved',
        description: 'Your settings have been updated successfully.',
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to save settings.',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (profile) {
      setSettings(prev => ({
        ...prev,
        account: {
          email: profile.email || '',
          username: profile.username || '',
        },
        notifications: {
          messages: true,
          friendRequests: true,
          roomInvites: true,
          emailNotifications: false,
        },
        appearance: {
          darkMode: false,
          animations: true,
          soundEffects: true,
        },
        privacy: {
          publicProfile: true,
          showOnlineStatus: true,
          allowFriendRequests: true,
        }
      }));
    }
  };

  const exportData = () => {
    // Mock data export
    const data = {
      profile: profile,
      settings: settings,
      exportDate: new Date().toISOString(),
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json'
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'kupintar-data-export.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: 'Data exported',
      description: 'Your data has been downloaded.',
    });
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'account':
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    type="email"
                    value={settings.account.email}
                    className="pl-10"
                    disabled
                  />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Email cannot be changed here. Contact support if needed.
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Username
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    type="text"
                    value={settings.account.username}
                    onChange={(e) => handleSettingChange('account', 'username', e.target.value)}
                    className="pl-10"
                    placeholder="Enter username"
                  />
                </div>
              </div>
            </div>
            
            <div className="border-t border-white/10 dark:border-gray-700/10 pt-6">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
                Security
              </h3>
              <div className="space-y-3">
                <Button variant="outline" className="w-full justify-start">
                  <Lock className="w-4 h-4 mr-2" />
                  Change Password
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Shield className="w-4 h-4 mr-2" />
                  Two-Factor Authentication
                </Button>
              </div>
            </div>
          </motion.div>
        );
        
      case 'notifications':
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {Object.entries(settings.notifications).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between p-4 bg-white/20 dark:bg-gray-800/20 rounded-2xl">
                <div className="flex items-center gap-3">
                  <Bell className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  <div>
                    <h4 className="font-medium text-gray-800 dark:text-gray-200 capitalize">
                      {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {key === 'messages' && 'Get notified when you receive new messages'}
                      {key === 'friendRequests' && 'Get notified when someone sends you a friend request'}
                      {key === 'roomInvites' && 'Get notified when you\'re invited to a room'}
                      {key === 'emailNotifications' && 'Receive notifications via email'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleSettingChange('notifications', key, !value)}
                  className={`relative w-12 h-6 rounded-full transition-all duration-300 ${
                    value ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <motion.div
                    animate={{ x: value ? 24 : 2 }}
                    transition={{ duration: 0.2 }}
                    className="absolute top-1 w-4 h-4 bg-white rounded-full"
                  />
                </button>
              </div>
            ))}
          </motion.div>
        );
        
      case 'appearance':
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {Object.entries(settings.appearance).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between p-4 bg-white/20 dark:bg-gray-800/20 rounded-2xl">
                <div className="flex items-center gap-3">
                  {key === 'darkMode' && (value ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />)}
                  {key === 'animations' && <Palette className="w-5 h-5" />}
                  {key === 'soundEffects' && (value ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />)}
                  <div>
                    <h4 className="font-medium text-gray-800 dark:text-gray-200 capitalize">
                      {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {key === 'darkMode' && 'Switch between light and dark themes'}
                      {key === 'animations' && 'Enable smooth animations throughout the app'}
                      {key === 'soundEffects' && 'Play sound effects for interactions'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleSettingChange('appearance', key, !value)}
                  className={`relative w-12 h-6 rounded-full transition-all duration-300 ${
                    value ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <motion.div
                    animate={{ x: value ? 24 : 2 }}
                    transition={{ duration: 0.2 }}
                    className="absolute top-1 w-4 h-4 bg-white rounded-full"
                  />
                </button>
              </div>
            ))}
          </motion.div>
        );
        
      case 'privacy':
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {Object.entries(settings.privacy).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between p-4 bg-white/20 dark:bg-gray-800/20 rounded-2xl">
                <div className="flex items-center gap-3">
                  {key === 'publicProfile' && (value ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />)}
                  {key === 'showOnlineStatus' && <Globe className="w-5 h-5" />}
                  {key === 'allowFriendRequests' && <User className="w-5 h-5" />}
                  <div>
                    <h4 className="font-medium text-gray-800 dark:text-gray-200 capitalize">
                      {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {key === 'publicProfile' && 'Allow others to view your profile'}
                      {key === 'showOnlineStatus' && 'Show when you\'re online to others'}
                      {key === 'allowFriendRequests' && 'Allow others to send you friend requests'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleSettingChange('privacy', key, !value)}
                  className={`relative w-12 h-6 rounded-full transition-all duration-300 ${
                    value ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <motion.div
                    animate={{ x: value ? 24 : 2 }}
                    transition={{ duration: 0.2 }}
                    className="absolute top-1 w-4 h-4 bg-white rounded-full"
                  />
                </button>
              </div>
            ))}
            
            <div className="border-t border-white/10 dark:border-gray-700/10 pt-6">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
                Data Management
              </h3>
              <Button
                onClick={exportData}
                variant="outline"
                className="w-full justify-start"
              >
                <Download className="w-4 h-4 mr-2" />
                Export My Data
              </Button>
            </div>
          </motion.div>
        );
        
      default:
        return null;
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-8"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <Settings className="w-8 h-8 text-blue-500" />
            <h1 className="text-4xl font-bold text-gray-800 dark:text-gray-200">
              Settings
            </h1>
          </div>
          <p className="text-xl text-gray-600 dark:text-gray-400">
            Customize your Kupintar experience
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-4 gap-8">
          {/* Settings Navigation */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="lg:col-span-1"
          >
            <Card className="backdrop-blur-md bg-white/30 dark:bg-gray-900/30 border-white/20 dark:border-gray-700/20 shadow-lg">
              <CardContent className="p-0">
                <div className="space-y-2 p-4">
                  {settingsTabs.map((tab) => (
                    <motion.button
                      key={tab.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-medium transition-all duration-300 ${
                        activeTab === tab.id
                          ? 'bg-blue-500 text-white shadow-lg'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-white/20 dark:hover:bg-gray-800/20'
                      }`}
                    >
                      <tab.icon className="w-5 h-5" />
                      {tab.label}
                    </motion.button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Settings Content */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="lg:col-span-3"
          >
            <Card className="backdrop-blur-md bg-white/30 dark:bg-gray-900/30 border-white/20 dark:border-gray-700/20 shadow-lg">
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-gray-800 dark:text-gray-200 capitalize">
                  {activeTab} Settings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <AnimatePresence mode="wait">
                  {renderTabContent()}
                </AnimatePresence>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Sticky Save Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="fixed bottom-6 right-6 backdrop-blur-md bg-white/30 dark:bg-gray-900/30 rounded-2xl border border-white/20 dark:border-gray-700/20 shadow-lg p-4"
        >
          <div className="flex items-center gap-3">
            <Button
              onClick={handleReset}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              size="sm"
              className="flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </motion.div>
      </div>
  );
};

export default SettingsPage;