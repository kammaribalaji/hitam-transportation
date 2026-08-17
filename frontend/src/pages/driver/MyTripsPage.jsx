import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { tripService } from '../../api/services.js'
import StatusBadge from '../../components/common/StatusBadge.jsx'
import PageHeader from '../../components/common/PageHeader.jsx'
import toast from 'react-hot-toast'
import { Bus, Clock, Users, MapPin, Fuel, Play, CheckCircle } from 'lucide-react'

const TABS = ['Today', 'Upcoming', 'Completed']

export default function MyTripsPage() {
  const [trips, setTrips] = useState([])
  const [tab, setTab] = useState('Today')

  useEffect(() => {
    tripService.getMy().then(r => setTrips(r.data || [])).catch(() => {})
  }, [])

  const updateStatus = async (tripId, status) => {
    try {
      await tripService.updateStatus(tripId, status)
      setTrips(prev => prev.map(t => t.tripId === tripId ? { ...t, status } : t))
      toast.success(`Trip marked as ${status.replace(/_/g, ' ')}`)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update trip status')
    }
  }

  const filtered = trips.filter(t => {
    if (tab === 'Today') return t.status === 'IN_PROGRESS' || t.status === 'UPCOMING'
    if (tab === 'Upcoming') return t.status === 'UPCOMING'
    return t.status === 'COMPLETED'
  })

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      <PageHeader title="My Trips" subtitle="Manage and track your assigned trips" />

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-white rounded-xl border border-gray-100 shadow-sm w-fit">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${tab === t ? 'bg-[#40A047] text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}>
            {t}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {filtered.length === 0 && (
          <div className="text-center py-14 bg-white rounded-2xl border border-gray-100">
            <Bus size={40} className="mx-auto text-gray-200 mb-3" />
            <p className="text-gray-400 text-sm">No trips in this category</p>
          </div>
        )}
        {filtered.map((trip, i) => (
          <motion.div key={trip.tripId} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-base font-bold text-gray-900">{trip.routeName}</p>
                <p className="text-xs text-gray-500 mt-0.5">{trip.date} · {trip.busNumber}</p>
              </div>
              <StatusBadge status={trip.status} />
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mb-4">
              <div className="flex items-center gap-2">
                <Clock size={14} className="text-[#40A047]" />
                <div><p className="text-xs text-gray-500">Start</p><p className="text-sm font-bold">{trip.startTime}</p></div>
              </div>
              <div className="flex items-center gap-2">
                <Clock size={14} className="text-gray-400" />
                <div><p className="text-xs text-gray-500">End</p><p className="text-sm font-bold">{trip.endTime}</p></div>
              </div>
              <div className="flex items-center gap-2">
                <Users size={14} className="text-[#40A047]" />
                <div><p className="text-xs text-gray-500">Students</p><p className="text-sm font-bold">{trip.studentCount}</p></div>
              </div>
              {trip.distance && (
                <div className="flex items-center gap-2">
                  <MapPin size={14} className="text-[#40A047]" />
                  <div><p className="text-xs text-gray-500">Distance</p><p className="text-sm font-bold">{trip.distance}</p></div>
                </div>
              )}
            </div>
            {trip.status === 'COMPLETED' && trip.fuelUsed && (
              <div className="grid grid-cols-3 gap-3 p-3 bg-gray-50 rounded-xl mb-4">
                <div><p className="text-xs text-gray-500">Fuel Used</p><p className="text-sm font-bold">{trip.fuelUsed}</p></div>
                <div><p className="text-xs text-gray-500">Fuel Cost</p><p className="text-sm font-bold">{trip.fuelCost}</p></div>
                <div><p className="text-xs text-gray-500">Avg Mileage</p><p className="text-sm font-bold">{trip.avgMileage}</p></div>
              </div>
            )}
            {trip.status === 'UPCOMING' && (
              <button onClick={() => updateStatus(trip.tripId, 'IN_PROGRESS')}
                className="w-full py-2.5 bg-[#40A047] text-white text-sm font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-[#2d7a33] transition-colors">
                <Play size={14} /> Start Trip
              </button>
            )}
            {trip.status === 'IN_PROGRESS' && (
              <button onClick={() => updateStatus(trip.tripId, 'COMPLETED')}
                className="w-full py-2.5 bg-gray-900 text-white text-sm font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-gray-700 transition-colors">
                <CheckCircle size={14} /> End Trip
              </button>
            )}
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}
