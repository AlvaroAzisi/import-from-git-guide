import { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Search, Users, UserPlus } from 'lucide-react';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { UserCard } from '../components/friends/UserCard';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../hooks/useToast';
import {
  sendFriendRequest,
  getFriends,
  fetchRecommendedFriends,
  getFriendshipStatus,
  searchUsers,
  type Friend,
  type RecommendedUser,
} from '../lib/friendHelpers';
import { supabase } from '../integrations/supabase/client';

type TabType = 'discover' | 'friends';

export default function TemanKuPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<TabType>('discover');
  const [searchQuery, setSearchQuery] = useState('');
  const [recommendations, setRecommendations] = useState<RecommendedUser[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [searchResults, setSearchResults] = useState<RecommendedUser[]>([]);
  const [friendshipStatuses, setFriendshipStatuses] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;

    loadData();

    // Subscribe to friend changes
    const friendsChannel = supabase
      .channel('friends-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friends',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          loadFriends();
        }
      )
      .subscribe();

    // Subscribe to friend request changes
    const requestsChannel = supabase
      .channel('friend-requests-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friend_requests',
          filter: `sender_id=eq.${user.id}`,
        },
        () => {
          loadRecommendations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(friendsChannel);
      supabase.removeChannel(requestsChannel);
    };
  }, [user?.id]);

  useEffect(() => {
    const delaySearch = setTimeout(() => {
      if (searchQuery.trim()) {
        handleSearch();
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(delaySearch);
  }, [searchQuery]);

  const loadData = async () => {
    setLoading(true);
    await Promise.all([loadRecommendations(), loadFriends()]);
    setLoading(false);
  };

  const loadRecommendations = async () => {
    if (!user?.id) return;

    const data = await fetchRecommendedFriends(user.id);
    setRecommendations(data);

    // Load friendship statuses
    const statuses: Record<string, string> = {};
    for (const rec of data) {
      const status = await getFriendshipStatus(user.id, rec.id);
      statuses[rec.id] = status;
    }
    setFriendshipStatuses(statuses);
  };

  const loadFriends = async () => {
    if (!user?.id) return;

    const data = await getFriends(user.id);
    setFriends(data);
  };

  const handleSearch = async () => {
    if (!user?.id || !searchQuery.trim()) return;

    const results = await searchUsers(searchQuery, user.id);
    setSearchResults(results);

    // Load friendship statuses for search results
    const statuses: Record<string, string> = {};
    for (const result of results) {
      const status = await getFriendshipStatus(user.id, result.id);
      statuses[result.id] = status;
    }
    setFriendshipStatuses((prev) => ({ ...prev, ...statuses }));
  };

  const handleAddFriend = async (friendId: string) => {
    if (!user?.id) return;

    const { error } = await sendFriendRequest(user.id, friendId);

    if (error) {
      toast({
        title: 'Error',
        description: (error as any).message || 'Failed to send friend request',
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Friend request sent 🚀',
      description: "They'll see it in their notifications!",
    });

    // Update status locally
    setFriendshipStatuses((prev) => ({
      ...prev,
      [friendId]: 'pending_sent',
    }));
  };

  const displayUsers =
    activeTab === 'discover'
      ? searchQuery.trim()
        ? searchResults
        : recommendations
      : friends.map((f) => f.friend!);

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground mb-2">TemanKu</h1>
        <p className="text-muted-foreground">Let's learn together! 🎓</p>
      </div>

      {/* Search bar */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search by username or interests..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <Button
          variant={activeTab === 'discover' ? 'default' : 'outline'}
          onClick={() => setActiveTab('discover')}
          className="gap-2"
        >
          <UserPlus className="w-4 h-4" />
          Find Friends
        </Button>
        <Button
          variant={activeTab === 'friends' ? 'default' : 'outline'}
          onClick={() => setActiveTab('friends')}
          className="gap-2"
        >
          <Users className="w-4 h-4" />
          My Friends ({friends.length})
        </Button>
        <Button
          variant="outline"
          onClick={() => navigate('/temanku/requests')}
          className="ml-auto"
        >
          Requests
        </Button>
      </div>

      {/* User grid */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : displayUsers.length === 0 ? (
        <Card className="p-12 text-center bg-card/50 backdrop-blur-sm border-border/50">
          <div className="max-w-sm mx-auto">
            {activeTab === 'discover' ? (
              <>
                <UserPlus className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {searchQuery.trim()
                    ? 'No users found'
                    : 'No recommendations yet'}
                </h3>
                <p className="text-muted-foreground">
                  {searchQuery.trim()
                    ? 'Try a different search term'
                    : 'Explore more rooms to find study partners!'}
                </p>
              </>
            ) : (
              <>
                <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  No friends yet
                </h3>
                <p className="text-muted-foreground mb-4">
                  Start building your study network!
                </p>
                <Button onClick={() => setActiveTab('discover')}>Find Friends</Button>
              </>
            )}
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AnimatePresence mode="popLayout">
            {displayUsers.map((user) => (
              <UserCard
                key={user.id}
                profile={user}
                relationshipStatus={
                  activeTab === 'friends'
                    ? 'friends'
                    : (friendshipStatuses[user.id] as any) || 'none'
                }
                onAdd={handleAddFriend}
                showMessageButton={activeTab === 'friends'}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
