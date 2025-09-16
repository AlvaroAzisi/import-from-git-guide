# Phase 0 Research: Kupintar Platform

## Research Tasks & Findings

### 1. Vite+React Monorepo Structure for Web Apps

- **Decision**: Use a modular monorepo with `/frontend`, `/backend`, and `/shared` directories.
- **Rationale**: Enables clear separation of UI, business logic, and shared types/utilities. Supports scalable team workflows and future microservices.
- **Alternatives Considered**: Single repo with all code in `/src` (less scalable); Nx/Turborepo (overhead not justified for MVP).

### 2. Supabase RLS Policy Patterns for Multi-Tenant Study Rooms

- **Decision**: Enforce RLS on all tables (profiles, rooms, messages, friends, subscriptions) with per-user and per-room policies.
- **Rationale**: Ensures data privacy and security for all users and rooms. Aligns with GDPR-like requirements.
- **Alternatives Considered**: No RLS (unacceptable for privacy); custom backend API (adds complexity, less real-time).

### 3. Chat Architecture Using Supabase Realtime

- **Decision**: Use Supabase Realtime channels for room and DM chat, with presence tracking and message persistence in Postgres.
- **Rationale**: Low-latency, scalable, and leverages managed infra. Supports presence and activity streams.
- **Alternatives Considered**: WebSockets with custom backend (more ops overhead); Firebase (less SQL flexibility).

### 4. Payment Integration: Paddle/LemonSqueezy, Midtrans/Xendit, Stripe

- **Decision**: Default to Paddle/LemonSqueezy for global, add Midtrans/Xendit for IDR, Stripe for future enterprise.
- **Rationale**: Handles taxes/compliance globally, supports regional billing, and future expansion.
- **Alternatives Considered**: Stripe only (limited IDR support); custom billing (high risk).

### 5. Avatar Upload/Resize/Storage with Supabase

- **Decision**: Accept jpg/png/webp ≤2MB, auto-resize to 256x256px, store in Supabase Storage with RLS owner-only access.
- **Rationale**: Ensures privacy, performance, and consistent UX.
- **Alternatives Considered**: No resize (worse UX); public bucket (privacy risk).

### 6. Gamification Data Modeling (XP, Streaks, Badges)

- **Decision**: Store XP, streaks, badges in `profiles` table; award badges via scheduled Supabase Functions.
- **Rationale**: Centralizes gamification, supports extensibility.
- **Alternatives Considered**: Separate tables for each (unnecessary for MVP).

### 7. GDPR-like Privacy & Data Retention in Supabase

- **Decision**: Retain messages 1 year, activity logs 6 months, allow user-initiated deletion/anonymization.
- **Rationale**: Aligns with privacy laws and user expectations.
- **Alternatives Considered**: Longer retention (privacy risk); no anonymization (non-compliant).

### 8. CI/CD for Vercel + Supabase + GitHub Actions

- **Decision**: Use GitHub Actions for lint/test/deploy, Vercel for frontend, Supabase Cloud for backend.
- **Rationale**: Fast deploys, managed infra, easy rollbacks.
- **Alternatives Considered**: Custom CI/CD (slower, more maintenance).

---

**All Phase 0 research tasks complete. No open NEEDS CLARIFICATION remain.**
