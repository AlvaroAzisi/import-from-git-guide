# Real-Time Messaging System Documentation

## Overview
Complete friend-based messaging system with real-time updates, notification center, and modern chat UI.

## Features Implemented

### 1. Friend-Based Access Control ✅
- **Database Function**: `are_friends(user1_id, user2_id)` - Checks if two users have accepted friendship
- **Conversation Creation**: `get_or_create_dm_conversation(other_user_id)` - Creates or retrieves DM conversation (friends only)
- **RLS Policies**: Updated to enforce friendship requirement for messaging

### 2. Real-Time Messaging ✅
- **Components**:
  - `DirectMessageWindow` - Main chat interface with message bubbles
  - Modern chat bubble UI with sender/receiver distinction
  - Real-time message subscription via Supabase Realtime
  - Auto-scroll to latest messages

- **Features**:
  - Press Enter to send (Shift+Enter for new line)
  - Optimistic UI updates
  - Message timestamps
  - Avatar display
  - Loading and error states

### 3. Notification Center ✅
- **Component**: `NotificationCenter` - Dropdown panel in TopBar
- **Hook**: `useNotifications` - Manages notification state and realtime updates
- **Features**:
  - Unread count badge
  - Real-time notification updates
  - Click to navigate (friend requests → /temanku, messages → /chat)
  - Mark as read / Mark all as read
  - Notification types: friend_request, message, room_invite, system

### 4. Database Schema
```sql
-- Existing tables used:
- conversations (type, created_by, created_at, updated_at)
- conversation_members (conversation_id, user_id, role)
- messages (conversation_id, sender_id, content, created_at)
- notifications (user_id, type, title, content, data, is_read)
- friends (from_user, to_user, status)

-- New functions:
- are_friends(user1_id, user2_id) → boolean
- get_or_create_dm_conversation(other_user_id) → uuid

-- Realtime enabled for:
- messages
- notifications  
- friends
```

## Usage Examples

### Open a Chat with a Friend
```tsx
import { DirectMessageWindow } from '@/components/chat/DirectMessageWindow';

<DirectMessageWindow
  otherUserId="user-uuid"
  otherUser={{
    id: "user-uuid",
    username: "johndoe",
    full_name: "John Doe",
    avatar_url: "https://..."
  }}
/>
```

### Check if Users are Friends
```tsx
import { checkFriendship } from '@/lib/messaging';

const areFriends = await checkFriendship(userId1, userId2);
```

### Send a Message
```tsx
import { sendMessage } from '@/lib/messaging';

const message = await sendMessage(conversationId, "Hello!");
```

### Subscribe to Messages
```tsx
import { subscribeToMessages } from '@/lib/messaging';

const unsubscribe = subscribeToMessages(conversationId, (newMessage) => {
  console.log('New message:', newMessage);
});

// Clean up
unsubscribe();
```

## Security

### RLS Policies
1. **Messages**:
   - SELECT: Can only view messages in conversations where user is a member
   - INSERT: Can only send messages to conversations where user is a member

2. **Notifications**:
   - SELECT: Users can only view their own notifications
   - UPDATE: Users can only update their own notifications

3. **Friendship Verification**:
   - All messaging operations verify friendship status via `are_friends()` function
   - Conversation creation blocked if users are not friends

## UI/UX Features

### Chat Bubbles
- **Sent messages**: Primary gradient background, right-aligned
- **Received messages**: Glassmorphism card with border, left-aligned
- **Timestamps**: Display time in 12-hour format
- **Avatars**: User avatar for received messages
- **Multi-line support**: Shift+Enter for new lines

### Notification Center
- **Bell icon**: Shows in TopBar with unread badge
- **Dropdown panel**: 
  - Width: 320px mobile, 384px desktop
  - Max height: 600px with scroll
  - Glassmorphism design
- **Notification items**:
  - Icon based on type
  - Title and content
  - Timestamp
  - Blue dot for unread
  - Click to navigate

### Empty States
- **Not Friends**: Shows friendly message with "Send Friend Request" button
- **No Messages**: Clean chat window ready for first message
- **No Notifications**: Bell icon with "No notifications yet" text

## Integration Points

### TopBar
```tsx
import { NotificationCenter } from './NotificationCenter';

// In TopBar component
<NotificationCenter />
```

### Pages
Create a chat page to display DirectMessageWindow:
```tsx
// src/pages/ChatPage.tsx
import { DirectMessageWindow } from '@/components/chat/DirectMessageWindow';

export default function ChatPage() {
  // Get other user from route params or props
  return <DirectMessageWindow otherUserId={...} otherUser={...} />;
}
```

## Performance Optimizations

1. **Message Pagination**: Currently loads last 50 messages (configurable)
2. **Realtime Subscriptions**: Auto-cleanup on component unmount
3. **Optimistic Updates**: Messages appear instantly before server confirmation
4. **Duplicate Prevention**: Checks for existing messages before adding via realtime

## Future Enhancements

- [ ] Message editing/deletion
- [ ] File attachments
- [ ] Read receipts
- [ ] Typing indicators
- [ ] Message search
- [ ] Conversation list with unread counts
- [ ] Group chats (already supported in schema)
- [ ] Message reactions
- [ ] Voice/video calls integration

## Troubleshooting

### Messages not appearing in real-time
- Check Supabase Realtime is enabled for `messages` table
- Verify RLS policies allow SELECT on messages
- Check browser console for subscription errors

### "Must be friends" error
- Verify friendship status in `friends` table
- Check `status` column is 'accepted'
- Ensure both directions exist (from_user/to_user)

### Notifications not showing
- Verify Realtime enabled for `notifications` table
- Check user_id matches current user
- Ensure RLS policies allow SELECT

## Links
- [Supabase Realtime Docs](https://supabase.com/docs/guides/realtime)
- [RLS Policy Guide](https://supabase.com/docs/guides/auth/row-level-security)
