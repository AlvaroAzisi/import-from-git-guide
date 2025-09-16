# Quickstart: Kupintar Platform

## Prerequisites
- Node.js 18+
- pnpm (preferred) or npm/yarn
- Supabase project (with Postgres, Auth, Storage enabled)
- Vercel account (for frontend hosting)

## 1. Clone the Repository
```bash
git clone <repo-url>
cd kupintar
```

## 2. Install Dependencies
```bash
pnpm install
# or
npm install
```

## 3. Configure Environment
- Copy `.env.example` to `.env` in both `/frontend` and `/backend` (if split)
- Set Supabase project URL and anon/public keys
- Set Vercel/hosting environment variables as needed

## 4. Database Setup
- Run Supabase migrations (see `/backend/migrations`)
- Set up RLS policies as per `data-model.md`

## 5. Start Development Servers
```bash
# Frontend
pnpm dev
# Backend (if using Supabase CLI for local dev)
supabase start
```

## 6. Run Tests
```bash
pnpm test
# or
npm test
```

## 7. Deploy
- Frontend: Push to Vercel (auto-deploys from main branch)
- Backend: Supabase Cloud auto-deploys migrations

---

*For more details, see research.md and data-model.md.*
