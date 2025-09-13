
# Gamification System – Feature Specification

**Branch:** features
**Date:** 2025-09-13
**Spec:** /specs/gamification-system/spec.md

---


## 1. Problem Statement
Kupintar needs a robust, testable, and extensible gamification system to motivate daily study, provide social recognition, and prevent abuse. The system should provide XP, streaks, badges, and leaderboards, integrated with the existing Kupintar architecture.


## 2. Goals
- Award XP for key actions (e.g., sending messages, joining/creating rooms, inviting friends, completing study sessions)
- Track and display daily streaks
- Award badges for achievements (e.g., first message, 7-day streak, room creator, XP milestones)
- Show leaderboards (global and per-subject)
- Prevent XP farming/abuse (rate limits, cooldowns)


## 3. User Stories
- As a student, I want to earn XP for participating so I feel rewarded for my effort.
- As a student, I want to see my streak and badges so I stay motivated.
- As a student, I want to see how I rank among peers (leaderboard).
- As an admin, I want to configure XP rules and badge conditions.


## 4. Acceptance Criteria
- XP is awarded for defined actions, with anti-abuse rules (rate limits, cooldowns)
- Streaks are tracked per user, timezone-aware (default Asia/Jakarta, user preference supported)
- Badges are awarded and displayed in the UI
- Leaderboards are available and performant (global and per-subject)
- All gamification data is persisted in Supabase (Postgres)
- All features are covered by contract, integration, and E2E tests


## 5. Technical Context
- **Language/Version:** TypeScript (React 18 + Node 20), PostgreSQL (Supabase-managed)
- **Primary Dependencies:** supabase-js, zod, react-query/SWR, existing Kupintar libs
- **Storage:** PostgreSQL (Supabase) — new tables: badges, user_badges, xp_events, xp_config, leaderboard_mv
- **Testing:** Vitest, React Testing Library, Playwright, SQL contract tests
- **Target Platform:** Web (desktop + mobile responsive)
- **Project Type:** Single web project (React + Supabase)
- **Performance Goals:** XP increment <300ms; leaderboard top-100 <100ms
- **Constraints:**
  - Must be resilient to abuse (rate limits, cooldowns)
  - Streaks must be timezone-aware (default Asia/Jakarta)
  - All DB changes must be in supabase/migrations/
- **Scale/Scope:** MVP: 10k DAU, target: 100k+ users


## 6. Core Flow
1. User performs an action (e.g., sends message, joins/creates room, invites friend, completes study session)
2. Frontend calls Supabase RPC (e.g., increment_xp)
3. DB function logs event, updates XP, checks for badges, updates streak
4. Frontend updates UI (XP bar, streak, badge toast, leaderboard)


## 7. Non-Goals
- No AI-based badge awarding
- No offline XP accrual
- No premium-only gamification features (unless specified)


## 8. Risks & Unknowns
- XP-awarding actions: send message (with cooldown, e.g., 1 XP per 30s), join room (one-time per room), create room (significant XP, one-time), daily login/streak bonus, invite friend, react to message, complete study session.
- Initial badge types/conditions: "First Message", "7-Day Streak", "Room Creator", "1000 XP Milestone", ~5–10 simple badges to start.
- Leaderboards: global (all users by XP) and per-subject (Math, Physics, CS, etc.).
- Premium features (planned): streak freeze, XP multiplier, exclusive badges (not in MVP).



## 9. Out of Scope
- Admin UI for badge/XP management (can be added later)
- Gamification for non-student roles


## 10. References
- Supabase RLS docs
- Zod validation best practices
- Playwright E2E testing docs

---

This spec is designed to fit your current Kupintar project structure and will not disrupt existing work.
