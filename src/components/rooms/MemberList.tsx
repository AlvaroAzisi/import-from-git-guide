import React, { useState, useEffect } from 'react';
import { supabase } from '../../integrations/supabase/client';
import type { UserProfile } from '../../lib/auth';

interface MemberListProps {
  roomId: string;
}

const MemberList: React.FC<MemberListProps> = ({ roomId }) => {
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMembers = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('room_members')
        .select('profiles(*)')
        .eq('room_id', roomId);

      if (error) {
        console.error('Error fetching members:', error);
      } else {
        const profiles = data.map(member => member.profiles).filter(Boolean) as UserProfile[];
        setMembers(profiles);
      }
      setLoading(false);
    };

    if (roomId) {
      fetchMembers();
    }
  }, [roomId]);

  if (loading) {
    return <div>Loading members...</div>;
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h3 className="text-xl font-bold mb-4">Members ({members.length})</h3>
      <ul>
        {members.map(member => (
          <li key={member.id} className="flex items-center space-x-4 mb-2">
            <img
              className="w-10 h-10 rounded-full object-cover"
              src={member.avatar_url || `https://i.pravatar.cc/150?u=${member.id}`}
              alt={member.username}
            />
            <span>{member.username}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default MemberList;
