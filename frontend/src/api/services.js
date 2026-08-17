import api from './axios.js'

// Auth
export const authService = {
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
  changePassword: (data) => api.put('/auth/change-password', data),
}

// Users
export const userService = {
  getAll: (params) => api.get('/users', { params }),
  getByRoll: (roll) => api.get(`/users/${roll}`),
  create: (data) => api.post('/users', data),
  update: (roll, data) => api.put(`/users/${roll}`, data),
  delete: (roll) => api.delete(`/users/${roll}`),
  updateProfile: (data) => api.put('/users/profile', data),
}

// Routes
export const routeService = {
  getAll: () => api.get('/routes'),
  getById: (id) => api.get(`/routes/${id}`),
  getStops: (id) => api.get(`/routes/${id}/stops`),
  createStop: (id, data) => api.post(`/routes/${id}/stops`, data),
  deleteStop: (id, stopId) => api.delete(`/routes/${id}/stops/${stopId}`),
  create: (data) => api.post('/routes', data),
  update: (id, data) => api.put(`/routes/${id}`, data),
  delete: (id) => api.delete(`/routes/${id}`),
}

// Buses
export const busService = {
  getAll: (params) => api.get('/buses', { params }),
  getByNumber: (num) => api.get(`/buses/${num}`),
  create: (data) => api.post('/buses', data),
  update: (num, data) => api.put(`/buses/${num}`, data),
  delete: (num) => api.delete(`/buses/${num}`),
}

// Bookings
export const bookingService = {
  getAll: (params) => api.get('/bookings', { params }),
  getMy: () => api.get('/bookings/my'),
  create: (data) => api.post('/bookings', data),
  cancel: (id) => api.put(`/bookings/${id}/cancel`),
  remove: (id) => api.delete(`/bookings/${id}`),
}

// Seats
export const seatService = {
  getByRoute: (routeId) => api.get(`/seats/${routeId}`),
}

// Trips
export const tripService = {
  getAll: (params) => api.get('/trips', { params }),
  getMy: () => api.get('/trips/my'),
  getCurrent: () => api.get('/trips/current'),
  getById: (id) => api.get(`/trips/${id}`),
  getSeats: (id) => api.get(`/trips/${id}/seats`),
  create: (data) => api.post('/trips', data),
  updateStatus: (id, status) => api.put(`/trips/${id}/status`, { status }),
}

// Notifications
export const notificationService = {
  getAll: (params) => api.get('/notifications', { params }),
  markAllRead: () => api.put('/notifications/mark-all-read'),
  create: (data) => api.post('/notifications', data),
}

// Complaints
export const complaintService = {
  getAll: (params) => api.get('/complaints', { params }),
  create: (data) => api.post('/complaints', data),
  updateStatus: (id, status) => api.put(`/complaints/${id}/status`, { status }),
}

// Issues
export const issueService = {
  getAll: (params) => api.get('/issues', { params }),
  create: (data) => api.post('/issues', data),
  updateStatus: (id, status) => api.put(`/issues/${id}/status`, { status }),
}

// Contacts
export const contactService = {
  getAll: () => api.get('/contacts'),
  create: (data) => api.post('/contacts', data),
  update: (id, data) => api.put(`/contacts/${id}`, data),
  delete: (id) => api.delete(`/contacts/${id}`),
}

// Passengers
export const passengerService = {
  getByRoute: (params) => api.get('/passengers', { params }),
  markAttendance: (data) => api.put('/passengers/attendance', data),
  scanQR: (qrData) => api.post('/passengers/scan-qr', { qrData }),
}

// Settings
export const settingsService = {
  get: () => api.get('/settings'),
  update: (data) => api.put('/settings', data),
}

// Analytics
export const analyticsService = {
  getDashboard: () => api.get('/analytics/dashboard'),
  getRevenue: () => api.get('/analytics/revenue'),
}

// Live Location
export const liveLocationService = {
  upsertMy: (data) => api.put('/live-location/my', data),
  getByRoute: (routeId) => api.get(`/live-location/route/${routeId}`),
  getByBus: (busNumber) => api.get(`/live-location/bus/${encodeURIComponent(busNumber)}`),
}

// Payments
export const paymentService = {
  getAll: (params) => api.get('/payments', { params }),
  getMy: () => api.get('/payments/my'),
  create: (data) => api.post('/payments', data),
  updateStatus: (paymentId, status) => api.put(`/payments/${paymentId}/status`, { status }),
}

// Trip-scoped tracking
export const trackingService = {
  getByTrip: (tripId) => api.get(`/tracking/${tripId}`),
  postLocation: (tripId, data) => api.post(`/tracking/${tripId}/location`, data),
}

// Students — real records from the Route 12 sheet (PostgreSQL)
export const studentService = {
  getAll: (params) => api.get('/students', { params }),
  getByRoll: (roll) => api.get(`/students/${roll}`),
  getMe: () => api.get('/students/me'),
}

// Digital pass (derived from the actual booking record)
export const passService = {
  getMy: () => api.get('/pass/my'),
}

// Admin CSV import (Route 12 sheet)
export const importService = {
  route12: (csv) => api.post('/import/route12', { csv }),
}

// HypeGPS tracker status + device mappings (admin only — the API hash never leaves the backend)
export const hypegpsService = {
  getDevices: () => api.get('/hypegps/devices'),
  getMappings: () => api.get('/hypegps/mappings'),
  createMapping: (data) => api.post('/hypegps/mappings', data),
  updateMapping: (id, data) => api.put(`/hypegps/mappings/${id}`, data),
  deleteMapping: (id) => api.delete(`/hypegps/mappings/${id}`),
}
