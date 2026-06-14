# ArrowChatv2 VPS Deployment

This guide explains how to deploy `ArrowChatv2` on a VPS using Node.js and Caddy.

## Prerequisites

- A Linux VPS (Ubuntu 22.04/24.04 recommended)
- A registered domain name
- Access to the VPS via SSH
- GitHub repo: `https://github.com/DevEchoX2/ArrowChatv2`
- Supabase project ready
- Optional: Stripe account and keys

## 1. Install system dependencies

```bash
sudo apt update
sudo apt install -y git curl gnupg lsb-release build-essential
```

## 2. Install Node.js and npm

Use the NodeSource setup script for Node 20+:

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

Verify:

```bash
node -v
npm -v
```

## 3. Install Caddy

```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install -y caddy
```

## 4. Clone the repository

```bash
cd /var/www
sudo git clone https://github.com/DevEchoX2/ArrowChatv2.git
cd ArrowChatv2/apps/web
```

## 5. Install project dependencies

```bash
npm install
```

## 6. Create and configure environment variables

Copy the example file:

```bash
cp .env.example .env.local
```

Edit `apps/web/.env.local` with the correct values.

### Important Supabase values

- `NEXT_PUBLIC_SUPABASE_URL` should be the Supabase project base URL, e.g.:
  `https://qmuiolfeymjeqyxsxczw.supabase.co`
  - Do not include `/rest/v1/`.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` should be the public anon key.

### Stripe values

- `STRIPE_SECRET_KEY`
- `STRIPE_MONTHLY_PRICE_ID`
- `STRIPE_ANNUAL_PRICE_ID`
- `STRIPE_WEBHOOK_SECRET`

If you do not use Stripe yet, leave the Stripe values blank for now.

## 7. Build the app

```bash
npm run build
```

## 8. Test locally

```bash
npm run start
```

Then verify `http://localhost:3000` is working.

## 9. Configure Caddy

Edit `/etc/caddy/Caddyfile` and replace `{YOUR_DOMAIN}` with your domain:

```text
your-domain.com {
    reverse_proxy localhost:3000

    encode zstd gzip

    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
        X-Content-Type-Options    "nosniff"
        X-Frame-Options           "SAMEORIGIN"
        Referrer-Policy           "strict-origin-when-cross-origin"
        -Server
    }

    @ws {
        path /ws
        header Connection *Upgrade*
        header Upgrade    websocket
    }
    reverse_proxy @ws localhost:3000
}
```

Reload Caddy:

```bash
sudo systemctl reload caddy
```

## 10. Create a systemd service

Create `/etc/systemd/system/arrowchatv2.service`:

```bash
sudo tee /etc/systemd/system/arrowchatv2.service > /dev/null <<'EOF'
[Unit]
Description=ArrowChatv2 Next.js app
After=network.target

[Service]
Type=simple
WorkingDirectory=/var/www/ArrowChatv2/apps/web
ExecStart=/usr/bin/npm run start
Restart=always
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF
```

Enable and start the service:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now arrowchatv2
sudo systemctl status arrowchatv2
```

## 11. Update the app after changes

When you change code or env values:

```bash
cd /var/www/ArrowChatv2/apps/web
git pull
npm install
npm run build
sudo systemctl restart arrowchatv2
```

## 12. Troubleshooting

- Check app logs:
  ```bash
  sudo journalctl -u arrowchatv2 -n 100 --no-pager
  ```
- Check Caddy status:
  ```bash
  sudo systemctl status caddy
  ```
- Check network locally:
  ```bash
  curl -I http://localhost:3000
  ```

## Notes

- This repo uses Next.js with server-side API routes. It is meant to run on a Node.js server and reverse-proxied by Caddy.
- Keep secrets out of git; only use `.env.local` on the VPS.
