import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { routeService } from '../../api/services.js'
import { ROUTES_DATA } from '../../utils/helpers.js'
import PageHeader from '../../components/common/PageHeader.jsx'
import { Bus, MapPin, Clock, Users, IndianRupee, Plus } from 'lucide-react'

export default function RoutesPage() {
  const [routes, setRoutes] = useState(ROUTES_DATA)

  useEffect(() => {
    routeService.getAll().then(r => { if (r.data?.length) setRoutes(r.data) }).catch(() => {})
  }, [])

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      <PageHeader title="Routes" subtitle={`${routes.length} active routes`}
        actions={
          <button onClick={() => toast.success('Add route feature coming soon')}
            className="flex items-center gap-2 px-4 py-2 bg-[#40A047] text-white text-sm font-bold rounded-xl hover:bg-[#2d7a33] transition-colors shadow-sm">
            <Plus size={14} /> Add Route
          </button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {routes.map((r, i) => {
          const occupancyPct = Math.round((r.bookedSeats / r.totalSeats) * 100)
          return (
            <motion.div key={r.id || r._id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#40A047] rounded-xl flex items-center justify-center">
                    <Bus size={20} className="text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">{r.id || r.routeId}</p>
                    <p className="text-xs text-gray-500">{r.busNumber}</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">Active</span>
              </div>
              <p className="text-sm font-semibold text-gray-700 mb-4 truncate">{r.name}</p>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="flex items-center gap-2"><MapPin size={13} className="text-[#40A047]" /><div><p className="text-xs text-gray-500">Pickup</p><p className="text-xs font-semibold text-gray-700 truncate">{r.pickupPoint}</p></div></div>
                <div className="flex items-center gap-2"><Clock size={13} className="text-[#40A047]" /><div><p className="text-xs text-gray-500">Reporting</p><p className="text-xs font-semibold text-gray-700">{r.reportingTime}</p></div></div>
                <div className="flex items-center gap-2"><Users size={13} className="text-[#40A047]" /><div><p className="text-xs text-gray-500">Seats</p><p className="text-xs font-semibold text-gray-700">{r.bookedSeats}/{r.totalSeats}</p></div></div>
                <div className="flex items-center gap-2"><IndianRupee size={13} className="text-[#40A047]" /><div><p className="text-xs text-gray-500">Annual Fee</p><p className="text-xs font-semibold text-gray-700">₹{r.feeAmount?.toLocaleString()}</p></div></div>
              </div>
              {/* Occupancy bar */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-500">Occupancy</span>
                  <span className="font-bold text-[#40A047]">{occupancyPct}%</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-[#40A047] rounded-full" style={{ width: `${occupancyPct}%` }} />
                </div>
              </div>
              {/* Stops */}
              <div className="mt-3">
                <p className="text-xs text-gray-500 mb-1.5">Stops:</p>
                <div className="flex flex-wrap gap-1">
                  {(r.stops || []).map((s, j) => (
                    <span key={j} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-lg">{s}</span>
                  ))}
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>
    </motion.div>
  )
}
