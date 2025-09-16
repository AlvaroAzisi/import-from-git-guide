import React from 'react';
import { RoomSettingsModal } from './RoomSettingsModal';

interface GroupSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
  groupName: string;
  groupDescription?: string;
  userRole?: 'admin' | 'member';
  onGroupUpdate?: (group: any) => void;
  onGroupDelete?: () => void;
}

/**
 * GroupSettingsModal - Thin wrapper for RoomSettingsModal for group chats
 *
 * Manual test steps:
 * 1. Open from group chat header
 * 2. Should behave identically to RoomSettingsModal
 * 3. Admin actions should work for group admins
 */
export const GroupSettingsModal: React.FC<GroupSettingsModalProps> = ({
  isOpen,
  onClose,
  groupId,
  groupName,
  groupDescription,
  userRole,
  onGroupUpdate,
  onGroupDelete,
}) => {
  // Convert group data to room format for reusability
  const roomData = {
    id: groupId,
    name: groupName,
    description: groupDescription,
    subject: 'Group Chat',
    short_code: '', // Groups don't have codes
    created_by: '', // Will be checked via userRole prop
    max_members: 50, // Default for groups
    is_public: false,
  };

  const handleGroupUpdate = (updatedRoom: any) => {
    // Convert back to group format
    const updatedGroup = {
      id: updatedRoom.id,
      name: updatedRoom.name,
      description: updatedRoom.description,
    };
    onGroupUpdate?.(updatedGroup);
  };

  return (
    <RoomSettingsModal
      isOpen={isOpen}
      onClose={onClose}
      room={roomData}
      userRole={userRole}
      onRoomUpdate={handleGroupUpdate}
      onRoomDelete={onGroupDelete}
    />
  );
};
