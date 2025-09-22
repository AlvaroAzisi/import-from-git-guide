import React from 'react';
import AvatarUpload from './AvatarUpload';

interface UserProfileProps {
  onEdit: () => void;
}

const UserProfile: React.FC<UserProfileProps> = ({ onEdit }) => {
  const user = {
    username: 'testuser',
    email: 'testuser@example.com',
    bio: 'This is a test bio.',
    avatar_url: 'https://i.pravatar.cc/150?u=a042581f4e29026704d'
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="flex items-center space-x-4">
        <AvatarUpload avatarUrl={user.avatar_url} />
        <div>
          <h2 className="text-xl font-bold">{user.username}</h2>
          <p className="text-gray-500">{user.email}</p>
        </div>
      </div>
      <div className="mt-4">
        <h3 className="font-bold">Bio</h3>
        <p>{user.bio}</p>
      </div>
      <button
        onClick={onEdit}
        className="mt-4 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
      >
        Edit Profile
      </button>
    </div>
  );
};

export default UserProfile;
