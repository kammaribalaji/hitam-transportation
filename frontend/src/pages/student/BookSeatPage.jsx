import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { seatService, routeService } from '../../api/services.js'
import { useAuth } from '../../hooks/useAuth.js'
import { Bus } from 'lucide-react'

const SEAT_COLORS = {
  AVAILABLE: { bg: 'bg-[#40A047]', text: 'text-white', hover: 'hover:bg-[#2d7a33] hover:scale-105', cursor: 'cursor-pointer' },
  BOOKED: { bg: 'bg-gray-300', text: 'text-gray-500', hover: '', cursor: 'cursor-not-allowed' },
  SELECTED: { bg: 'bg-yellow-400', text: 'text-white', hover: 'hover:bg-yellow-500', cursor: 'cursor-pointer' },
  RESERVED: { bg: 'bg-red-400', text: 'text-white', hover: '', cursor: 'cursor-not-allowed' },
}

function SeatBtn({ seat, onClick }) {
  const style = SEAT_COLORS[seat.status]
  return (
    <button
      onClick={() => (seat.status === 'AVAILABLE' || seat.status === 'SELECTED') && onClick(seat.id)}
      className={`w-8 h-8 xs:w-9 xs:h-9 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all duration-150 text-[10px] sm:text-xs font-bold shadow-sm shrink-0 ${style.bg} ${style.text} ${style.hover} ${style.cursor}`}
      title={`Seat ${seat.id}: ${seat.status}`}
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="sm:w-3.5 sm:h-3.5">
        <path d="M7 3a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2H7zM5 17a1 1 0 0 0 0 2h14a1 1 0 0 0 0-2H5z" />
      </svg>
      {seat.id}
    </button>
  )
}

export default function BookSeatPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [routes, setRoutes] = useState([])
  const [selectedRouteId, setSelectedRouteId] = useState(user?.assignedRouteId || '12')
  const [seats, setSeats] = useState([])
  const [selectedSeat, setSelectedSeat] = useState(null)
  const [loading, setLoading] = useState(true)

  const route = routes.find(r => r.id === selectedRouteId) || routes[0]

  useEffect(() => {
    routeService.getAll()
      .then(r => {
        setRoutes(r.data || [])
        if (r.data?.length && !r.data.some(x => x.id === selectedRouteId)) {
          setSelectedRouteId(r.data[0].id)
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!selectedRouteId) return
    setLoading(true)
    seatService.getByRoute(selectedRouteId)
      .then(r => { setSeats(r.data.seats || []); setSelectedSeat(null) })
      .catch(() => { setSeats([]) })
      .finally(() => setLoading(false))
  }, [selectedRouteId])

  const handleSeatClick = (id) => {
    setSelectedSeat(prev => prev === id ? null : id)
    setSeats(prev => prev.map(s => {
      if (s.id === id) return { ...s, status: s.status === 'SELECTED' ? 'AVAILABLE' : 'SELECTED' }
      if (s.status === 'SELECTED') return { ...s, status: 'AVAILABLE' }
      return s
    }))
  }

  const available = seats.filter(s => s.status === 'AVAILABLE').length
  const booked = seats.filter(s => s.status === 'BOOKED').length

  // Render seats in rows of 4 with aisle
  const rows = []
  for (let i = 0; i < seats.length; i += 4) rows.push(seats.slice(i, i + 4))

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Select Seat</h1>
          <p className="text-sm text-gray-500 mt-0.5">{route ? `${route.id} · ${route.busNumber}` : 'Loading…'}</p>
        </div>
      </div>

      {/* Route selector */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
        <p className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wide">Select Route</p>
        {routes.length === 0 ? (
          <p className="text-sm text-gray-400 py-4 text-center">No routes available yet.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {routes.map(r => (
              <button key={r.id} onClick={() => setSelectedRouteId(r.id)}
                className={`p-3 rounded-xl border-2 text-left transition-all ${selectedRouteId === r.id ? 'border-[#40A047] bg-green-50' : 'border-gray-200 hover:border-green-300'}`}>
                <div className="flex items-center gap-2 mb-1">
                  <Bus size={14} className="text-[#40A047]" />
                  <span className="text-sm font-bold text-gray-900">{r.id}</span>
                </div>
                <p className="text-xs text-gray-500 truncate">{r.busNumber}</p>
                <p className="text-xs text-gray-400 truncate">{r.pickupPoint}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-4 flex-wrap">
            {[
              { status: 'AVAILABLE', label: 'Available', color: 'bg-[#40A047]' },
              { status: 'BOOKED', label: 'Booked', color: 'bg-gray-300' },
              { status: 'SELECTED', label: 'Selected', color: 'bg-yellow-400' },
            ].map(({ label, color }) => (
              <div key={label} className="flex items-center gap-2">
                <div className={`w-4 h-4 rounded-md ${color}`} />
                <span className="text-xs text-gray-600 font-medium">{label}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span><strong className="text-[#40A047]">{available}</strong> Available</span>
            <span><strong className="text-gray-700">{booked}</strong> Booked</span>
          </div>
        </div>
      </div>

      {/* Seat map */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Bus front header */}
        <div className="bg-[#1a2e1a] px-6 py-3 flex items-center justify-between">
          <span className="text-xs font-bold text-green-400 tracking-widest">FRONT / ENTRANCE</span>
          <div className="w-8 h-8 bg-[#40A047] rounded-lg flex items-center justify-center">
            <Bus size={16} className="text-white" />
          </div>
        </div>

        <div className="p-5">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-3 border-[#40A047] border-t-transparent rounded-full animate-spin" style={{ borderWidth: 3 }} />
            </div>
          ) : seats.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Bus size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">No seat map available for this route.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {rows.map((row, ri) => (
                <div key={ri} className="flex items-center justify-center gap-2">
                  <div className="flex gap-2">
                    {row[0] && <SeatBtn seat={row[0]} onClick={handleSeatClick} />}
                    {row[1] && <SeatBtn seat={row[1]} onClick={handleSeatClick} />}
                  </div>
                  {/* Aisle */}
                  <div className="w-8 flex items-center justify-center">
                    <span className="text-xs text-gray-300 font-bold" style={{ writingMode: 'vertical-lr', fontSize: 8 }}>AISLE</span>
                  </div>
                  <div className="flex gap-2">
                    {row[2] && <SeatBtn seat={row[2]} onClick={handleSeatClick} />}
                    {row[3] && <SeatBtn seat={row[3]} onClick={handleSeatClick} />}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Back of bus */}
        <div className="bg-gray-50 border-t border-gray-100 px-6 py-2 text-center">
          <span className="text-xs font-bold text-gray-400 tracking-widest">REAR OF BUS</span>
        </div>
      </div>

      {/* Bottom action bar */}
      <div className="sticky bottom-4 bg-white rounded-2xl border border-gray-100 shadow-xl p-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500">Selected Seat</p>
          <p className={`text-2xl font-bold ${selectedSeat ? 'text-[#40A047]' : 'text-gray-300'}`}>
            {selectedSeat ? `Seat ${selectedSeat}` : 'None'}
          </p>
        </div>
        <button
          onClick={() => navigate('/student/payment', { state: { selectedSeat, selectedRouteId } })}
          disabled={!selectedSeat}
          className="px-8 py-3 bg-[#40A047] hover:bg-[#2d7a33] disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold rounded-xl transition-all text-sm shadow-lg shadow-green-600/20 disabled:shadow-none disabled:cursor-not-allowed">
          Continue
        </button>
      </div>
    </motion.div>
  )
}
