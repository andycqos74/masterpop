# Masterpop

A private companion app for scoring Popmaster (Greatest Hits Radio, weekdays 10am-1pm).
Listen however you like, then enter your round scores here, see your history and compare with friends.

- Next.js 15 (App Router, TypeScript), installable as a PWA
- Postgres 16 in Docker, plain SQL migrations (`migrations/`) applied automatically on start
- Own login: scrypt password hashes, server-side sessions in an httpOnly cookie, invite-only sign-up
- The first account created on an empty database becomes admin and needs no invite code. After that, admins create invite codes on the Invites page.

## Run with Docker

```bash
cp .env.example .env      # then set a long random POSTGRES_PASSWORD
docker compose up -d --build
```

The app listens on `APP_PORT` (default 3000). Put it behind HTTPS (for example a Cloudflare Tunnel);
secure cookies and PWA install both need it. For plain-http testing on localhost set `COOKIE_SECURE=false`.

Services: `db` (Postgres, data in the `pgdata` volume, not published to the host), `app`, and
`backup` (nightly `pg_dump` into `./backup`; old dumps are not pruned, so clear them occasionally).

## Local development

```bash
npm install
export DATABASE_URL=postgres://user:pass@localhost:5432/masterpop
npm run migrate
npm run dev
```

## Customising the rounds

Round names and maximum points live in `src/lib/rounds.ts`. Check them against the real show format.
Keys are stored in the database, so change labels freely but don't rename keys.

## Known limits

- No password reset yet. An admin would have to change the hash in the database.
- Login throttling is in memory and resets when the container restarts.
- Next.js currently pulls a build-time PostCSS advisory (`npm audit`); it only processes this repo's own CSS.
- The service worker exists only to make the app installable; it does not cache or work offline.
