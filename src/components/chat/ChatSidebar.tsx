import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import type { ActiveChat } from '../../pages/ChatPage';

interface ChatSidebarProps {
  activeChat: ActiveChat | null;
  onSelectChat: (chat: ActiveChat) => void;
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({
  activeChat,
  onSelectChat,
}) => {
  const [friends, setFriends] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  // fetch current user once
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id);
    });
  }, []);

  useEffect(() => {
    if (!userId) return;
    async function fetchData() {
      const [{ data: f }, { data: g }] = await Promise.all([
        supabase
          .from('friends')
          .select('id, status, friend:profiles!friends_friend_id_fkey(id, username)')
          .eq('user_id', userId)
          .eq('status', 'accepted'),
        supabase
          .from('room_members')
          .select('room_id, rooms(name)')
          .eq('user_id', userId),
      ]);
      setFriends(f ?? []);
      setGroups(g ?? []);
    }
    fetchData();
  }, [userId]);

  return (
    <div className="space-y-4">
      <h3 className="text-sm text-gray-500 uppercase">Friends</h3>
      {friends.map((f) => (
        <button
          key={f.id}
          className={`block px-3 py-2 rounded-md w-full text-left hover:bg-gray-100 dark:hover:bg-gray-800 ${
            activeChat?.id === f.friend.id && activeChat?.type === 'friend'
              ? 'bg-gray-100 dark:bg-gray-800'
              : ''
          }`}
          onClick={() =>
            onSelectChat({
              id: f.friend.id,
              type: 'friend',
              name: f.friend.username,
            })
          }
        >
          @{f.friend.username}
        </button>
      ))}

      <h3 className="text-sm text-gray-500 uppercase mt-6">Groups</h3>
      {groups.map((g) => (
        <button
          key={g.room_id}
          className={`block px-3 py-2 rounded-md w-full text-left hover:bg-gray-100 dark:hover:bg-gray-800 ${
            activeChat?.id === g.room_id && activeChat?.type === 'group'
              ? 'bg-gray-100 dark:bg-gray-800'
              : ''
          }`}
          onClick={() =>
            onSelectChat({
              id: g.room_id,
              type: 'group',
              name: g.rooms.name,
            })
          }
        >
          #{g.rooms.name}
        </button>
      ))}
    </div>
  );
};
