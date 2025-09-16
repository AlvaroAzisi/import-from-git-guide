import React from 'react';
import { Bell } from 'lucide-react';
import { Button } from './ui/button';

// TODO: Disabled – depends on old schema (friend_requests, conversations)
export const NotificationBell: React.FC = () => {
  return (
    <div className="relative">
      <Button variant="ghost" size="sm" disabled className="p-2">
        <Bell className="w-5 h-5" />
      </Button>
    </div>
  );
};
