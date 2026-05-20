# ArrowChat

Sleek, minimalist bio-link and social platform inspired by Discord and Haunt.gg.

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 (App Router) + React 19 |
| Styling | Tailwind CSS v4 |
| Icons | Lucide-react |
| Auth + Realtime DB | Supabase Auth + Postgres + Realtime |
| Payments | Stripe |
| Proxy | Caddy (automatic HTTPS) |
| Deployment | VPS |

## Features

- **Bio Link Pages** (`/{username}`) — avatars, badges, reorderable social links, embedded media (premium)
- **Global Chat** — real-time scrolling messages with user badges and timestamps
- **Direct Messages** — per-user conversation threads with unread counts
- **Premium Tier** — animated backgrounds, custom subdomains, TTS in chat, exclusive badges (gated via Stripe)

## Development

```bash
cd apps/web
cp .env.example .env.local
npm install
```

Then configure Supabase + schema:

1. Create a Supabase project.
2. Run `apps/web/db/schema.sql` in Supabase SQL editor.
3. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to `.env.local`.

Start dev server:

```bash
npm run dev
```

## Production (VPS + Caddy)

1. Build & start Next.js:
   ```bash
   cd apps/web
   npm run build
   npm run start              # listens on port 3000
   ```

2. Edit `Caddyfile` — replace `{YOUR_DOMAIN}` with your domain.

3. Install and start Caddy:
   ```bash
   sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
   curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
   # ... follow https://caddyserver.com/docs/install#debian-ubuntu-raspbian
   sudo cp Caddyfile /etc/caddy/Caddyfile
   sudo systemctl enable --now caddy
   ```

Caddy handles HTTPS automatically via Let's Encrypt.

## Stripe Setup

1. Create a Stripe account and add products for Monthly and Annual plans.
2. Copy the price IDs into `.env.local`.
3. Point your Stripe webhook to `https://your-domain.com/api/webhook` and set `STRIPE_WEBHOOK_SECRET`.

## Environment Variables

See `apps/web/.env.example` for all required variables.
