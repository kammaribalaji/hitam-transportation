import React, { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../../hooks/useAuth.js'
import {
  LayoutDashboard, Armchair, CreditCard, QrCode, MapPin, Phone,
  Bell, User, LogOut, Menu, X, Bus, ChevronRight
} from 'lucide-react'

const navItems = [
  { to: '/student', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/student/book-seat', icon: Armchair, label: 'Book Seat' },
  { to: '/student/payment', icon: CreditCard, label: 'Payments' },
  { to: '/student/my-pass', icon: QrCode, label: 'My Pass' },
  { to: '/student/tracking', icon: MapPin, label: 'Live Tracking' },
  { to: '/student/contacts', icon: Phone, label: 'Contacts' },
  { to: '/student/notifications', icon: Bell, label: 'Notifications' },
  { to: '/student/profile', icon: User, label: 'Profile' },
]

export default function StudentLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleLogout = () => { logout(); navigate('/login') }

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
        {navItems.map(({ to, icon: Icon, label, end }) => (
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
