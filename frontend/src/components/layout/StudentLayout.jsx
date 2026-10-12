import React, { useState } from 'react'
import { Outlet, NavLink, useNavigate, useLocation, Navigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../../hooks/useAuth.js'
import {
  LayoutDashboard, Armchair, CreditCard, QrCode, MapPin, Phone,
  Bell, User, LogOut, Menu, X, Bus, ChevronRight, Search, AlertCircle, FileText, Lock, PlusCircle
} from 'lucide-react'

const fullNavItems = [
  { to: '/student', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/student/find-bus', icon: Search, label: 'Where Is My Bus' },
  { to: '/student/tracking', icon: MapPin, label: 'Live Tracking' },
  { to: '/student/book-seat', icon: Armchair, label: 'Book Seat' },
  { to: '/student/payment', icon: CreditCard, label: 'Payments' },
  { to: '/student/my-pass', icon: QrCode, label: 'My Pass' },
  { to: '/student/application-status', icon: FileText, label: 'Application Status' },
  { to: '/student/contacts', icon: Phone, label: 'Contacts' },
  { to: '/student/notifications', icon: Bell, label: 'Notifications' },
  { to: '/student/profile', icon: User, label: 'Profile' },
]

export default function StudentLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleLogout = () => { logout(); navigate('/login') }

  const isPaid = Boolean(user?.transportFeePaid || user?.isPaidStudent)
  const appStatus = String(user?.applicationStatus || (isPaid ? 'APPROVED' : 'NOT_SUBMITTED')).toUpperCase()
  const isApproved = Boolean(user?.isApplicationApproved && (isPaid || appStatus === 'APPROVED'))
  const isAccountActive = user?.status?.toUpperCase() === 'ACTIVE'

  // =========================================================================
  // CASE 1: Student has NOT submitted a transport application (NOT_SUBMITTED)
  // Must show the application form, NEVER the application-status page!
  // =========================================================================
  if (!isPaid && (appStatus === 'NOT_SUBMITTED' || (!user?.hasSubmittedApplication && appStatus !== 'PENDING' && appStatus !== 'APPROVED' && appStatus !== 'REJECTED'))) {
    const allowedNotApplied = ['/student/apply', '/student/profile', '/student/contacts']
    const isAllowed = allowedNotApplied.some(p => location.pathname === p || location.pathname.startsWith(p))
    if (!isAllowed) {
      return <Navigate to="/student/apply" replace />
    }

    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
        {/* Header for Unapplied Student */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 sm:px-6 shadow-sm sticky top-0 z-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#40A047] rounded-xl flex items-center justify-center shrink-0 shadow-sm">
              <Bus size={22} className="text-white" />
            </div>
            <div>
              <p className="font-black text-gray-900 text-sm leading-tight tracking-tight">HITAM TRANSPORT</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[11px] font-bold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                  Application Required · NOT_SUBMITTED
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:block text-right">
              <p className="text-xs font-bold text-gray-800">{user?.name}</p>
              <p className="text-[11px] font-mono text-gray-500">{user?.rollNumber}</p>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 border border-red-200 transition-all cursor-pointer"
            >
              <LogOut size={14} />
              <span>Logout</span>
            </button>
          </div>
        </header>

        {/* Informative Banner */}
        <div className="bg-amber-50/80 border-b border-amber-200 px-4 py-2.5 text-center">
          <p className="text-xs font-medium text-amber-900 max-w-4xl mx-auto flex items-center justify-center gap-2">
            <AlertCircle size={15} className="text-amber-600 shrink-0" />
            <span>
              Welcome! Please complete and submit the official transport application form below to request bus routes and boarding points.
            </span>
          </p>
        </div>

        {/* Navigation Bar for Unapplied Student */}
        <div className="bg-white border-b border-gray-200 px-4 py-2">
          <div className="max-w-6xl mx-auto flex items-center justify-center sm:justify-start gap-3">
            <NavLink
              to="/student/apply"
              className={({ isActive }) => `flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                isActive ? 'bg-[#40A047] text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <PlusCircle size={14} />
              <span>Application Form</span>
            </NavLink>
            <NavLink
              to="/student/contacts"
              className={({ isActive }) => `flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                isActive ? 'bg-[#40A047] text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Phone size={14} />
              <span>Transport Contacts</span>
            </NavLink>
            <NavLink
              to="/student/profile"
              className={({ isActive }) => `flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                isActive ? 'bg-[#40A047] text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <User size={14} />
              <span>My Profile</span>
            </NavLink>
          </div>
        </div>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    )
  }

  // =========================================================================
  // CASE 2 & 3: Student has a PENDING or REJECTED application
  // Only status page is accessible; Find My Bus and form are blocked!
  // =========================================================================
  if (!isApproved) {
    const isPending = appStatus === 'PENDING' || appStatus === 'UNDER_REVIEW'
    const isRejected = appStatus === 'REJECTED'

    const allowedUnapproved = [
      '/student/application-status',
      '/student/status',
      '/student/contacts',
      '/student/profile',
    ]
    const isAllowed = allowedUnapproved.some(p => location.pathname === p || location.pathname.startsWith(p))
    if (!isAllowed) {
      return <Navigate to="/student/application-status" replace />
    }

    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
        {/* Header for Pending/Rejected Applicant */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 sm:px-6 shadow-sm sticky top-0 z-50">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
              isRejected ? 'bg-red-600' : 'bg-amber-500'
            }`}>
              <Bus size={22} className="text-white" />
            </div>
            <div>
              <p className="font-black text-gray-900 text-sm leading-tight tracking-tight">HITAM TRANSPORT</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                  isRejected
                    ? 'text-red-700 bg-red-50 border-red-200'
                    : 'text-amber-700 bg-amber-50 border-amber-200'
                }`}>
                  {isRejected ? 'Application Rejected' : 'Awaiting Admin Approval (PENDING)'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:block text-right">
              <p className="text-xs font-bold text-gray-800">{user?.name}</p>
              <p className="text-[11px] font-mono text-gray-500">{user?.rollNumber}</p>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 border border-red-200 transition-all cursor-pointer"
            >
              <LogOut size={14} />
              <span>Logout</span>
            </button>
          </div>
        </header>

        {/* Notice Banner */}
        <div className={`border-b px-4 py-2.5 text-center ${
          isRejected ? 'bg-red-50 border-red-200 text-red-900' : 'bg-amber-50 border-amber-200 text-amber-900'
        }`}>
          <p className="text-xs font-medium max-w-4xl mx-auto flex items-center justify-center gap-2">
            <AlertCircle size={15} className={`shrink-0 ${isRejected ? 'text-red-600' : 'text-amber-600'}`} />
            <span>
              {isRejected
                ? 'Your transport application was rejected by the Transport Office. Please check the rejection reason below.'
                : 'Your transport application is awaiting admin approval. You will be able to search for buses after approval.'}
            </span>
          </p>
        </div>

        {/* Navigation Bar */}
        <div className="bg-white border-b border-gray-200 px-4 py-2">
          <div className="max-w-6xl mx-auto flex items-center justify-center sm:justify-start gap-3">
            <NavLink
              to="/student/application-status"
              className={({ isActive }) => `flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                isActive ? 'bg-[#40A047] text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <FileText size={14} />
              <span>Application Status</span>
            </NavLink>
            <NavLink
              to="/student/contacts"
              className={({ isActive }) => `flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                isActive ? 'bg-[#40A047] text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Phone size={14} />
              <span>Contacts</span>
            </NavLink>
            <NavLink
              to="/student/profile"
              className={({ isActive }) => `flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                isActive ? 'bg-[#40A047] text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <User size={14} />
              <span>Profile</span>
            </NavLink>
          </div>
        </div>

        {/* Outlet Content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    )
  }

  // =========================================================================
  // CASE 4: APPROVED, ACTIVATED, BUT UNPAID
  // Find My Bus and Booking/Payment flows are accessible; Full dashboard blocked until paid!
  // =========================================================================
  if (!isPaid) {
    const allowedPrefixes = [
      '/student/find-bus',
      '/student/where-is-my-bus',
      '/student/bus-results',
      '/student/payment',
      '/student/book-seat',
      '/student/application-status',
      '/student/status',
      '/student/contacts',
      '/student/notifications',
      '/student/profile',
    ]
    const isAllowed = allowedPrefixes.some(p => location.pathname === p || location.pathname.startsWith(p))
    if (!isAllowed) {
      return <Navigate to="/student/find-bus" replace />
    }

    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
        {/* Focused Header for Restricted Experience */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 sm:px-6 shadow-sm sticky top-0 z-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#40A047] rounded-xl flex items-center justify-center shrink-0 shadow-sm">
              <Bus size={22} className="text-white" />
            </div>
            <div>
              <p className="font-black text-gray-900 text-sm leading-tight tracking-tight">HITAM TRANSPORT</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                  Approved · Payment Required
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:block text-right">
              <p className="text-xs font-bold text-gray-800">{user?.name}</p>
              <p className="text-[11px] font-mono text-gray-500">{user?.rollNumber}</p>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 border border-red-200 transition-all cursor-pointer"
            >
              <LogOut size={14} />
              <span>Logout</span>
            </button>
          </div>
        </header>

        {/* Notice Banner */}
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 text-center">
          <p className="text-xs font-medium text-amber-800 max-w-4xl mx-auto">
            👋 Welcome, <b>{user?.name}</b>! Your transport application has been approved. Find your bus route below and complete your transport fee payment to unlock your digital bus pass, real-time live tracking, and complete dashboard.
          </p>
        </div>

        {/* Navigation Bar for Approved Unpaid Student */}
        <div className="bg-white border-b border-gray-200 px-4 py-2">
          <div className="max-w-6xl mx-auto flex items-center overflow-x-auto gap-2">
            <NavLink
              to="/student/find-bus"
              className={({ isActive }) => `flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                isActive ? 'bg-[#40A047] text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Search size={14} />
              <span>Where Is My Bus</span>
            </NavLink>
            <NavLink
              to="/student/book-seat"
              className={({ isActive }) => `flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                isActive ? 'bg-[#40A047] text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Armchair size={14} />
              <span>Book Seat</span>
            </NavLink>
            <NavLink
              to="/student/payment"
              className={({ isActive }) => `flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                isActive ? 'bg-[#40A047] text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <CreditCard size={14} />
              <span>Payment</span>
            </NavLink>
            <NavLink
              to="/student/application-status"
              className={({ isActive }) => `flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                isActive ? 'bg-[#40A047] text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <FileText size={14} />
              <span>Application Status</span>
            </NavLink>
            <NavLink
              to="/student/contacts"
              className={({ isActive }) => `flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                isActive ? 'bg-[#40A047] text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Phone size={14} />
              <span>Contacts</span>
            </NavLink>
            <NavLink
              to="/student/profile"
              className={({ isActive }) => `flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                isActive ? 'bg-[#40A047] text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <User size={14} />
              <span>Profile</span>
            </NavLink>
          </div>
        </div>

        {/* Outlet Content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    )
  }

  // =========================================================================
  // CASE 5: FULL PAID STUDENT
  // Retains existing complete student dashboard, live tracking, and digital QR pass
  // =========================================================================
  if (location.pathname === '/student/apply') {
    return <Navigate to="/student" replace />
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#40A047] rounded-xl flex items-center justify-center flex-shrink-0">
            <Bus size={22} className="text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-tight">COLLEGE</p>
            <p className="text-green-400 text-xs font-medium">TRANSPORT SYSTEM</p>
          </div>
        </div>
      </div>

      {/* User info */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#40A047] rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
            {user?.avatarInitial || user?.name?.[0] || 'S'}
          </div>
          <div className="min-w-0">
            <p className="text-white text-sm font-semibold truncate">{user?.name}</p>
            <p className="text-green-400 text-xs truncate">{user?.department} · {user?.year}</p>
            <p className="text-gray-400 text-xs">{user?.rollNumber}</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
        {fullNavItems.map(({ to, icon: Icon, label, end }) => (
          <NavLink key={to} to={to} end={end} onClick={() => setSidebarOpen(false)}
            className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${isActive ? 'bg-[#40A047] text-white shadow-lg shadow-green-900/20' : 'text-gray-300 hover:bg-white/10 hover:text-white'}`}>
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-white/10">
        <button onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-gray-300 hover:bg-red-500/20 hover:text-red-400 transition-all">
          <LogOut size={18} />
          Logout
        </button>
        <p className="text-center text-gray-600 text-xs mt-3">© 2026 College Transport</p>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen bg-[#F8FAFC] overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-60 flex-shrink-0 bg-[#1a2e1a]">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
            <motion.aside initial={{ x: -240 }} animate={{ x: 0 }} exit={{ x: -240 }} transition={{ type: 'tween', duration: 0.25 }}
              className="fixed top-0 left-0 h-full w-60 bg-[#1a2e1a] z-50 flex flex-col lg:hidden">
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="h-14 bg-white border-b border-gray-100 flex items-center justify-between px-4 flex-shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors">
              <Menu size={20} className="text-gray-600" />
            </button>
            <span className="text-sm text-gray-400 hidden sm:block">Student Portal</span>
          </div>
          <div className="flex items-center gap-2">
            {user?.transportFeePaid && (
              <span className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-700 text-xs font-semibold rounded-full border border-green-200">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                Transport Fee: Paid
              </span>
            )}
            <NavLink to="/student/notifications" className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors">
              <Bell size={19} className="text-gray-600" />
            </NavLink>
            <NavLink to="/student/profile" className="w-8 h-8 bg-[#40A047] rounded-full flex items-center justify-center text-white text-sm font-bold">
              {user?.avatarInitial || user?.name?.[0] || 'S'}
            </NavLink>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-6 max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
