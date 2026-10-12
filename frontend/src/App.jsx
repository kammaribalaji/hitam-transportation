import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './context/AuthContext.jsx'
import { useAuth } from './hooks/useAuth.js'

// Auth
import LoginPage from './pages/auth/LoginPage.jsx'
import TransportApplicationPage from './pages/public/TransportApplicationPage.jsx'

// Student pages
import StudentLayout from './components/layout/StudentLayout.jsx'
import StudentDashboard from './pages/student/StudentDashboard.jsx'
import BookSeatPage from './pages/student/BookSeatPage.jsx'
import PaymentPage from './pages/student/PaymentPage.jsx'
import MyPassPage from './pages/student/MyPassPage.jsx'
import LiveTrackingPage from './pages/student/LiveTrackingPage.jsx'
import WhereIsMyBusPage from './pages/student/WhereIsMyBusPage.jsx'
import BusResultsPage from './pages/student/BusResultsPage.jsx'
import ContactsPage from './pages/student/ContactsPage.jsx'
import NotificationsPage from './pages/student/NotificationsPage.jsx'
import StudentProfilePage from './pages/student/StudentProfilePage.jsx'
import ApplicationStatusPage from './pages/student/ApplicationStatusPage.jsx'

// Driver pages
import DriverLayout from './components/layout/DriverLayout.jsx'
import DriverDashboard from './pages/driver/DriverDashboard.jsx'
import MyTripsPage from './pages/driver/MyTripsPage.jsx'
import StudentListPage from './pages/driver/StudentListPage.jsx'
import QRScannerPage from './pages/driver/QRScannerPage.jsx'
import LiveNavigationPage from './pages/driver/LiveNavigationPage.jsx'
import VehicleStatusPage from './pages/driver/VehicleStatusPage.jsx'
import FuelLogPage from './pages/driver/FuelLogPage.jsx'
import ReportIssuePage from './pages/driver/ReportIssuePage.jsx'
import DriverNotificationsPage from './pages/driver/DriverNotificationsPage.jsx'
import DriverProfilePage from './pages/driver/DriverProfilePage.jsx'

// Admin pages
import AdminLayout from './components/layout/AdminLayout.jsx'
import AdminDashboard from './pages/admin/AdminDashboard.jsx'
import StudentsPage from './pages/admin/StudentsPage.jsx'
import DriversPage from './pages/admin/DriversPage.jsx'
import RoutesPage from './pages/admin/RoutesPage.jsx'
import BusesPage from './pages/admin/BusesPage.jsx'
import BookingsPage from './pages/admin/BookingsPage.jsx'
import PaymentsPage from './pages/admin/PaymentsPage.jsx'
import ComplaintsPage from './pages/admin/ComplaintsPage.jsx'
import ReportsPage from './pages/admin/ReportsPage.jsx'
import AnalyticsPage from './pages/admin/AnalyticsPage.jsx'
import AdminSettingsPage from './pages/admin/AdminSettingsPage.jsx'
import AnnouncementsPage from './pages/admin/AnnouncementsPage.jsx'
import ImportPage from './pages/admin/ImportPage.jsx'
import HypegpsDevicesPage from './pages/admin/HypegpsDevicesPage.jsx'
import ApplicationsPage from './pages/admin/ApplicationsPage.jsx'

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-[#F8FAFC]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-12 h-12 border-4 border-[#40A047] border-t-transparent rounded-full animate-spin" />
        <span className="text-[#40A047] font-semibold text-sm">Loading HITAM Transport...</span>
      </div>
    </div>
  )
  if (!user) return <Navigate to="/login" replace />
  const currentRole = String(user.role || 'STUDENT').toUpperCase()
  if (allowedRoles && !allowedRoles.map(r => r.toUpperCase()).includes(currentRole)) {
    if (currentRole === 'ADMIN') return <Navigate to="/admin" replace />
    if (currentRole === 'DRIVER') return <Navigate to="/driver" replace />
    return <Navigate to="/student" replace />
  }
  return children
}

