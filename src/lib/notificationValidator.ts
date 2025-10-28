/**
 * Notification payload validation
 * Ensures notification data conforms to expected schema and prevents injection
 */

import { z } from 'zod';

// Define schemas for each notification type's data payload
const friendRequestDataSchema = z.object({
  friendship_id: z.string().uuid(),
  from_user_id: z.string().uuid().optional(),
  message: z.string().max(500).optional(),
});

const messageDataSchema = z.object({
  conversation_id: z.string().uuid(),
  sender_id: z.string().uuid().optional(),
});

const roomInviteDataSchema = z.object({
  room_id: z.string().uuid(),
  inviter_id: z.string().uuid().optional(),
});

const systemDataSchema = z.object({
  request_id: z.string().uuid().optional(),
  accepted_by: z.string().uuid().optional(),
  declined_by: z.string().uuid().optional(),
});

// Union type for all notification data
export type NotificationData =
  | z.infer<typeof friendRequestDataSchema>
  | z.infer<typeof messageDataSchema>
  | z.infer<typeof roomInviteDataSchema>
  | z.infer<typeof systemDataSchema>;

export interface ValidatedNotification {
  id: string;
  user_id: string;
  type: 'friend_request' | 'message' | 'room_invite' | 'system';
  title: string;
  content: string | null;
  data: NotificationData | null;
  is_read: boolean | null;
  created_at: string | null;
}

/**
 * Validate notification data based on type
 * Returns validated data or null if invalid
 */
export const validateNotificationData = (
  type: string,
  data: any
): NotificationData | null => {
  if (!data) return null;

  try {
    switch (type) {
      case 'friend_request':
        return friendRequestDataSchema.parse(data);
      case 'message':
        return messageDataSchema.parse(data);
      case 'room_invite':
        return roomInviteDataSchema.parse(data);
      case 'system':
        return systemDataSchema.parse(data);
      default:
        return null;
    }
  } catch (error) {
    // Invalid data structure - return null
    return null;
  }
};

/**
 * Validate complete notification object
 */
export const validateNotification = (notification: any): ValidatedNotification | null => {
  // Basic validation
  if (!notification || typeof notification !== 'object') {
    return null;
  }

  const { id, user_id, type, title, content, data, is_read, created_at } = notification;

  // Required fields
  if (!id || !user_id || !type || !title) {
    return null;
  }

  // Validate type
  const validTypes = ['friend_request', 'message', 'room_invite', 'system'];
  if (!validTypes.includes(type)) {
    return null;
  }

  // Validate data payload
  const validatedData = validateNotificationData(type, data);

  return {
    id,
    user_id,
    type,
    title: String(title).slice(0, 200), // Enforce max length
    content: content ? String(content).slice(0, 500) : null,
    data: validatedData,
    is_read,
    created_at,
  };
};
