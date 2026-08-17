import React, { useState } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../../hooks/useAuth.js'
import {
  LayoutDashboard, Users, UserCheck, Route, Bus, BookOpen,
  CreditCard, MessageSquare, BarChart2, TrendingUp,
  Settings, Bell, LogOut, Menu, Megaphone, Search, X,
  ChevronDown, UploadCloud, Satellite
} from 'lucide-react'

const navItems = [
  { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/admin/students', icon: Users, label: 'Students' },
  { to: '/admin/drivers', icon: UserCheck, label: 'Drivers' },
  { to: '/admin/buses', icon: Bus, label: 'Buses' },
  { to: '/admin/routes', icon: Route, label: 'Routes' },
  { to: '/admin/import', icon: UploadCloud, label: 'Import Data' },
  { to: '/admin/bookings', icon: BookOpen, label: 'Bookings' },
  { to: '/admin/payments', icon: CreditCard, label: 'Payments' },
  { to: '/admin/complaints', icon: MessageSquare, label: 'Complaints' },
  { to: '/admin/announcements', icon: Megaphone, label: 'Announcements' },
  { to: '/admin/reports', icon: BarChart2, label: 'Reports' },
  { to: '/admin/analytics', icon: TrendingUp, label: 'Analytics' },
  { to: '/admin/gps', icon: Satellite, label: 'GPS Tracking' },
  { to: '/admin/settings', icon: Settings, label: 'Settings' },
]

const PAGE_TITLES = {
  '/admin': 'Dashboard',
  '/admin/students': 'Students',
  '/admin/drivers': 'Drivers',
  '/admin/buses': 'Buses',
  '/admin/routes': 'Routes',
  '/admin/import': 'Import Data',
  '/admin/bookings': 'Bookings',
  '/admin/payments': 'Payments',
  '/admin/complaints': 'Complaints',
  '/admin/announcements': 'Announcements',
  '/admin/reports': 'Reports',
  '/admin/analytics': 'Analytics',
  '/admin/gps': 'GPS Tracking',
  '/admin/settings': 'Settings',
}

export default function AdminLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleLogout = () => { logout(); navigate('/login') }
  const pageTitle = PAGE_TITLES[location.pathname] || 'Admin'

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-[#1B2D1B]">
      {/* Logo */}
      <div className="px-5 py-4 border-b border-white/8">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-[#40A047] rounded-lg flex items-center justify-center flex-shrink-0">
            <Bus size={20} className="text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-xs leading-tight tracking-wide">SMART COLLEGE</p>
            <p className="text-[#40A047] text-[10px] font-semibold tracking-wider">TRANSPORT SYSTEM</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
        {navItems.map(({ to, icon: Icon, label, end }) => (
          <NavLink key={to} to={to} end={end} onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all
              ${isActive
                ? 'bg-[#40A047] text-white'
                : 'text-gray-400 hover:bg-white/8 hover:text-gray-200'
              }`
            }>
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Bottom */}
      <div className="px-3 pb-4 space-y-1 border-t border-white/8 pt-3">
        <button onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-[13px] font-medium text-gray-400 hover:bg-red-500/15 hover:text-red-400 transition-all">
          <LogOut size={16} />
          Logout
        </button>
        <p className="text-center text-gray-600 text-[10px] mt-2">© 2026 College Transport System</p>
        <p className="text-center text-gray-700 text-[10px]">Privacy Policy · Terms · Help</p>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen bg-[#F5F7FA] overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-56 flex-shrink-0" style={{ background: '#1B2D1B' }}>
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
            <motion.aside initial={{ x: -224 }} animate={{ x: 0 }} exit={{ x: -224 }}
              transition={{ type: 'tween', duration: 0.22 }}
              className="fixed top-0 left-0 h-full w-56 z-50 flex flex-col lg:hidden" style={{ background: '#1B2D1B' }}>
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="h-14 bg-white border-b border-gray-100 flex items-center justify-between px-5 flex-shrink-0" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div className="flex items-center gap-3 flex-1">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100">
              <Menu size={18} className="text-gray-600" />
            </button>
            {/* Breadcrumb */}
            <div className="hidden sm:flex items-center gap-2 text-sm">
              <span className="text-gray-400">Dashboard</span>
              <span className="text-gray-300">/</span>
              <span className="text-gray-700 font-semibold">{pageTitle}</span>
            </div>
            {/* Search */}
            <div className="relative ml-4 hidden md:block">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input placeholder="Search anything..." className="pl-8 pr-4 py-2 text-xs bg-gray-50 border border-gray-200 rounded-lg w-56 focus:outline-none focus:ring-2 focus:ring-[#40A047]/20 focus:border-[#40A047] placeholder-gray-400" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors">
              <Bell size={18} className="text-gray-600" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
            <div className="flex items-center gap-2 pl-2 border-l border-gray-200">
              <div className="w-8 h-8 bg-[#40A047] rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                {user?.avatarInitial || user?.name?.[0] || 'A'}
              </div>
              <div className="hidden md:block">
                <p className="text-xs font-semibold text-gray-800 leading-tight">{user?.name || 'Admin'}</p>
                <p className="text-[10px] text-gray-400">Super Admin</p>
              </div>
              <ChevronDown size={13} className="text-gray-400 hidden md:block" />
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-5 max-w-[1400px] mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
