# Tasks: Kupintar – Next-Generation Learning & Collaboration Platform

**Feature Branch:** `001-kupintar-a-next`  
**Plan:** [`plan.md`](./plan.md)  
**Data Model:** [`data-model.md`](./data-model.md)  
**Contracts:** [`contracts/`](./contracts/)  
**Quickstart:** [`quickstart.md`](./quickstart.md)

---

## Task Execution Guidance

- Tasks marked **[P]** can be executed in parallel.
- Tasks referencing the same file or dependent on previous steps must be executed sequentially.
- Each task includes a file path and a clear description.
- Use the Task agent to execute:  
  `task run <task-id>`

---

## Task List

### T001. Organize Source Structure

- **Description:** Review and, if needed, organize `src/` into logical folders (e.g., `src/components`, `src/pages`, `src/lib`, `src/hooks`). Do not move files unless it improves clarity or maintainability. Update imports if any files are moved.
- **Path:** `/src`
- **Dependencies:** None

---

### T002. Install/Update Dependencies [P]

- **Description:** Ensure all required dependencies are installed for Vite, React, TailwindCSS, shadcn/ui, Framer Motion, React Router DOM, Supabase JS, and TypeScript. Only add or update packages as needed; do not remove existing ones unless obsolete.
- **Path:** `/`
- **Dependencies:** T001

---

### T003. Configure Linting & Formatting [P]

- **Description:** Ensure ESLint, Prettier, and Husky are set up and up-to-date. Update configs only if missing or outdated.
- **Path:** `/`
- **Dependencies:** T001

---

### T004. Extend Supabase Schema

- **Description:** In the existing `supabase/` folder, add new tables/columns (e.g., `subscriptions`, `badges`) via migrations. Do not re-create or drop existing tables (`profiles`, `rooms`, `room_members`, `messages`, `friends`). Use `supabase/migrations` for schema changes.
- **Path:** `/supabase/migrations`
- **Dependencies:** T002

---

### T005. Update Data Models & Types [P]

- **Description:** Update SQL migrations and generate TypeScript types for all entities, extending (not replacing) existing models: users, profiles, rooms, room_members, messages, friends, subscriptions, badges. Place generated types in `src/lib/types`.
- **Path:** `/supabase/migrations`, `/src/lib/types`
- **Dependencies:** T004

---

### T006. Update RLS Policies [P]

- **Description:** Write or update Row-Level Security policies for all new/modified tables in `supabase/policies`. Ensure existing policies remain intact.
- **Path:** `/supabase/policies`
- **Dependencies:** T005

---

### T007. Stub Supabase Functions [P]

- **Description:** Add stub edge functions in `supabase/functions` for payment webhooks, streak resets, and badge assignments. Use mock logic for MVP; real integrations can be added later.
- **Path:** `/supabase/functions`
- **Dependencies:** T005

---

### T008. Update/Scaffold UI Components

- **Description:** Ensure all new features have corresponding UI components in `src/components` and pages in `src/pages`. Integrate with existing codebase and maintain design consistency.
- **Path:** `/src/components`, `/src/pages`
- **Dependencies:** T002

---

### T009. Implement/Update Auth Flows

- **Description:** Integrate Supabase Auth for email/password and Google sign-in. Add/extend UI for login, registration, and verification. Ensure backward compatibility.
- **Path:** `/src/auth`, `/src/components`
- **Dependencies:** T008

---

### T010. User Profile Management

- **Description:** Implement or update profile page, avatar upload (jpg/png/webp, 2MB, resize to 256x256), and personal info editing. Ensure RLS and storage policies are enforced.
- **Path:** `/src/pages/profile`, `/src/components/profile`
- **Dependencies:** T009

---

### T011. Study Room CRUD

- **Description:** Implement or update create, join (public/private/code), leave, and delete room flows. Show room details and member list.
- **Path:** `/src/pages/rooms`, `/src/components/rooms`
- **Dependencies:** T009

---

### T012. Real-Time Chat (Rooms & DMs)

- **Description:** Implement or update chat UI for rooms and DMs using Supabase Realtime. Support message sending, receiving, and presence.
- **Path:** `/src/pages/chat`, `/src/components/chat`
- **Dependencies:** T011

---

### T013. Friends & Groups

- **Description:** Implement or update friend requests, accept/decline, friend list, and group creation.
- **Path:** `/src/pages/friends`, `/src/components/friends`
- **Dependencies:** T009

---

### T014. XP, Streaks & Badges

- **Description:** Track and display XP, streaks, badges. Implement streak freeze logic and badge awarding. Integrate with Supabase functions and policies.
- **Path:** `/src/pages/gamification`, `/src/components/gamification`
- **Dependencies:** T010, T012

---

### T015. Analytics Dashboard (Pro)

- **Description:** Implement dashboard for analytics, streaks, and study stats. Restrict advanced features to Pro users.
- **Path:** `/src/pages/dashboard`, `/src/components/dashboard`
- **Dependencies:** T014

---

### T016. Payments & Subscription

- **Description:** Integrate Paddle/LemonSqueezy for Pro subscriptions. Handle upgrade, downgrade, and expiry flows. Use stubbed backend logic for MVP.
- **Path:** `/src/pages/payments`, `/src/components/payments`, `/supabase/functions/payments`
- **Dependencies:** T007, T009

---

### T017. Room & Friend Discovery

- **Description:** Implement or update search and discovery for rooms and friends.
- **Path:** `/src/pages/discovery`, `/src/components/discovery`
- **Dependencies:** T011, T013

---

### T018. Error Handling & Feedback

- **Description:** Add or update contextual error messages for all major flows (auth, chat, payments, uploads).
- **Path:** `/src/components/ErrorBoundary.tsx`
- **Dependencies:** All previous frontend tasks

---

### T019. Lightweight Unit & Integration Tests [P]

- **Description:** Write unit tests for new/changed components, hooks, and utility functions. Add minimal integration tests for core user flows. Use Vitest or Jest for unit tests; do not block MVP on Playwright/Cypress.
- **Path:** `/src/__tests__`, `/src/lib/__tests__`
- **Dependencies:** T018

---

### T020. Model & Function Tests [P]

- **Description:** Write unit tests for new/changed Supabase data models and stub functions. Focus on subscriptions, badges, and payment logic.
- **Path:** `/supabase/tests`
- **Dependencies:** T007

---

### T021. Polish & Documentation [P]

- **Description:** Finalize UI, write user and developer docs, and add performance optimizations. Ensure all new features are documented.
- **Path:** `/src`, `/supabase`, `/docs`
- **Dependencies:** All previous tasks

---

## Parallel Execution Example

- After T001, run T002 and T003 in parallel.
- After T005, run T006, T007, and T020 in parallel.
- After T018, run T019, T021 in parallel.

---

## Task Agent Commands

```sh
task run T001
task run T002 & task run T003
task run T004
task run T005
task run T006 & task run T007 & task run T020
task run T008
...
```

---

**Ready for incremental, non-destructive implementation.**  
Start with T001 and proceed as described.  
Let me know when you want to start or if you want to run a specific task!
