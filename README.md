# HITAM Transport — College Transport Management System

A web application for managing college transport: students book seats, track buses live, and manage passes; drivers run trips and scan QR passes; admins manage buses, routes, students, drivers, bookings, payments, and analytics.

## Tech Stack

| Layer     | Technology                              |
|-----------|-----------------------------------------|
| Frontend  | React, Vite, JavaScript, Tailwind CSS   |
| Backend   | Node.js, Express.js                     |
| Database  | MongoDB (Mongoose)                      |

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
│       └── utils/       # Helpers & map coordinates
└── backend/             # Express API
    └── src/
        ├── config/      # DB & JWT configuration
        ├── controllers/ # Route handlers
        ├── middlewares/ # Auth & error handling
        ├── models/      # Mongoose models
        ├── routes/      # API route definitions
        └── scripts/     # Database seed script
```

## Getting Started

### Prerequisites

- Node.js (18+)
- MongoDB running locally on `mongodb://127.0.0.1:27017` (or set `MONGODB_URI`)

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env   # then fill in JWT_SECRET (and MONGODB_URI if needed)
npm run dev            # or: npm start
```

The API runs on `http://localhost:5000` (health check: `GET /api/health`).

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

The app runs on `http://localhost:5173` and proxies `/api` requests to the backend.

### 3. Seed the database (optional)

```bash
cd backend
npm run seed
```

## Demo Accounts

| Role    | Roll Number | Password   |
|---------|-------------|------------|
| Admin   | `ADMIN001`  | `hitam123` |
| Student | `21CS1001`  | `hitam123` |
| Driver  | `DRV12345`  | `hitam123` |

## Environment Variables

See `backend/.env.example` for the required backend variables (`MONGODB_URI`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `PORT`, `CLIENT_URL`). Never commit real `.env` files.

## Production Build

```bash
cd frontend && npm run build   # outputs to frontend/dist
```
