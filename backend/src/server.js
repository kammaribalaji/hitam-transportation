import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import prisma from './lib/prisma.js';
import { errorHandler } from './middlewares/errorHandler.js';

import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import routeRoutes from './routes/routes.js';
import busRoutes from './routes/buses.js';
import bookingRoutes from './routes/bookings.js';
import seatRoutes from './routes/seats.js';
import tripRoutes from './routes/trips.js';
import notificationRoutes from './routes/notifications.js';
import complaintRoutes from './routes/complaints.js';
import issueRoutes from './routes/issues.js';
import contactRoutes from './routes/contacts.js';
import passengerRoutes from './routes/passengers.js';
import settingsRoutes from './routes/settings.js';
import analyticsRoutes from './routes/analytics.js';
import liveLocationRoutes from './routes/live-location.js';
import paymentRoutes from './routes/payments.js';
import trackingRoutes from './routes/tracking.js';
import hypegpsRoutes from './routes/hypegps.js';
import studentRoutes from './routes/students.js';
import passRoutes from './routes/pass.js';
import importRoutes from './routes/import.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load backend/.env in local development
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();

// Tolerant CORS configuration for Vercel, localhost, and custom domains
const allowedOrigin = process.env.CLIENT_URL;
app.use(
  cors({
    origin: allowedOrigin ? [allowedOrigin, 'http://localhost:5173', /\.vercel\.app$/] : true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(express.json());
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// Connect to DB
prisma.$connect()
  .then(() => console.log('PostgreSQL connected'))
  .catch((err) => {
    console.error('DB connection warning:', err.message);
  });

// Register all routes for both /api/* and root /* to prevent 404s
const registerRoutes = (prefix = '') => {
  app.use(`${prefix}/auth`, authRoutes);
  app.use(`${prefix}/users`, userRoutes);
  app.use(`${prefix}/routes`, routeRoutes);
  app.use(`${prefix}/buses`, busRoutes);
  app.use(`${prefix}/bookings`, bookingRoutes);
  app.use(`${prefix}/seats`, seatRoutes);
  app.use(`${prefix}/trips`, tripRoutes);
  app.use(`${prefix}/notifications`, notificationRoutes);
  app.use(`${prefix}/complaints`, complaintRoutes);
  app.use(`${prefix}/issues`, issueRoutes);
  app.use(`${prefix}/contacts`, contactRoutes);
  app.use(`${prefix}/passengers`, passengerRoutes);
  app.use(`${prefix}/settings`, settingsRoutes);
  app.use(`${prefix}/analytics`, analyticsRoutes);
  app.use(`${prefix}/live-location`, liveLocationRoutes);
  app.use(`${prefix}/payments`, paymentRoutes);
  app.use(`${prefix}/tracking`, trackingRoutes);
  app.use(`${prefix}/hypegps`, hypegpsRoutes);
  app.use(`${prefix}/students`, studentRoutes);
  app.use(`${prefix}/pass`, passRoutes);
  app.use(`${prefix}/import`, importRoutes);
  app.get(`${prefix}/health`, (req, res) =>
    res.json({ status: 'ok', serverless: Boolean(process.env.VERCEL), timestamp: new Date().toISOString() })
  );
};

// 1. Standard /api prefix
registerRoutes('/api');

// 2. Direct root prefix (fallback)
registerRoutes('');

// Root status endpoint
app.get('/', (req, res) =>
  res.json({
    message: 'HITAM Transport Management System API is running',
    status: 'ok',
    serverless: Boolean(process.env.VERCEL),
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      routes: '/api/routes',
      bookings: '/api/bookings',
      passengers: '/api/passengers',
    },
  })
);

app.use(errorHandler);

// Only listen on port if not running in Vercel serverless environment
if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`HITAM Transport API running on port ${PORT}`));
}

export default app;
