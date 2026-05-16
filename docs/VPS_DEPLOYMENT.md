# VPS Deployment (Caddy + single backend)

## Topology
- Static frontend: `apps/web` served by Caddy
- Backend: `services/backend` on `127.0.0.1:3001`
- Caddy reverse proxy for `/api/*` and `/ws`

## Backend service
```bash
cd /var/www/arrowchat/services/backend
npm install
PRIVATE_ACCESS_PASSWORD='replace-me'
SESSION_SECRET='replace-with-long-secret'
COOKIE_SECURE=true
HOST=127.0.0.1
PORT=3001
npm start
```

Use a process manager (systemd, pm2, etc.) in production.

## Caddyfile
```caddy
chat.yourdomain.com {
    encode zstd gzip

    basicauth /* {
        admin $2a$14$REPLACE_WITH_BCRYPT_HASH
    }

    root * /var/www/arrowchat/apps/web

    handle /api/* {
        reverse_proxy 127.0.0.1:3001
    }

    handle /ws* {
        reverse_proxy 127.0.0.1:3001
    }

    try_files {path} /index.html
    file_server
}
```

## Optional hardening
- Restrict by source IP in front of Caddy or with firewall rules
- Keep backend bound to loopback only (`127.0.0.1`)
- Set `PRIVATE_ACCESS_PASSWORD` (>=12 chars) and `SESSION_SECRET` (>=32 chars)
- Validate readiness after deploy with `GET /api/ready`
