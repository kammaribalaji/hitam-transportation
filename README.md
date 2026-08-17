# HITAM Transport — College Transport Management System

A full-stack web application for managing college transport: students book seats, pay fees, track buses live, and manage digital passes; drivers run trips and verify passengers; admins manage routes, buses, students, bookings, payments, and analytics.

## Tech Stack

| Layer     | Technology                            |
|-----------|---------------------------------------|
| Frontend  | React, Vite, JavaScript, Tailwind CSS, Leaflet |
| Backend   | Node.js, Express.js, Prisma ORM       |
| Database  | PostgreSQL (single source of truth)   |
| Auth      | JWT (STUDENT / DRIVER / ADMIN / STAFF)|

## Project Structure

```
hitam-transport/
├── frontend/            # React web app (Vite)
│   └── src/
│       ├── api/         # Axios client & API services
│       ├── components/  # Shared + layout components
│       ├── context/     # React context (auth)
│       ├── hooks/       # Custom hooks
│       ├── pages/       # student/ driver/ admin/ auth pages
│       └── utils/       # Pure helpers (no business data)
└── backend/             # Express + Prisma API
    ├── prisma/
    │   ├── schema.prisma        # Models + indexes + constraints
    │   ├── route12-data.js      # *** Route 12 sheet data — THE ONLY place demo data lives ***
    │   ├── seed.js              # Loads route12-data.js into PostgreSQL
    │   └── migrations/          # SQL migrations
    └── src/
        ├── config/      # JWT config
        ├── controllers/ # Route handlers
        ├── lib/         # Prisma client, serializers, payment-status derivation
        ├── middlewares/ # Auth & error handling (Prisma error mapping)
        └── routes/      # API route definitions
```

## Route 12 sheet data

Student records are imported **only** from `backend/prisma/route12-data.js`
(the `PASSENGERS` array), which mirrors the supplied Route 12 transport sheet:

`S.No | Date | Roll No | Name | Year | Boarding Point | Route No | Amount | Paid | Balance | Seat No | Bus Pass Status`

- **42 records** are imported exactly (1 STAFF + 41 STUDENT) — roll numbers,
  names, years, boarding points, seat numbers and amount/paid/balance values
  are never invented.
- Seat numbers are the **actual sheet seat numbers**, not a sequential 1–42
  assignment. The sheet itself contains two quirks that are preserved exactly:
  seat 31 is assigned to **two** students (MUPPA RAHUL & JELLA PRAVEEN), and
  VEMU ABHISHEK is on `WAITLIST1` (stored as seat 0 internally; the label is
  kept in the QR data). The partial unique index that blocked duplicate seats
  was removed in migration `20260812140000_relax_booking_seat_unique`.
- Route 12 has **13 stops** (Sangareddy Old Bus Stand → HITAM College), fee
  **₹42,900**, and faculty incharge **DEEPIKA**.
- Payment status is **derived** from the sheet values at runtime:
  `balance = 0 → PAID`, `paid > 0 → PARTIALLY PAID`, `paid = 0 → UNPAID`.
- Occupied / available seat counts are always **calculated** from the database
  (`bus.capacity − active bookings`), never hardcoded in the frontend.
  `route.bookedSeats` counts the 42 active bookings; the physical seat map
  shows the 40 uniquely-assigned seats as occupied and 10 free.
- Revenue analytics sum the actual paid amounts from PostgreSQL (₹42,900 per
  student) — nothing is hardcoded.
- All seeded users share the password `hitam123`.

## Getting Started

### Prerequisites

- Node.js (18+)
- PostgreSQL running locally (default port 5432)

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env          # set DATABASE_URL + JWT_SECRET
npx prisma migrate dev        # create tables
npm run seed                  # load Route 12 demo data from route12-data.js
npm run dev                   # API on http://localhost:5000
```

Health check: `GET /api/health`.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

The app runs on `http://localhost:5173` and proxies `/api` requests to the backend.

## Demo Accounts (password: `hitam123`)

| Role   | Roll Number | Notes                                    |
|--------|-------------|------------------------------------------|
| Admin  | `ADMIN001`  | Dashboard, payments, reports             |
| Driver | `DRV12345`  | RAJU · 9490717770 · Route 12             |
| Student| *(any roll no from the Route 12 sheet)* | Students log in with their **actual sheet roll numbers** |

## Environment Variables

See `backend/.env.example` (`DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `PORT`, `CLIENT_URL`).
The frontend uses the Vite `/api` proxy (`VITE_API_URL` optional). Never commit real `.env` files.

### Live GPS tracking (HypeGPS)

Bus positions come from physical GPS trackers via the HypeGPS platform — never
from simulation or the browser. Server-only environment variables:

| Variable | Purpose |
|---|---|
| `HYPEGPS_API_URL` | HypeGPS endpoint (`https://platform.hypegps.com/api/get_devices`) |
| `HYPEGPS_API_HASH` | API key — **never expose to the frontend** |
| `HYPEGPS_HITAM_GROUP` | Optional group filter for devices |
| `HYPEGPS_CACHE_TTL_SECONDS` | Backend cache between provider calls (default `5`) |
| `HYPEGPS_STALE_SECONDS` | After this, a fix is marked stale (default `120`) |

Flow: `GPS tracker → HypeGPS → backend (/api/live-location/route/:id) → React → Leaflet`.
The Route → device mapping lives in the PostgreSQL `GpsDevice` table (seeded for
Route 12 → device `1368`; manage it under Admin → GPS Tracking). If HypeGPS is
unavailable the UI shows GPS/API error or stale status — coordinates are never
fabricated.

## Deploying to Render (one-click)

A [`render.yaml`](./render.yaml) Blueprint at the repo root provisions the whole
stack: a free PostgreSQL database, the Express API, and the React static site
(which proxies `/api/*` to the API, so no CORS setup is needed).

1. Push this repo to GitHub.
2. Go to [render.com](https://render.com) → **New** → **Blueprint** → select the repo.
3. When prompted, enter your **HypeGPS API hash** (`HYPEGPS_API_HASH`) — it's a
   secret, so it is never stored in this repo.
4. Click **Apply**. Render then:
   - creates the Postgres database and wires `DATABASE_URL` to the API,
   - runs `npx prisma migrate deploy` (schema migrations),
   - runs `npm run seed` once (loads the Route 12 demo data),
   - deploys the API at `https://hitam-transport-api.onrender.com` and the site
     at `https://hitam-transport-web.onrender.com`.

Post-deploy checks:
- `GET https://hitam-transport-api.onrender.com/api/health` → `{"status":"ok"}`
- Log in with `ADMIN001` / `hitam123` (or any Route 12 student roll number).

Free-tier caveats:
- Services **spin down after 15 minutes of inactivity**; the first request after
  idle takes ~30–60 s to wake up.
- Free Postgres databases are **deleted after 90 days** — export/upgrade before then.
- If a service subdomain is already taken (Render appends a suffix), update
  `CLIENT_URL` on the API and the `/api/*` rewrite destination on the web site
  in the Render dashboard.

## Production Build

```bash
cd frontend && npm run build   # outputs to frontend/dist
```
