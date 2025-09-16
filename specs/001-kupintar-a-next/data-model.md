# Data Model: Kupintar Platform

## Entities & Fields

### users
- id (uuid, PK)
- email (string, unique)
- created_at (timestamp)
- is_verified (boolean)

### profiles
- user_id (uuid, PK, FK to users)
- name (string)
- avatar_url (string)
- xp (integer)
- streak (integer)
- badges (array of badge_id)
- subscription_status (enum: free, pro)
- last_login (timestamp)

### rooms
- id (uuid, PK)
- title (string)
- description (string)
- tags (array of string)
- creator_id (uuid, FK to users)
- access_type (enum: public, private)
- created_at (timestamp)

### room_members
- room_id (uuid, PK, FK to rooms)
- user_id (uuid, PK, FK to users)
- role (enum: member, admin)
- joined_at (timestamp)

### messages
- id (uuid, PK)
- room_id (uuid, FK to rooms, nullable for DMs)
- sender_id (uuid, FK to users)
- content (string)
- sent_at (timestamp)
- deleted (boolean)

### friends
- user_id (uuid, PK, FK to users)
- friend_id (uuid, PK, FK to users)
- status (enum: pending, accepted, blocked)
- requested_at (timestamp)

### subscriptions
- user_id (uuid, PK, FK to users)
- provider (enum: paddle, lemonsqueezy, midtrans, xendit, stripe)
- status (enum: active, expired, canceled)
- started_at (timestamp)
- expires_at (timestamp)

## Relationships
- One user has one profile
- One user can join many rooms (via room_members)
- One room has many members
- One user can have many friends
- One user can have one subscription
- One room has many messages
- DMs are messages with no room_id, linked by sender/recipient

## Validation Rules
- Email must be unique and valid
- Avatar uploads: jpg/png/webp, ≤2MB, auto-resized 256x256px
- Room title required, max 100 chars
- Message content required, max 2000 chars
- Only room admin can delete room
- Only message sender or admin can delete message

## State Transitions
- User upgrades/downgrades subscription: update subscription_status
- Room access_type can be changed by admin
- Friend request: pending → accepted/blocked
- Streak: incremented daily, reset if missed (unless freeze token)

---

*See also: research.md for rationale and alternatives.*
