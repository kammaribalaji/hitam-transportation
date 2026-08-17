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

// Load backend/.env regardless of which directory the server is started from.
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Fail fast if JWT_SECRET is missing — otherwise login and every protected route
// fail with an obscure 500 error instead of a clear startup message.
if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET is not set. Create backend/.env (see backend/.env.example).');
  process.exit(1);
}

// Fail fast if the PostgreSQL connection string is missing.
if (!process.env.DATABASE_URL) {
  console.error('FATAL: DATABASE_URL is not set. Create backend/.env (see backend/.env.example).');
  process.exit(1);
}

const app = express();

prisma.$connect()
  .then(() => console.log('PostgreSQL connected'))
  .catch((err) => {
    console.error('DB connection failed:', err.message);
  });

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use(morgan('dev'));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/routes', routeRoutes);
app.use('/api/buses', busRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/seats', seatRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/issues', issueRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/passengers', passengerRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/live-location', liveLocationRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/tracking', trackingRoutes);
app.use('/api/hypegps', hypegpsRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/pass', passRoutes);
app.use('/api/import', importRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`HITAM Transport API running on port ${PORT}`));

export default app;
