# WildBidZA

Production-ready online auction platform for South African livestock/game-style listings, built with Next.js + Supabase.

## Stack

- Next.js 16 (App Router) + React + TypeScript
- Tailwind CSS + Radix/shadcn-style UI primitives
- Supabase Auth (email/password + Google OAuth)
- Supabase Postgres + RLS + RPC
- Supabase Storage (auction images)
- Supabase Realtime (bids + notifications + deal chat messages)
- Vercel hosting target

## Core Capabilities

- Public auction browsing (Upcoming / Live / Past)
- Premium auth flows (Google + email/password + reset)
- Approval-gated bidding (`pending` users cannot bid)
- Seller-only listing creation (admin-granted)
- Live bid updates with secure RPC bid placement
- Anti-sniping settings (`sniping_window_minutes`, `extension_minutes`)
- Auction finalization job with winner + notifications
- Post-auction winner/seller deal chat for payment + logistics coordination
- Admin modules: approvals, seller grants, categories, settings, moderation, audit log
- Image upload flow with true crop output (1:1, 4:5, 16:9), reorder, and Storage persistence

## Roles and Permissions

- Visitor: browse public auctions
- User (pending): authenticated but cannot bid/create listings
- Approved Bidder: can bid on live auctions
- Approved Seller: can create and manage own auctions
- Admin: approvals, seller grants, categories, settings, moderation

## Timezone and Currency

- Currency formatting: `ZAR` (`R`)
- Operational timezone: `Africa/Johannesburg`
- Server-time validations for bid window checks

## Project Structure

```text
app/
  (public)/...
  (auth)/...
  (dashboard)/...
  api/... (auctions, seller, admin, profile, notifications, deals)
components/
  auctions/, auth/, seller/, admin/, deals/, layout/, ui/
lib/
  auctions/, auth/, constants/, deals/, notifications/, supabase/, utils/, validation/
hooks/
  use-server-time.ts, use-realtime-bids.ts
supabase/
  config.toml
  migrations/0001..0011
  seed.sql
scripts/
  verify-env.ts
  seed-categories.ts
  create-admin.ts
```

## Environment Variables

Copy `.env.example` to `.env.local`:

```bash
NEXT_PUBLIC_APP_NAME=WildBidZA
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_DB_PASSWORD=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
ADMIN_EMAIL=
ADMIN_PASSWORD=
ADMIN_DISPLAY_NAME=WildBidZA Admin
NEXT_PUBLIC_LIVESTREAM_TURN_URLS=
NEXT_PUBLIC_LIVESTREAM_TURN_USERNAME=
NEXT_PUBLIC_LIVESTREAM_TURN_CREDENTIAL=
```

`NEXT_PUBLIC_LIVESTREAM_TURN_*` values are optional but recommended for reliable cross-network livestream connectivity.

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Verify env:

```bash
npm run verify:env
```

3. Start the app:

```bash
npm run dev
```

## Supabase Setup

1. Create a Supabase project.
2. Set Auth providers:
   - Enable Email/Password.
   - Enable Google OAuth.
3. Configure Auth redirect URLs:
   - `http://localhost:3000/auth/callback`
   - `https://<your-vercel-domain>/auth/callback`
4. Ensure `pg_cron` extension is enabled (migration also creates it).
5. Apply SQL migrations in order from `supabase/migrations`.
6. Apply seed data (`supabase/seed.sql`) for categories/settings baseline.

If using Supabase CLI:

```bash
supabase link --project-ref <project-ref>
supabase db push
supabase db seed
```

## Seed and Admin Bootstrap

Seed category data:

```bash
npm run seed:categories
```

Create/upgrade admin user:

```bash
npm run seed:admin
```

## Bidding Security Model

- Client does **not** insert bids directly.
- `POST /api/auctions/[id]/bids` calls Postgres RPC `place_bid`.
- `place_bid` enforces:
  - approved user check
  - auction time window check
  - min increment check
  - row lock/atomicity
  - anti-sniping extension
  - outbid notification
- RLS blocks direct `INSERT` on `bids`.

## Auction Finalization

- Function: `public.finalize_ended_auctions()`
- Schedule: `pg_cron` every minute (`savannabid_finalize_auctions`)
- Effects:
  - marks auction as `ended`
  - sets winner + winning bid
  - creates winner notification
  - creates/updates winner-seller deal conversation

## Storage and Image Policy

- Bucket: `auction-images`
- Public read allowed
- Upload path ownership enforced by policy (`<user_id>/...`)
- Upload URL issued by server endpoint with MIME + size checks

## Run Quality Checks

```bash
npm run typecheck
npm run lint
npm run build
```

## Vercel Deployment

1. Push repo to Git provider.
2. Create Vercel project and connect repo.
3. Set **Production Branch** in Vercel project settings to `live`.
4. Set environment variables in Vercel:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_APP_URL=https://<your-vercel-domain>`
5. Deploy.
6. Add Vercel callback URL in Supabase Auth redirects.

The repository includes `vercel.json` with branch deployment rules:
- `live` auto deployments: enabled
- `main` auto deployments: disabled

This supports your workflow of developing on `main` and only publishing to production from `live`.

## Vercel CLI (Optional)

If you want CLI-based setup/deploy, authenticate first:

```bash
vercel login
```

Or use a token in CI/non-interactive mode:

```bash
vercel --token <VERCEL_TOKEN>
```

Then link and deploy:

```bash
vercel link
vercel --prod
```

## Supabase OAuth Redirects For Production

Add both URLs in Supabase Auth settings:
- `https://<your-vercel-domain>/auth/callback`
- `http://localhost:3000/auth/callback`

For Google OAuth provider configuration, ensure the same callback base URL is allowed in Google Cloud Console.

## Acceptance Validation Checklist

- User signs up -> lands pending approval
- Admin approves user -> user can bid
- Unapproved user bidding rejected server-side
- Only seller-approved users can create auctions
- Live bid updates visible in real-time on detail page
- Anti-sniping extends auction when configured threshold is hit
- Ended auction is locked and winner shown
- Winner and seller can open `/deals/[auctionId]` and exchange messages
- Cropped/reordered images persist to Storage + DB
- Admin settings persist and affect behavior

## Security Notes

- Enforce server-side validation with Zod in mutating routes
- Keep `SUPABASE_SERVICE_ROLE_KEY` server-only
- Use RLS on all core tables
- Write admin actions to `audit_log`
- Use server timestamps for auction state checks


