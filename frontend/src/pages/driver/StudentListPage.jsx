import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { passengerService } from '../../api/services.js'
import { useAuth } from '../../hooks/useAuth.js'
import PageHeader from '../../components/common/PageHeader.jsx'
import SearchInput from '../../components/common/SearchInput.jsx'
import StatusBadge from '../../components/common/StatusBadge.jsx'
import toast from 'react-hot-toast'
import { Users, Bus, UserCheck, UserX } from 'lucide-react'

export default function StudentListPage() {
  const { user } = useAuth()
  const routeId = user?.assignedRouteId || '12'
  const [passengers, setPassengers] = useState([])
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('All')

  useEffect(() => {
    passengerService.getByRoute({ routeId })
      .then(r => setPassengers(r.data || []))
      .catch(() => {})
  }, [routeId])

  const toggle = async (rollNumber, boarded) => {
    try {
      await passengerService.markAttendance({ rollNumber, boarded })
    } catch {}
    setPassengers(prev => prev.map(p => p.rollNumber === rollNumber ? { ...p, boarded, status: boarded ? 'BOARDED' : 'PENDING' } : p))
    toast.success(boarded ? `${rollNumber} marked as boarded` : `${rollNumber} marked pending`)
  }

  const filtered = passengers.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.rollNumber.toLowerCase().includes(search.toLowerCase()) || String(p.seatNo).includes(search)
    if (filter === 'Boarded') return matchSearch && p.boarded
    if (filter === 'Pending') return matchSearch && !p.boarded
    return matchSearch
  })

  const boardedCount = passengers.filter(p => p.boarded).length
  const pendingCount = passengers.filter(p => !p.boarded).length

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      <PageHeader title="Student List" subtitle={`Bus ${user?.assignedBusNumber || 'TS 09 AB 1234'} · Route ${routeId}`} />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm text-center">
          <p className="text-2xl font-bold text-gray-900">{passengers.length}</p>
          <p className="text-xs text-gray-500 mt-1">Total</p>
        </div>
        <div className="bg-green-50 rounded-2xl p-4 border border-green-100 text-center">
          <p className="text-2xl font-bold text-[#40A047]">{boardedCount}</p>
          <p className="text-xs text-green-600 mt-1">Boarded</p>
        </div>
        <div className="bg-red-50 rounded-2xl p-4 border border-red-100 text-center">
          <p className="text-2xl font-bold text-red-500">{pendingCount}</p>
          <p className="text-xs text-red-500 mt-1">Pending</p>
        </div>
      </div>

      {/* Search + filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Search by name or roll number..." className="flex-1" />
        <div className="flex gap-2">
          {['All', 'Boarded', 'Pending'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${filter === f ? 'bg-[#40A047] text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-green-400'}`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="space-y-2.5">
        {filtered.map((p, i) => (
          <motion.div key={p.id || p.rollNumber || i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
            className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 bg-[#40A047] rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                {p.seatNo >= 1 ? p.seatNo : 'WL'}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-gray-900">{p.name}</p>
                <p className="text-xs text-gray-500 truncate">{p.rollNumber} · {p.dept} · {p.pickup}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <StatusBadge status={p.boarded ? 'BOARDED' : 'PENDING'} />
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only" checked={p.boarded} onChange={e => toggle(p.rollNumber, e.target.checked)} />
                <div className={`w-11 h-6 rounded-full transition-colors ${p.boarded ? 'bg-[#40A047]' : 'bg-gray-200'}`}>
                  <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform mt-1 ml-1 ${p.boarded ? 'translate-x-5' : 'translate-x-0'}`} />
                </div>
              </label>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}
