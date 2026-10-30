# BattleZone Full-Stack Starter (Web + Android-ready)

This is a starter project, not a deployed service or signed Android APK yet. It includes a Vite web app that can later be wrapped with Capacitor for Android, plus Supabase Auth/database schema with Row Level Security.

## What's included
- Email/password sign-in and account creation (Supabase Auth)
- Tournament list
- Player registration with game UID/team name
- Owner role checked from database profile
- Owner-only event creation and open/close controls
- Owner registration view
- Supabase SQL schema + RLS policies
- Safe-by-default: no real payment transfer or storage of passwords/OTPs

## 1. Create the backend
1. Create a project at https://supabase.com/
2. In Project Settings / API, copy the Project URL and publishable/anon key.
3. Copy `.env.example` to `.env` and fill:
   VITE_SUPABASE_URL=...
   VITE_SUPABASE_ANON_KEY=...
4. Open Supabase SQL Editor and run `supabase/migrations/001_initial.sql`.
5. In Supabase Authentication settings, configure email confirmation and allowed redirect URLs for your actual deployment domain.
6. Never put the Supabase `service_role` secret in `.env` for this client app or publish it.

## 2. Securely make YOUR account the owner
1. First run the app, sign up with your own email, and confirm it.
2. In Supabase Dashboard > SQL Editor, find your user's UUID in Authentication > Users.
3. Run this SQL, replacing the UUID with your own verified auth user ID:
   `update public.profiles set role = 'owner' where id = 'YOUR-USER-UUID';`
4. Do not add an owner role dropdown to the public app. Owner privilege is assigned only from the trusted dashboard. The SQL above must be run by the project owner in the Supabase dashboard.

## 3. Run locally
Install Node.js on a computer:
- `npm install`
- `npm run dev`
- Open the local URL Vite prints.
- Production build: `npm run build`

## 4. Android app path
Once the web app and backend work, install Capacitor:
- `npm install @capacitor/core @capacitor/cli @capacitor/android`
- `npx cap init BattleZone com.yourcompany.battlezone`
- Set Vite `build.outDir` to `dist` (default), run `npm run build`
- `npx cap add android`
- `npx cap sync android`
- `npx cap open android`
Build/sign the APK in Android Studio. Android Studio normally requires a computer. Do not claim a signed APK exists until built and tested.

## 5. Payments and owner controls
The app does NOT transfer money. `entry_fee` and `prize_pool` are informational fields only. For real payments:
- Check applicable laws, tournament/publisher rules and age requirements.
- Use a licensed payment provider available in your jurisdiction.
- Add a server-side order creation endpoint, signature/webhook verification, refund process, reconciliation, fraud controls and audit logging.
- Never trust payment success reported by the client.
- Never collect UPI PIN, bank PIN, passwords or OTPs.
- Keep payment secrets only on the server, never in frontend variables.

## 6. Production checklist before public launch
- Deploy on HTTPS and configure Auth redirect URLs.
- Test RLS with player and owner accounts.
- Add rate limits, email verification, account recovery and monitoring.
- Add max-slot enforcement using a database transaction/RPC (current starter schema does not fully prevent concurrent overbooking).
- Add organizer moderation, support/reporting, privacy policy, terms, age requirements and data deletion.
- Validate game UID, results and tournament rules; don't store game account passwords.
- Perform security review before taking money or launching publicly.

## Important
The owner dashboard in this project uses database-backed role checks and RLS when the Supabase setup is completed. Before setup, no live login/backend is active. This is a starter kit and still needs deployment, testing and production hardening. It is a fan-made community tool, not affiliated with Garena/Free Fire.
