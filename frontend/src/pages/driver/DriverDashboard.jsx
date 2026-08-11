import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../../hooks/useAuth.js'
import { MOCK_TRIPS, MOCK_PASSENGERS } from '../../utils/helpers.js'
import StatCard from '../../components/common/StatCard.jsx'
import StatusBadge from '../../components/common/StatusBadge.jsx'
import { Users, Bus, MapPin, Clock, QrCode, Navigation, AlertTriangle, ChevronRight, CheckCircle } from 'lucide-react'

export default function DriverDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [trips] = useState(MOCK_TRIPS)
  const [passengers] = useState(MOCK_PASSENGERS)

  const firstName = user?.name?.split(' ')[0] || 'Driver'
  const todayTrip = trips.find(t => t.status === 'IN_PROGRESS') || trips[0]
  const boardedCount = passengers.filter(p => p.boarded).length
  const totalStudents = passengers.length
  const pendingCount = passengers.filter(p => !p.boarded).length

  const quickActions = [
    { label: 'Start Trip', icon: Bus, to: '/driver/trips', color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Scan QR', icon: QrCode, to: '/driver/scan-qr', color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'View Route', icon: Navigation, to: '/driver/navigation', color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Report Issue', icon: AlertTriangle, to: '/driver/report-issue', color: 'text-red-600', bg: 'bg-red-50' },
    { label: 'Mark Attendance', icon: Users, to: '/driver/students', color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'End Trip', icon: CheckCircle, to: '/driver/trips', color: 'text-gray-600', bg: 'bg-gray-100' },
  ]

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      {/* Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Welcome back, {firstName}! 👋</h1>
          <p className="text-sm text-gray-500">Your trip for today is ready.</p>
        </div>
        <span className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 text-sm font-semibold rounded-full border border-green-200">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          Vehicle Status: Good
        </span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Today's Trips" value="2/3" subtitle="1 In Progress" icon={Bus} />
        <StatCard title="Students Onboard" value={String(boardedCount)} subtitle={`${totalStudents} total`} icon={Users} iconBg="bg-blue-50" iconColor="text-blue-600" />
        <StatCard title="KMs Cleared" value="54.3" subtitle="Today" icon={Navigation} iconBg="bg-purple-50" iconColor="text-purple-600" />
        <StatCard title="Pending Issues" value="0" subtitle="All clear" icon={AlertTriangle} iconBg="bg-orange-50" iconColor="text-orange-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Today's Trip */}
        <div className="lg:col-span-2 space-y-5">
          {todayTrip && (
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-gray-900">Today's Trip</h2>
                <StatusBadge status={todayTrip.status} />
              </div>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div><p className="text-xs text-gray-500">Start Time</p><p className="text-sm font-bold mt-0.5">{todayTrip.startTime}</p></div>
                <div><p className="text-xs text-gray-500">End Time</p><p className="text-sm font-bold mt-0.5">{todayTrip.endTime}</p></div>
                <div><p className="text-xs text-gray-500">Students</p><p className="text-sm font-bold mt-0.5 text-[#40A047]">{todayTrip.studentCount}</p></div>
              </div>
              <div className="p-3 bg-green-50 rounded-xl mb-4">
                <p className="text-xs font-semibold text-gray-600 mb-1">Live Location</p>
                <p className="text-sm font-bold text-[#40A047]">{todayTrip.routeName}</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-xs text-gray-500">2.4 km away · Arriving in 6 mins</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => navigate('/driver/trips')}
                  className="py-2.5 bg-[#40A047] text-white text-sm font-bold rounded-xl hover:bg-[#2d7a33] transition-colors">
                  End Trip
                </button>
                <button onClick={() => navigate('/driver/navigation')}
                  className="py-2.5 border-2 border-[#40A047] text-[#40A047] text-sm font-bold rounded-xl hover:bg-green-50 transition-colors">
                  View Route
                </button>
              </div>
            </div>
          )}

          {/* Attendance stats */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-gray-900">Boarding Summary</h2>
              <button onClick={() => navigate('/driver/students')} className="text-xs text-[#40A047] font-semibold hover:underline">View All</button>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="text-center p-3 bg-gray-50 rounded-xl">
                <p className="text-2xl font-bold text-gray-900">{totalStudents}</p>
                <p className="text-xs text-gray-500 mt-0.5">Total</p>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-xl">
                <p className="text-2xl font-bold text-[#40A047]">{boardedCount}</p>
                <p className="text-xs text-green-600 mt-0.5">Boarded</p>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-xl">
                <p className="text-2xl font-bold text-red-500">{pendingCount}</p>
                <p className="text-xs text-red-500 mt-0.5">Pending</p>
              </div>
            </div>
            <div className="space-y-2">
              {passengers.slice(0, 4).map((p, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-[#40A047] rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {p.seatNo}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{p.name}</p>
                      <p className="text-xs text-gray-500">{p.rollNumber} · {p.pickup}</p>
                    </div>
                  </div>
                  <StatusBadge status={p.status || (p.boarded ? 'BOARDED' : 'PENDING')} />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick actions + Upcoming */}
        <div className="space-y-5">
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <h2 className="text-sm font-bold text-gray-900 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-2">
              {quickActions.map(({ label, icon: Icon, to, color, bg }) => (
                <button key={to + label} onClick={() => navigate(to)}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl border border-gray-100 hover:border-green-300 hover:shadow-sm transition-all">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${bg}`}>
                    <Icon size={18} className={color} />
                  </div>
                  <span className="text-xs font-semibold text-gray-700 text-center leading-tight">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Upcoming trips */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <h2 className="text-sm font-bold text-gray-900 mb-3">Upcoming Trips</h2>
            <div className="space-y-3">
              {trips.filter(t => t.status === 'UPCOMING').map((t, i) => (
                <div key={i} className="p-3 bg-blue-50/60 rounded-xl border border-blue-100">
                  <div className="flex justify-between items-start mb-1">
                    <p className="text-xs font-bold text-gray-800">{t.routeName}</p>
                    <StatusBadge status={t.status} />
                  </div>
                  <p className="text-xs text-gray-500">{t.startTime} · {t.studentCount} students</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
