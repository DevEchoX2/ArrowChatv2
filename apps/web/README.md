# ArrowChat Web App

Next.js App Router frontend for ArrowChat.

## Setup

```bash
cp .env.example .env.local
npm install
npm run dev
```

Required env vars are in `.env.example`.

## Database

Run `db/schema.sql` in Supabase SQL editor to create:
- `profiles` table
- `messages` table (global + dm)
- RLS policies
- auth user profile bootstrap trigger
- realtime publication for `messages`

## Scripts

- `npm run dev`
- `npm run lint`
- `npm run build`
- `npm run start`
