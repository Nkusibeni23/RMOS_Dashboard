# RMSoft OS Dashboard

Next.js admin UI for the RMSoft OS backend. Manage enrolled devices: track them on a live map, run anti-theft actions (lock, wipe, locate, ring), and control kiosk / fleet policies remotely.

## Stack

- Next.js 14 (App Router) + TypeScript + Tailwind
- Leaflet + OpenStreetMap (no Google Maps API key needed)
- Talks to the `rmsoft-server` REST API

## Quick start

```bash
# 1. install
cd rmsoft-dashboard
npm install

# 2. point at the API
cp .env.local.example .env.local
# default points at http://localhost:3000 — change if your server runs elsewhere

# 3. run
npm run dev
# → http://localhost:3001
```

The default seeded admin (`admin@rmsoft.rw / changeme123`) is pre-filled in the login form for fast dev testing. Clear it before shipping to production. The password field has a show/hide (eye) toggle.

## Pages

| Path           | Purpose                                                                         |
| -------------- | ------------------------------------------------------------------------------- |
| `/login`       | Sign in or register (email must end with `@rmsoft.rw`)                          |
| `/devices`     | Fleet list — status, online/battery, alert badges; live-polls every 5s; delete  |
| `/devices/:id` | One device — alert banner, map, actions, kiosk controls, telemetry, command log |

## Device detail

The detail page polls every 5 seconds (replace with WebSocket / SSE later).

### Anti-theft actions

- **Locate now** — `LOCATE_NOW` — force a GPS ping
- **Ring loud** — `RING` — plays alarm even on silent
- **Lock screen** — `LOCK` — lock immediately, optional message
- **Unlock** — `UNLOCK`
- **Show message** — `MESSAGE` — push a banner to the lock screen
- **Set owner** — `SET_OWNER` — name/contact shown on the lock screen
- **Wipe** — `WIPE` — factory reset, with a typed-confirmation modal (data only, or everything: data + SD + eSIM + FRP)

`LOCK` and `WIPE` flip device status to `LOST`. Click **Mark found** to reset to `ACTIVE`.

### Kiosk & fleet control (`KioskPanel`)

Enter/exit kiosk, toggle camera / status bar / keyguard, set app whitelist, hide/enable apps, install/update APKs, reboot, and reapply policies — via `ENTER_KIOSK`, `EXIT_KIOSK`, `SET_CAMERA_DISABLED`, `SET_STATUS_BAR_DISABLED`, `SET_KEYGUARD_DISABLED`, `SET_WHITELIST`, `SET_APP_HIDDEN`, `ENABLE_SYSTEM_APP`, `INSTALL_APK`, `UPDATE_APP`, `REBOOT`, `REAPPLY_POLICIES`.

### Telemetry & alerts

Live heartbeat data (battery, kiosk/camera/status-bar/keyguard state) renders in `DeviceTelemetry`. Anti-theft events (`SIM_SWAP`, `TAMPER`, …) surface as a red banner on the detail page and a badge on the fleet card.

## Auth

Access tokens are stored in `localStorage` under `rmsoft.accessToken`; the signed-in user is cached under `rmsoft.user`. Refresh tokens aren't used yet — sessions last `JWT_ACCESS_TTL_SEC` (15 min default). A `401` from any call clears the session and bounces to `/login`.

> **Security note:** `localStorage` tokens are readable by any script on the page (XSS risk). Move to an `httpOnly` cookie before deploying, and remove the pre-filled dev credentials from the login form.

## UI

Light theme with a hairline-grid background (no heavy gradients). Shared primitives live in `globals.css` as `.card`, `.input`, and `.btn-primary`; toast notifications come from the `Toast` provider wrapping the app in `layout.tsx`.

## TODO

- [ ] WebSocket / SSE instead of polling
- [ ] Refresh-token rotation + `httpOnly` cookie storage
- [ ] Admin user management page
- [ ] Audit log page
- [ ] i18n
