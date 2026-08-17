import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { busService } from '../../api/services.js'
import PageHeader from '../../components/common/PageHeader.jsx'
import SearchInput from '../../components/common/SearchInput.jsx'
import StatusBadge from '../../components/common/StatusBadge.jsx'
import { Bus, Plus, Gauge, Zap, Wind, AlertTriangle } from 'lucide-react'

export default function BusesPage() {
  const [buses, setBuses] = useState([])
  const [search, setSearch] = useState('')

  useEffect(() => {
    busService.getAll().then(r => setBuses(r.data || [])).catch(() => {})
  }, [])

  const filtered = buses.filter(b =>
    b.busNumber?.toLowerCase().includes(search.toLowerCase()) ||
    b.driverName?.toLowerCase().includes(search.toLowerCase()) ||
    b.routeName?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      <PageHeader title="Buses" subtitle={`${buses.length} buses in fleet`}
        actions={
          <button onClick={() => toast.success('Add bus coming soon')}
            className="flex items-center gap-2 px-4 py-2 bg-[#40A047] text-white text-sm font-bold rounded-xl hover:bg-[#2d7a33] transition-colors shadow-sm">
            <Plus size={14} /> Add Bus
          </button>
        }
      />

      <SearchInput value={search} onChange={setSearch} placeholder="Search bus number, driver or route..." />

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.length === 0 && (
          <div className="bg-white rounded-2xl p-10 text-center border border-gray-100 shadow-sm col-span-full">
            <Bus size={36} className="mx-auto text-gray-200 mb-3" />
            <p className="text-gray-400 text-sm">No buses in the fleet yet</p>
          </div>
        )}
        {filtered.map((bus, i) => (
          <motion.div key={bus.busNumber} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center border-2 border-green-200">
                  <Bus size={24} className="text-[#40A047]" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">{bus.busNumber}</p>
                  <p className="text-xs text-gray-500">{bus.model}</p>
                </div>
              </div>
              <StatusBadge status={bus.status} />
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4 text-xs">
              <div><p className="text-gray-500">Route</p><p className="font-bold text-gray-800 mt-0.5">{bus.routeName}</p></div>
              <div><p className="text-gray-500">Driver</p><p className="font-bold text-gray-800 mt-0.5">{bus.driverName}</p></div>
              <div><p className="text-gray-500">Odometer</p><p className="font-bold text-gray-800 mt-0.5">{bus.odometer?.toLocaleString()} km</p></div>
              <div><p className="text-gray-500">Last Service</p><p className="font-bold text-gray-800 mt-0.5">{bus.lastService}</p></div>
            </div>
            {/* Fuel gauge */}
            <div className="mb-3">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-500 flex items-center gap-1"><Gauge size={11} /> Fuel Level</span>
                <span className={`font-bold ${bus.fuelLevel > 50 ? 'text-[#40A047]' : bus.fuelLevel > 25 ? 'text-yellow-600' : 'text-red-600'}`}>{bus.fuelLevel}%</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all"
                  style={{ width: `${bus.fuelLevel}%`, backgroundColor: bus.fuelLevel > 50 ? '#40A047' : bus.fuelLevel > 25 ? '#fbbf24' : '#f87171' }} />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => toast.success('Vehicle details updated')}
                className="flex-1 py-2 text-xs font-bold text-[#40A047] border-2 border-[#40A047] rounded-xl hover:bg-green-50 transition-colors">View Details</button>
              {bus.status === 'ACTIVE' && (
                <button onClick={() => toast.success('Service scheduled')}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-orange-600 border-2 border-orange-200 rounded-xl hover:bg-orange-50 transition-colors">
                  <AlertTriangle size={12} /> Schedule Service
                </button>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}
