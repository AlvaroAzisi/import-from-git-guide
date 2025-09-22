import React from 'react';
import FriendList from '../../components/friends/FriendList';
import FriendRequestList from '../../components/friends/FriendRequestList';
import CreateGroupForm from '../../components/friends/CreateGroupForm';

const FriendsPage: React.FC = () => {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Friends & Groups</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2">
          <FriendList />
          <FriendRequestList />
        </div>
        <div>
          <CreateGroupForm />
        </div>
      </div>
    </div>
  );
};

export default FriendsPage;
