# LocalBazaar Web

Production-ready Next.js web app for LocalBazaar / PinCode Mart.

## Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS 4
- Supabase Auth, Database, Storage, and Edge Functions
- Razorpay checkout

## Local Setup

```bash
npm ci
# When developing beside the Android project, this imports the root
# local.properties values into the ignored .env.local automatically.
npm run typecheck
npm run dev
```

Open `http://localhost:3000`. If that port is busy, Next will choose another port.

## Required Vercel Environment Variables

For a deployed build, set these in Vercel Project Settings -> Environment Variables:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_live_or_test_key_id
NEXT_PUBLIC_APP_URL=https://your-domain.com
NEXT_PUBLIC_APP_NAME=LocalBazaar
```

Optional:

```env
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-google-maps-api-key
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id
```

Do not commit `.env` files. The repo includes `.env.example` only.

## Authentication and reels

`/reels` and `/reel/<reel-id>` are intentionally public so shared links work for signed-out iOS users. Likes and comments still require a Supabase session. Marketplace, shops, product details, travel, services, settings, payments, merchant store, and admin routes are protected by `AuthGate` and redirect to onboarding when signed out.

Reel playback uses the shared `reels_feed_cursor`/`reel_comments_page` RPCs and the R2 `video_url`/`thumbnail_url` values. Merchant publishing uses the existing Supabase Edge Functions `reel-upload-url` and `reel-finalize`: the browser requests a short-lived signed Cloudflare upload URL, uploads the MP4 and generated JPEG cover directly to R2, then finalizes the ticket. Deploy those functions and the Android project's latest reel/media migrations to the same Supabase project used by this web app; the web client does not duplicate service-role credentials.

The Android app reads `WEB_APP_URL` from `local.properties` (default `https://pincodemart.in`) and shares `/reel/<id>` links. Set the same origin in the web deployment and publish Android Digital Asset Links for that host if verified App Links are desired.

## Deploy To Vercel

Use `localbazaar-web` as the Vercel project root.

Vercel settings:

- Framework Preset: `Next.js`
- Install Command: `npm ci`
- Build Command: `npm run build`
- Output Directory: `.next`
- Node.js: `22.x` or newer
- Region: `bom1` is configured in `vercel.json`

CLI deployment:

```bash
cd localbazaar-web
vercel
vercel --prod
```

## Supabase Setup

Run migrations in order from:

```text
supabase/migrations/
```

Apply the Android project's migrations in filename order (the web client and Android app must use the same database). The latest admin/payment fix in this web repository is:

```text
013_manual_ad_payment.sql
```

It accepts admin profiles, fixes the superadmin dashboard counts/queue, supports moderation for every listing type, and keeps merchant payments in the approval flow without blocking on Razorpay.

## Supabase Edge Functions

Deploy payment functions from this folder:

```bash
supabase functions deploy payment-create-order
supabase functions deploy payment-verify

Marketplace access uses the database approval flow in `010_manual_marketplace_access.sql` and does not depend on these Edge Functions. Apply the migration before testing merchant access requests.
```

Set these Supabase function secrets:

```env
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
RAZORPAY_KEY_ID=your-razorpay-key-id
RAZORPAY_KEY_SECRET=your-razorpay-key-secret
```

## Checks

```bash
npm run typecheck
npm run lint
npm run build
```

`npm run lint` currently passes with warnings for existing raw `<img>` tags. The production build passes.

## Production URLs

- App health check: `/api/health`
- Legal page: `/legal`
- Delete account policy: `/delete-account`
- Sitemap: `/sitemap.xml`
- Robots: `/robots.txt`
