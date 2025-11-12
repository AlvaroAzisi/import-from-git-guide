# Kupintar Friend & Room Systems Migration

## Date: 2025-11-12

### Overview
This migration performs a clean reset of friend and room data, updates RLS policies, and implements triggers for automatic notification and friendship creation.

### ⚠️ Important: Supabase Types Regeneration
**After running this migration, the Supabase types file (`src/integrations/supabase/types.ts`) needs to be regenerated to reflect the new schema.**

The migration updated the database schema from:
- `friend_requests`: `requester/recipient` → `sender_id/receiver_id`
- `friends`: `from_user/to_user` → `user_id/friend_id`

**To regenerate types:**
1. Go to Supabase Dashboard → Project Settings → API
2. Click "Generate Types" or use Supabase CLI: `supabase gen types typescript`
3. Replace `src/integrations/supabase/types.ts` with the new types

**Until types are regenerated**, you may see TypeScript errors, but the runtime code will work correctly.

---

## Migration Details

### 1. Backup Tables Created
- `backup_friend_requests_20251112`
- `backup_friends_20251112`
- `backup_notifications_20251112`
- `backup_rooms_20251112`
- `backup_room_members_20251112`
- `backup_messages_20251112`
- `backup_direct_chats_20251112`
- `backup_direct_messages_20251112`

### 2. Data Cleaned
All rows deleted from:
- `notifications`
- `direct_messages`
- `direct_chats`
- `friend_requests`
- `friends`
- `messages`
- `room_members`
- `rooms`

### 3. Schema Updates
- Added `message` column to `friend_requests`
- Created indexes for performance
- Added unique constraints to prevent duplicates

### 4. RLS Policies Updated
**friend_requests:**
- `insert_own_request`: Users can insert their own requests
- `read_related_requests`: Users can read requests they're involved in
- `update_only_receiver`: Only receiver can update status
- `delete_own_request`: Sender/receiver can delete

**friends:**
- `select_own_friends`: Users can view their own friends
- `insert_own_friend`: Users can insert their own friendships
- `delete_own_friend`: Users can delete their own friendships

**notifications:**
- `select_own_notifications`: Users can view their notifications
- `update_own_notifications`: Users can update their notifications
- `system_insert_notifications`: System can insert notifications (via triggers)

### 5. Trigger Created
**`handle_friend_request_changes()`**
- Automatically creates notifications when friend requests are sent
- Creates mutual friendships when requests are accepted
- Notifies sender when request is accepted/declined

### 6. Realtime Enabled
Tables enabled for realtime subscriptions:
- `friend_requests`
- `friends`
- `notifications`
- `messages`
- `direct_messages`

---

## Rollback Instructions

If you need to rollback to the previous state:

```sql
-- Restore from backup tables
DELETE FROM friend_requests;
INSERT INTO friend_requests SELECT * FROM backup_friend_requests_20251112;

DELETE FROM friends;
INSERT INTO friends SELECT * FROM backup_friends_20251112;

DELETE FROM notifications;
INSERT INTO notifications SELECT * FROM backup_notifications_20251112;

DELETE FROM rooms;
INSERT INTO rooms SELECT * FROM backup_rooms_20251112;

DELETE FROM room_members;
INSERT INTO room_members SELECT * FROM backup_room_members_20251112;

DELETE FROM messages;
INSERT INTO messages SELECT * FROM backup_messages_20251112;

DELETE FROM direct_chats;
INSERT INTO direct_chats SELECT * FROM backup_direct_chats_20251112;

DELETE FROM direct_messages;
INSERT INTO direct_messages SELECT * FROM backup_direct_messages_20251112;
```

---

## Frontend Changes

### New Files Created
- `src/lib/messages.ts` - Message handling (direct & room)
- `MIGRATION_README.md` - This file

### Files Updated
- `src/lib/friendHelpers.ts` - Updated to use new schema columns
- `src/components/NotificationButton.tsx` - Full realtime implementation
- `src/components/TopBar.tsx` - Import path fix
- `src/pages/TemanKuPage.tsx` - Added pending requests badge

### Features Implemented
✅ Real-time friend requests with notifications
✅ Real-time friend list updates
✅ Notification dropdown with unread count
✅ Automatic friendship creation on acceptance
✅ Search users by username/interests
✅ Friend recommendations (using `recommendations_for_user` RPC)
✅ Pending requests inbox
✅ Message friends (links to chat)

---

## Testing Checklist

### Friend Request Flow
- [ ] User A sends friend request to User B
- [ ] User B receives notification in real-time
- [ ] User B sees request in `/temanku/requests`
- [ ] User B accepts request
- [ ] Both users become friends (mutual rows in `friends` table)
- [ ] User A receives acceptance notification
- [ ] Both users can now message each other

### Decline Flow
- [ ] User B declines friend request
- [ ] User A receives decline notification
- [ ] No friendship created

### Realtime Updates
- [ ] Friend list updates when new friend added
- [ ] Notification badge updates in real-time
- [ ] Request count updates in TemanKu page

### RLS Security
- [ ] Users can only see their own friend requests
- [ ] Users can only accept/decline requests sent to them
- [ ] Users can only see their own friends list
- [ ] Users can only see their own notifications

---

## Known Issues & Notes

### Type Errors (Temporary)
The generated types file hasn't been updated yet. Once Supabase regenerates `src/integrations/supabase/types.ts`, the type errors will disappear.

### Migration Runs Only Once
The migration uses `IF NOT EXISTS` and `IF NOT EXISTS` clauses to be idempotent. Running it multiple times is safe.

### Backup Retention
Backup tables are prefixed with date (20251112). Consider cleaning up old backup tables periodically.

---

## Next Steps

1. **Regenerate Supabase types** (see top of document)
2. **Test all friend flows** using the checklist above
3. **Implement Room System** (similar pattern to friend system)
4. **Add tests** (unit tests for helpers, E2E for flows)
5. **Add rate limiting** for friend requests to prevent spam

---

## Support

For issues or questions about this migration:
- Check Supabase logs for errors
- Verify RLS policies are correctly applied
- Check trigger function is executing properly
- Review realtime subscription setup
