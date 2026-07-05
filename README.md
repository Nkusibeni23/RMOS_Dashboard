# RMSoft OS Dashboard

Next.js admin UI for the RMSoft OS backend. Sees enrolled Pixel 8 devices on a map, sends MDM commands (lock, wipe, locate, ring, message).

## Stack

- Next.js 14 (App Router) + TypeScript + Tailwind
- Leaflet + OpenStreetMap (no Google Maps API key needed)
- Talks to the `rmsoft-server` REST API

## Quick start

```bash
# 1. install
cd /Volumes/nkusi/rmsoft-dashboard
npm install

# 2. point at the API
cp .env.local.example .env.local
# default points at http://localhost:3000 — change if your server runs elsewhere

# 3. run
npm run dev
# → http://localhost:3001
```

The default seeded admin (`admin@rmsoft.rw / changeme123`) is pre-filled in the login form for fast dev testing.

## Pages

| Path                | Purpose                                                            |
| ------------------- | ------------------------------------------------------------------ |
| `/login`            | Sign in or register (email must end with `@rmsoft.rw`)             |
| `/devices`          | List of enrolled phones                                            |
| `/devices/:id`      | One phone — map of locations, command buttons, command history    |

## Issuing commands

The detail page polls every 5 seconds (replace with WebSocket / SSE later). Buttons:

- **Locate now** — `LOCATE_NOW` — force a GPS ping
- **Ring loud** — `RING` — plays alarm even on silent
- **Lock screen** — `LOCK` — lock immediately, optional message
- **Unlock** — `UNLOCK`
- **Show message** — `MESSAGE` — push a banner to the lock screen
- **WIPE phone** — `WIPE` — factory reset (confirms first)

`LOCK` and `WIPE` automatically flip device status to `LOST`. Click **Mark found** to reset to `ACTIVE`.

## Auth

Access tokens are stored in `localStorage` under `rmsoft.accessToken`. Refresh tokens aren't used yet — sessions last `JWT_ACCESS_TTL_SEC` (15 min default). Add refresh handling before deploying.

## TODO

- [ ] WebSocket / SSE instead of polling
- [ ] Refresh-token rotation
- [ ] Admin user management page
- [ ] Audit log page
- [ ] i18n
