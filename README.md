# Masterpop

A private companion app for scoring Popmaster (Greatest Hits Radio, weekdays 10am-1pm).
Listen however you like, then enter your round scores here, see your history and compare with friends.

- Next.js 15 (App Router, TypeScript), installable as a PWA
- Postgres 16 in Docker, plain SQL migrations (`migrations/`) applied automatically on start
- Own login: scrypt password hashes, server-side sessions in an httpOnly cookie, invite-only sign-up
- The first account created on an empty database becomes admin and needs no invite code. After that, admins create invite codes on the Invites page.

## Run with Docker

GitHub Actions builds the image on every push to `main` and publishes it to
`ghcr.io/andycqos74/masterpop:latest`, so the server only pulls it.

```bash
cp .env.example .env      # then set a long random POSTGRES_PASSWORD
docker compose pull
docker compose up -d
```

The package is private by default. Either make it public (GitHub profile > Packages > masterpop >
Package settings > Change visibility) or log the server in once with a token that has `read:packages`:
`docker login ghcr.io -u andycqos74`.

To build locally instead, run `docker build -t ghcr.io/andycqos74/masterpop:latest .` first.
In Dockge, redeploy after each push to pull the new image.

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

## Scoring format

Each weekday has two Popmaster games (Round 1 and Round 2). Each game is three sets of
[question 3 pts, question 3 pts, bonus 6 pts] plus a final question worth 3 pts, so the
maximum is 3 x 12 + 3 = 39. On the score screen you tap each question you got right.

The format is defined in `src/lib/rounds.ts`. Question keys are stored in the database, so change
labels freely but don't rename keys.

## Known limits

- No password reset yet. An admin would have to change the hash in the database.
- Login throttling is in memory and resets when the container restarts.
- Next.js currently pulls a build-time PostCSS advisory (`npm audit`); it only processes this repo's own CSS.
- The service worker exists only to make the app installable; it does not cache or work offline.
