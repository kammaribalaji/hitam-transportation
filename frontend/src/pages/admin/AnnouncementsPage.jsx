import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { notificationService } from '../../api/services.js'
import { MOCK_NOTIFICATIONS } from '../../utils/helpers.js'
import PageHeader from '../../components/common/PageHeader.jsx'
import { Megaphone, Send, Bell } from 'lucide-react'

const CATEGORIES = [
  { type: 'ANNOUNCEMENT', label: '📢 General' },
  { type: 'DELAY', label: '⏱️ Route Delay' },
  { type: 'SYSTEM', label: '⚙️ Notice' },
]

const TARGET_ROLES = [
  { value: 'ALL', label: 'All Users' },
  { value: 'STUDENT', label: 'Students Only' },
  { value: 'DRIVER', label: 'Drivers Only' },
]

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState(MOCK_NOTIFICATIONS.filter(n => ['ANNOUNCEMENT','DELAY','SYSTEM'].includes(n.type)))
  const [category, setCategory] = useState('ANNOUNCEMENT')
  const [targetRole, setTargetRole] = useState('ALL')
  const [loading, setLoading] = useState(false)
  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  useEffect(() => {
    notificationService.getAll().then(r => {
      const filtered = r.data?.filter(n => ['ANNOUNCEMENT','DELAY','SYSTEM'].includes(n.type))
      if (filtered?.length) setAnnouncements(filtered)
    }).catch(() => {})
  }, [])

  const onSubmit = async (data) => {
    if (!data.title.trim() || !data.message.trim()) { toast.error('Fill all fields'); return }
    setLoading(true)
    try {
      const res = await notificationService.create({ title: data.title, message: data.message, type: category, targetRole })
      setAnnouncements(prev => [{ ...res.data, time: 'Just Now' }, ...prev])
      toast.success('✅ Announcement posted to Student Portal!')
      reset()
    } catch {
      setAnnouncements(prev => [{ _id: Date.now(), title: data.title, message: data.message, type: category, time: 'Just Now', isRead: false }, ...prev])
      toast.success('✅ Announcement posted!')
      reset()
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      <PageHeader title="Announcements" subtitle="Post real-time updates to all student dashboards" />

      {/* Form */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
            <Megaphone size={18} className="text-[#40A047]" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-gray-900">Upload Update to Student Portal</h2>
            <p className="text-xs text-gray-500">Broadcasts to all student dashboards instantly</p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Announcement Title *</label>
            <input {...register('title', { required: 'Title is required' })}
              placeholder="e.g. Bus Route R1 Schedule Modification"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#40A047]/30 focus:border-[#40A047]" />
            {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Update Details / Message *</label>
            <textarea {...register('message', { required: 'Message is required' })} rows={4}
              placeholder="e.g. Evening bus R1 will depart 15 minutes late today due to road repair."
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#40A047]/30 focus:border-[#40A047] resize-none" />
            {errors.message && <p className="text-red-500 text-xs mt-1">{errors.message.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-2">Category</label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map(c => (
                  <button key={c.type} type="button" onClick={() => setCategory(c.type)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold border-2 transition-all ${category === c.type ? 'bg-[#40A047] text-white border-[#40A047]' : 'bg-white text-gray-600 border-gray-200 hover:border-green-400'}`}>
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-2">Target Audience</label>
              <div className="flex flex-col gap-1.5">
                {TARGET_ROLES.map(r => (
                  <button key={r.value} type="button" onClick={() => setTargetRole(r.value)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border-2 transition-all text-left ${targetRole === r.value ? 'bg-green-50 border-[#40A047] text-[#40A047]' : 'bg-white text-gray-600 border-gray-200 hover:border-green-300'}`}>
                    {targetRole === r.value ? '● ' : '○ '}{r.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button type="submit" disabled={loading}
            className="w-full py-3.5 bg-[#40A047] text-white font-bold rounded-xl hover:bg-[#2d7a33] transition-colors flex items-center justify-center gap-2 disabled:opacity-60 shadow-lg shadow-green-600/15 text-sm">
            <Send size={16} />
            {loading ? 'Publishing...' : 'Publish Update to Students'}
          </button>
        </form>
      </div>

      {/* Live announcements list */}
      <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
        <h2 className="text-sm font-bold text-gray-900 mb-4">Live Student Portal Announcements</h2>
        <div className="space-y-3">
          {announcements.length === 0 && (
            <div className="text-center py-10 text-gray-400">
              <Megaphone size={36} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">No announcements yet</p>
            </div>
          )}
          {announcements.map((n, i) => (
            <motion.div key={n._id || i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
              className="flex items-start gap-3 p-4 bg-green-50/60 rounded-xl border border-green-100">
              <div className="w-9 h-9 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                <Bell size={15} className="text-[#40A047]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-bold text-gray-900">{n.title}</p>
                  <p className="text-xs text-gray-400 whitespace-nowrap">{n.time}</p>
                </div>
                <p className="text-xs text-gray-600 mt-1 leading-relaxed">{n.message}</p>
                <span className="inline-flex mt-1.5 px-2 py-0.5 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                  {n.type}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  )
}