function AppRoutes() {
  const { user } = useAuth()
  const role = String(user?.role || 'STUDENT').toUpperCase()
  const isPaid = Boolean(user?.transportFeePaid || user?.isPaidStudent)
  const appStatus = String(user?.applicationStatus || (isPaid ? 'APPROVED' : 'NOT_SUBMITTED')).toUpperCase()
  const isApproved = Boolean(user?.isApplicationApproved && (isPaid || appStatus === 'APPROVED'))

  let studentDestination = '/student'
  if (role === 'STUDENT') {
    if (isPaid) {
      studentDestination = '/student'
    } else if (appStatus === 'NOT_SUBMITTED' || (!user?.hasSubmittedApplication && appStatus !== 'PENDING' && appStatus !== 'APPROVED' && appStatus !== 'REJECTED')) {
      studentDestination = '/student/apply'
    } else if (isApproved) {
      studentDestination = '/student/find-bus'
    } else {
      studentDestination = '/student/application-status'
    }
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={
          !user ? (
            <LoginPage />
          ) : (
            <Navigate
              to={
                role === 'ADMIN'
                  ? '/admin'
                  : role === 'DRIVER'
                  ? '/driver'
                  : studentDestination
              }
              replace
            />
          )
        }
      />
      <Route path="/transport-application" element={<TransportApplicationPage />} />
      <Route path="/apply" element={user?.role === 'STUDENT' ? <Navigate to="/student/apply" replace /> : <TransportApplicationPage />} />
      <Route path="/application-status" element={<Navigate to="/student/application-status" replace />} />

      {/* Student Routes */}
      <Route path="/student" element={<ProtectedRoute allowedRoles={['STUDENT', 'STAFF']}><StudentLayout /></ProtectedRoute>}>
        <Route index element={<StudentDashboard />} />
        <Route path="apply" element={<TransportApplicationPage />} />
        <Route path="application-status" element={<ApplicationStatusPage />} />
        <Route path="status" element={<ApplicationStatusPage />} />
        <Route path="book-seat" element={<BookSeatPage />} />
        <Route path="payment" element={<PaymentPage />} />
        <Route path="my-pass" element={<MyPassPage />} />
        <Route path="find-bus" element={<WhereIsMyBusPage />} />
        <Route path="where-is-my-bus" element={<WhereIsMyBusPage />} />
        <Route path="bus-results" element={<BusResultsPage />} />
        <Route path="tracking" element={<LiveTrackingPage />} />
        <Route path="live-tracking" element={<LiveTrackingPage />} />
        <Route path="contacts" element={<ContactsPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="profile" element={<StudentProfilePage />} />
      </Route>

      {/* Driver Routes */}
      <Route path="/driver" element={<ProtectedRoute allowedRoles={['DRIVER']}><DriverLayout /></ProtectedRoute>}>
        <Route index element={<DriverDashboard />} />
        <Route path="trips" element={<MyTripsPage />} />
        <Route path="students" element={<StudentListPage />} />
        <Route path="scan-qr" element={<QRScannerPage />} />
        <Route path="navigation" element={<LiveNavigationPage />} />
        <Route path="vehicle" element={<VehicleStatusPage />} />
        <Route path="fuel" element={<FuelLogPage />} />
        <Route path="report-issue" element={<ReportIssuePage />} />
        <Route path="notifications" element={<DriverNotificationsPage />} />
        <Route path="profile" element={<DriverProfilePage />} />
      </Route>

      {/* Admin Routes */}
      <Route path="/admin" element={<ProtectedRoute allowedRoles={['ADMIN']}><AdminLayout /></ProtectedRoute>}>
        <Route index element={<AdminDashboard />} />
        <Route path="students" element={<StudentsPage />} />
        <Route path="applications" element={<ApplicationsPage />} />
        <Route path="drivers" element={<DriversPage />} />
        <Route path="routes" element={<RoutesPage />} />
        <Route path="import" element={<ImportPage />} />
        <Route path="buses" element={<BusesPage />} />
        <Route path="bookings" element={<BookingsPage />} />
        <Route path="payments" element={<PaymentsPage />} />
        <Route path="complaints" element={<ComplaintsPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="announcements" element={<AnnouncementsPage />} />
        <Route path="gps" element={<HypegpsDevicesPage />} />
        <Route path="settings" element={<AdminSettingsPage />} />
      </Route>

      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3500,
            style: { fontFamily: 'Inter', fontSize: '14px', borderRadius: '12px', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' },
            success: { iconTheme: { primary: '#40A047', secondary: '#fff' } },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  )
}


