import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../../hooks/useAuth.js'
import { notificationService, bookingService, routeService } from '../../api/services.js'
import StatCard from '../../components/common/StatCard.jsx'
import { Bus, MapPin, Clock, Armchair, QrCode, Navigation, CreditCard, Bell, ChevronRight, CheckCircle, Megaphone } from 'lucide-react'

export default function StudentDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState([])
  const [booking, setBooking] = useState(null)
  const [route, setRoute] = useState(null)
  const firstName = user?.name?.split(' ')[0] || 'Student'

  useEffect(() => {
    notificationService.getAll().then(r => setNotifications(r.data || [])).catch(() => {})
    bookingService.getMy().then(r => setBooking(r.data)).catch(() => {})
    routeService.getAll()
      .then(r => {
        const list = r.data || []
        setRoute(list.find(x => x.id === (user?.assignedRouteId || '12')) || list[0] || null)
      })
      .catch(() => {})
  }, [user])

  const quickActions = [
    { label: 'View My Pass', icon: QrCode, to: '/student/my-pass', color: 'bg-green-50', iconColor: 'text-[#40A047]' },
    { label: 'Live Tracking', icon: Navigation, to: '/student/tracking', color: 'bg-blue-50', iconColor: 'text-blue-600' },
    { label: 'Book Seat', icon: Armchair, to: '/student/book-seat', color: 'bg-purple-50', iconColor: 'text-purple-600' },
    { label: 'Payment', icon: CreditCard, to: '/student/payment', color: 'bg-orange-50', iconColor: 'text-orange-600' },
  ]

  const announcements = notifications.filter(n => ['ANNOUNCEMENT', 'DELAY', 'SYSTEM'].includes(n.type))
  const recentNotifs = notifications.slice(0, 3)
  const unreadCount = notifications.filter(n => !n.isRead).length

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      {/* Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Welcome, {firstName}! 👋</h1>
          <p className="text-sm text-gray-500 mt-0.5">Here's your transport overview.</p>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span className="px-2.5 py-1 bg-gray-100 text-gray-700 text-xs font-bold rounded-full">{user?.rollNumber || '—'}</span>
            <span className="px-2.5 py-1 bg-gray-100 text-gray-700 text-xs font-bold rounded-full">{user?.year || '—'}</span>
          </div>
        </div>
        {(() => {
          const fs = user?.paymentStatus || (user?.transportFeePaid ? 'PAID' : 'UNPAID')
          const badge = {
            PAID: { text: 'Transport Fee: Paid', cls: 'bg-green-50 text-green-700 border-green-200' },
            'PARTIALLY PAID': { text: 'Transport Fee: Partially Paid', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
            UNPAID: { text: 'Transport Fee: Due', cls: 'bg-red-50 text-red-600 border-red-200' },
          }[fs]
          return badge ? (
            <span className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-full border ${badge.cls}`}>
              <CheckCircle size={15} />
              {badge.text}
            </span>
          ) : null
        })()}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Assigned Route" value={route?.id || '—'} subtitle={route ? (route.name.split(' - ')[1] || route.name) : 'No route assigned'} icon={Bus} />
        <StatCard title="Bus Number" value={route?.busNumber || '—'} subtitle="Active" icon={Bus} iconBg="bg-blue-50" iconColor="text-blue-600" />
        <StatCard title="Boarding Point" value={(user?.boardingPoint || route?.pickupPoint || '—').split(' ').slice(0, 3).join(' ')} subtitle={user?.boardingPoint || route?.pickupPoint || '—'} icon={MapPin} iconBg="bg-purple-50" iconColor="text-purple-600" />
        <StatCard title="Reporting Time" value={route?.reportingTime || '—'} subtitle="Daily" icon={Clock} iconBg="bg-orange-50" iconColor="text-orange-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Next Trip + Quick Actions */}
        <div className="lg:col-span-2 space-y-5">
          {/* Next trip card */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-gray-900">Next Trip</h2>
              <span className="px-2.5 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">On Time</span>
            </div>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div><p className="text-xs text-gray-500">Date</p><p className="text-sm font-bold mt-0.5">Today</p></div>
              <div><p className="text-xs text-gray-500">Time</p><p className="text-sm font-bold mt-0.5">{route?.reportingTime || '—'}</p></div>
              <div><p className="text-xs text-gray-500">Boarding Point</p><p className="text-sm font-bold mt-0.5">{user?.boardingPoint || route?.pickupPoint || '—'}</p></div>
            </div>
            <div className="grid grid-cols-3 gap-4 mb-5">
              <div><p className="text-xs text-gray-500">Seat</p><p className="text-sm font-bold mt-0.5">{booking?.seatNumber || '—'}</p></div>
              <div><p className="text-xs text-gray-500">Route</p><p className="text-sm font-bold mt-0.5">{route?.id || '—'}</p></div>
              <div><p className="text-xs text-gray-500">Pass</p><p className="text-sm font-bold mt-0.5 text-green-600">{booking ? (String(booking.paymentStatus || '').toLowerCase().includes('paid') ? 'Active' : 'Payment Pending') : 'Pending'}</p></div>
            </div>
            <button onClick={() => navigate('/student/book-seat')}
              className="w-full py-2.5 bg-[#40A047] hover:bg-[#2d7a33] text-white text-sm font-bold rounded-xl transition-colors">
              View Bus & Seats
            </button>
          </div>

          {/* Quick Actions */}
          <div>
            <h2 className="text-sm font-bold text-gray-900 mb-3">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-3">
              {quickActions.map(({ label, icon: Icon, to, color, iconColor }) => (
                <motion.button key={to} whileHover={{ scale: 1.01 }} onClick={() => navigate(to)}
                  className="flex items-center gap-3 bg-white rounded-xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-all text-left">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
                    <Icon size={20} className={iconColor} />
                  </div>
                  <span className="text-sm font-semibold text-gray-800">{label}</span>
                  <ChevronRight size={14} className="text-gray-400 ml-auto" />
                </motion.button>
              ))}
            </div>
          </div>
        </div>

        {/* Notifications + Announcements */}
        <div className="space-y-5">
          {/* Announcements */}
          {announcements.length > 0 && (
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Megaphone size={16} className="text-[#40A047]" />
                <h2 className="text-sm font-bold text-gray-900">Announcements</h2>
                <span className="ml-auto px-2 py-0.5 bg-green-100 text-green-700 text-xs font-bold rounded-full">{announcements.length}</span>
              </div>
              <div className="space-y-2.5">
                {announcements.slice(0, 2).map((a) => (
                  <div key={a._id} className="p-3 bg-green-50/60 rounded-xl border border-green-100">
                    <div className="flex justify-between items-start gap-2 mb-1">
                      <p className="text-xs font-bold text-gray-800">{a.title}</p>
                      <p className="text-xs text-gray-400 whitespace-nowrap">{a.time}</p>
                    </div>
                    <p className="text-xs text-gray-600 leading-relaxed">{a.message}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notifications */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Bell size={16} className="text-[#40A047]" />
                <h2 className="text-sm font-bold text-gray-900">Notifications</h2>
                {unreadCount > 0 && <span className="w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">{unreadCount}</span>}
              </div>
              <button onClick={() => navigate('/student/notifications')} className="text-xs text-[#40A047] font-semibold hover:underline">View All</button>
            </div>
            <div className="space-y-3">
              {recentNotifs.map((n) => (
                <div key={n._id} className={`flex gap-3 pb-3 border-b border-gray-50 last:border-0 last:pb-0 ${!n.isRead ? 'opacity-100' : 'opacity-70'}`}>
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Bell size={14} className="text-[#40A047]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-gray-800 truncate">{n.title}</p>
                      {!n.isRead && <span className="w-2 h-2 bg-[#40A047] rounded-full flex-shrink-0" />}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{n.message}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{n.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
