import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { notificationService } from '../../api/services.js'
import { MOCK_NOTIFICATIONS } from '../../utils/helpers.js'
import { Bell, CheckCheck, Armchair, CreditCard, Megaphone } from 'lucide-react'
import toast from 'react-hot-toast'

const FILTERS = ['All', 'Unread', 'Seats', 'Payments']

const TYPE_ICON = {
  SEAT: Armchair,
  PAYMENT: CreditCard,
  ANNOUNCEMENT: Megaphone,
  DELAY: Bell,
  SYSTEM: Bell,
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS)
  const [filter, setFilter] = useState('All')

  useEffect(() => {
    notificationService.getAll().then(r => { if (r.data?.length) setNotifications(r.data) }).catch(() => {})
  }, [])

  const markAllRead = async () => {
    try {
      await notificationService.markAllRead()
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
      toast.success('All notifications marked as read')
    } catch {
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
      toast.success('All notifications marked as read')
    }
  }

  const filtered = notifications.filter(n => {
    if (filter === 'Unread') return !n.isRead
    if (filter === 'Seats') return n.type === 'SEAT'
    if (filter === 'Payments') return n.type === 'PAYMENT'
    return true
  })

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Notifications</h1>
        <button onClick={markAllRead}
          className="flex items-center gap-1.5 text-sm font-semibold text-[#40A047] hover:text-[#2d7a33] transition-colors">
          <CheckCheck size={15} />
          Mark all as read
        </button>
      </div>

      {/* Filter pills */}
      <div className="flex gap-2 flex-wrap">
        {FILTERS.map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${filter === f ? 'bg-[#40A047] text-white shadow-sm' : 'bg-white text-gray-600 border border-gray-200 hover:border-green-400'}`}>
            {f}
          </button>
        ))}
      </div>

      <div className="space-y-2.5">
        {filtered.length === 0 && (
          <div className="text-center py-14 text-gray-400">
            <Bell size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">No notifications</p>
          </div>
        )}
        {filtered.map((n, i) => {
          const Icon = TYPE_ICON[n.type] || Bell
          return (
            <motion.div key={n._id || i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
              className={`bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-start gap-3 ${!n.isRead ? 'border-l-4 border-l-[#40A047]' : ''}`}>
              <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
                <Icon size={18} className="text-[#40A047]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className={`text-sm leading-tight ${!n.isRead ? 'font-bold text-gray-900' : 'font-semibold text-gray-700'}`}>{n.title}</p>
                  <p className="text-xs text-gray-400 whitespace-nowrap mt-0.5">{n.time}</p>
                </div>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">{n.message}</p>
              </div>
              {!n.isRead && <div className="w-2.5 h-2.5 bg-[#40A047] rounded-full mt-2 flex-shrink-0" />}
            </motion.div>
          )
        })}
      </div>
    </motion.div>
  )
}
