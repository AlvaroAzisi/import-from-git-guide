import React from 'react';

interface MemberListProps {
  roomId: string;
}

const MemberList: React.FC<MemberListProps> = ({ roomId }) => {
  const members = [
    { id: '1', username: 'testuser1' },
    { id: '2', username: 'testuser2' },
    { id: '3', username: 'testuser3' },
  ];

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h3 className="text-xl font-bold mb-4">Members ({members.length})</h3>
      <ul>
        {members.map(member => (
          <li key={member.id} className="flex items-center space-x-4 mb-2">
            <img
              className="w-10 h-10 rounded-full object-cover"
              src={`https://i.pravatar.cc/150?u=${member.id}`}
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
