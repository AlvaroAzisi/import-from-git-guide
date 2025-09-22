import React from 'react';
import UserProfile from '../../components/profile/UserProfile';
import EditProfile from '../../components/profile/EditProfile';

const ProfilePage: React.FC = () => {
  const [isEditing, setIsEditing] = React.useState(false);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">User Profile</h1>
      {isEditing ? (
        <EditProfile onCancel={() => setIsEditing(false)} />
      ) : (
        <UserProfile onEdit={() => setIsEditing(true)} />
      )}
    </div>
  );
};

export default ProfilePage;
