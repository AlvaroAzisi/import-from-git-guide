# Feature Specification: Kupintar: A Next-Generation Learning & Collaboration Platform for Ambitious Students

**Feature Branch**: `001-kupintar-a-next`  
**Created**: September 15, 2025  
**Status**: Draft  
**Input**: User description: "Kupintar: A Next-Generation Learning & Collaboration Platform for Ambitious Students ... [full description as provided]"

## Execution Flow (main)

```
1. Parse user description from Input
   → If empty: ERROR "No feature description provided"
2. Extract key concepts from description
   → Identify: actors, actions, data, constraints
3. For each unclear aspect:
   → Mark with [NEEDS CLARIFICATION: specific question]
4. Fill User Scenarios & Testing section
   → If no clear user flow: ERROR "Cannot determine user scenarios"
5. Generate Functional Requirements
   → Each requirement must be testable
   → Mark ambiguous requirements
6. Identify Key Entities (if data involved)
7. Run Review Checklist
   → If any [NEEDS CLARIFICATION]: WARN "Spec has uncertainties"
   → If implementation details found: ERROR "Remove tech details"
8. Return: SUCCESS (spec ready for planning)
```

---

## User Scenarios & Testing _(mandatory)_

### Primary User Story

Ambitious students join Kupintar to find or create study rooms, collaborate in real-time with peers, track their learning progress, and earn recognition for their engagement and achievements.

### Acceptance Scenarios

1. **Given** a new user, **When** they sign up and join a public study room, **Then** they can participate in chat and view room details.
2. **Given** a user with friends, **When** they initiate a direct message, **Then** the conversation appears in their sidebar and is accessible for future reference.
3. **Given** a user with a streak, **When** they log in daily, **Then** their streak and XP are updated and visible on their dashboard.
4. **Given** a user with a Pro subscription, **When** they access advanced analytics, **Then** they see detailed study statistics and exclusive features.

5. **Given** a free user, **When** they attempt to access Pro-only features, **Then** they are prompted to upgrade and access is denied.
6. **Given** a user, **When** they upgrade to Pro, **Then** their subscription is activated and Pro features are unlocked.
7. **Given** a Pro user, **When** their subscription expires, **Then** access to Pro features is revoked and they are notified.
8. **Given** a Pro user, **When** they downgrade to free, **Then** Pro features become inaccessible and their status is updated.

### Edge Cases

- What happens when a user tries to join a private room without an invite?
- How does the system handle a user exceeding the free DM limit?
- What if a user attempts to upload an unsupported avatar file type?
- How are streaks handled if a user misses a day due to technical issues? If the user has a “Freeze Streak” token (earned via daily login rewards), their streak is protected for one missed day. Users can stack up to 2 tokens. If no token is available, the streak resets to zero.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST allow users to create and join study rooms (public or private).
- **FR-002**: System MUST provide real-time chat within study rooms and for direct messages.
- **FR-003**: System MUST enable users to add friends and form friend groups.
- **FR-004**: System MUST enforce DM limits for free users and unlock unlimited DMs for Pro users.
- **FR-005**: System MUST track and display XP, streaks, and achievements for each user.
- **FR-006**: System MUST provide a dashboard for users to view their progress and analytics.
- **FR-007**: System MUST allow users to manage their profile, including avatar upload and personal info.
- **FR-008**: System MUST support room discovery and friend discovery features.
- **FR-009**: System MUST award badges for specific milestones and contributions.
- **FR-010**: System MUST restrict access to private rooms and admin-only settings.
  **FR-011**: System MUST allow Pro users to access advanced analytics and exclusive features.
  **FR-012**: System MUST provide Pro subscription via Paddle/LemonSqueezy (default), with future support for Midtrans/Xendit (IDR) and Stripe (global).
  **FR-013**: System MUST support email/password (with verification) and Google sign-in, extensible to future providers (Apple, GitHub, etc).
  **FR-014**: System MUST allow jpg/png/webp up to 2MB, resize to 256x256, stored in Supabase public bucket with RLS owner-only access.
  **FR-015**: System MUST allow users to leave or delete rooms they created.

## Roadmap & Future Enhancements

- Q4 2025: Join via code, DM & Group Chat, Badge System
- H1 2026: Whiteboard, Scheduling, Friend Auto-Matching
- 2026+: Video/Audio Calls (Pro)

### Key Entities _(include if feature involves data)_

- **users**: All registered accounts (unique id, email, etc)
  **profiles**: User profile info (name, avatar, XP, streaks, badges, subscription)
  **rooms**: Study rooms (title, description, tags, creator, access type, members)
  **room_members**: Links users to rooms, tracks roles and permissions
  **messages**: Chat messages in rooms or DMs (sender, timestamp, content)
  **friends**: Social connections (status: pending, accepted)
  **subscriptions**: Pro tier status, payment info, access rights

## Data Retention & Privacy

- **Messages**: Retained for 1 year, then archived or purged.
- **Room data**: Persist until deleted by admin.
- **User activity logs**: Retained for 6 months, then anonymized for analytics.
- **User controls**: Users can delete their own messages, leave rooms, and request account deletion (removes profile, anonymizes data).

## Error Handling & User Feedback

System provides clear, contextual error messages for common scenarios:

- Joining private/full room
- Unsupported/corrupt avatar upload
- Exceeding DM limits
- Invalid invite code
  Messages explain what went wrong and how to fix it.

## Performance & Scale

- **Chat latency**: Target <200ms average message delivery
- **Room size**: 30 (Free) / 100 (Pro) for MVP; scale to 200+ after 10k users
- **Scalability**: Supabase real-time backend, scalable/shardable as needed

## Security & Compliance

- **Privacy compliance**: GDPR-like (right to be forgotten, data export)
- **Age**: Platform for 13+ (SMP and above); if <13, parental consent required
- **Security**: SSL/TLS enforced, passwords hashed (bcrypt or equivalent), RLS for all Supabase tables
- **Abuse prevention**: Rate-limiting and abuse prevention for chat/friend requests

---

## Review & Acceptance Checklist

_GATE: Automated checks run during main() execution_

### Content Quality

- [ ] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

### Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

---

## Execution Status

---

## Preferred Technologies & Practices _(for implementation guidance only)_

> The following are preferred technologies and practices to guide implementation, but are not part of the formal specification.

- **Backend & Storage**: Supabase (auth, database, real-time, storage with RLS)
- **Payment Gateways**: Paddle/LemonSqueezy (default, global), Midtrans/Xendit (IDR, regional), Stripe (global, future)
- **Auth Providers**: Email/password (with verification), Google sign-in. Expandable to Apple/GitHub later
- **File Handling**: Avatars supported in jpg/png/webp, max 5MB, resized to 256×256 before storage
- **Security Practices**: bcrypt (or equivalent) for password hashing, SSL/TLS everywhere, rate limiting for abuse prevention

- [x] User description parsed
- [x] Key concepts extracted
- [x] Ambiguities marked
- [x] User scenarios defined
- [x] Requirements generated
- [x] Entities identified
- [ ] Review checklist passed

---
