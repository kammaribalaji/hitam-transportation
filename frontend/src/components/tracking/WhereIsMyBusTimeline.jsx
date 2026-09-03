import React, { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bus,
  Clock,
  MapPin,
  Bell,
  Share2,
  Armchair,
  RefreshCw,
  Map as MapIcon,
  ChevronLeft,
  CheckCircle2,
  AlertTriangle,
  Volume2,
  VolumeX,
  X,
  Navigation,
  Sparkles,
  Search,
} from 'lucide-react'

export default function WhereIsMyBusTimeline({
  route,
  stops = [],
  liveLocation,
  userBoardingPoint,
  onToggleMap,
  isMapVisible,
  onRefresh,
  isRefreshing,
  onSelectStop,
  fullRoutesList = [],
  selectedRouteId,
  onSelectRoute,
}) {
  const [alarmActive, setAlarmActive] = useState(false)
  const [showAlarmModal, setShowAlarmModal] = useState(false)
  const [showSeatModal, setShowSeatModal] = useState(false)
  const [alarmStopName, setAlarmStopName] = useState(userBoardingPoint || '')
  const [alarmMinutesBefore, setAlarmMinutesBefore] = useState(10)
  const [toastMessage, setToastMessage] = useState(null)
  const [filterQuery, setFilterQuery] = useState('')

  const busNumber = route?.busNumber || `TS 09 UB ${1200 + parseInt(route?.id || 1)}`
  const routeName = route?.name || `Route ${route?.id || 1}`
  const startPoint = route?.startPoint || stops[0]?.name || 'Origin'
  const endPoint = route?.endPoint || 'HITAM College'

  // Calculate bus progress along stops
  const currentStopIndex = useMemo(() => {
    if (!stops.length) return 0
    if (!liveLocation || !liveLocation.latitude || liveLocation.latitude === 0) return 0

    // Find closest stop by distance
    let closestIdx = 0
    let minDistance = Infinity

    for (let i = 0; i < stops.length; i++) {
      const s = stops[i]
      if (s.latitude && s.longitude) {
        const d = Math.hypot(s.latitude - liveLocation.latitude, s.longitude - liveLocation.longitude)
        if (d < minDistance) {
          minDistance = d
          closestIdx = i
        }
      }
    }
    return closestIdx
  }, [stops, liveLocation])

  const currentStop = stops[currentStopIndex] || stops[0]
  const nextStop = stops[Math.min(currentStopIndex + 1, stops.length - 1)] || stops[stops.length - 1]
  const isOnline = liveLocation && (liveLocation.status === 'online' || liveLocation.status === 'LIVE' || liveLocation.status === 'ack' || liveLocation.speed > 0)
  const busSpeed = liveLocation?.speed ? Math.round(liveLocation.speed) : (isOnline ? 34 : 0)

  // Trigger toast helper
  const showToast = (msg) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3000)
  }

  // Handle share
  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `Live Tracking: ${routeName}`,
        text: `Track HITAM Bus ${busNumber} (${routeName}) in real-time!`,
        url: window.location.href,
      }).catch(() => {})
    } else {
      navigator.clipboard?.writeText(window.location.href)
      showToast('Live tracking link copied to clipboard!')
    }
  }

  // Calculate cumulative approximate distances
  const stopsWithDistances = useMemo(() => {
    let totalKm = 0
    return stops.map((s, idx) => {
      if (idx > 0) {
        const prev = stops[idx - 1]
        if (s.latitude && s.longitude && prev.latitude && prev.longitude) {
          const degToKm = 111
          const dist = Math.hypot((s.latitude - prev.latitude) * degToKm, (s.longitude - prev.longitude) * degToKm * 0.95)
          totalKm += Math.max(1.2, Math.round(dist * 10) / 10)
        } else {
          totalKm += 2.0
        }
      }
      const isPassed = idx < currentStopIndex
      const isCurrent = idx === currentStopIndex
      const isMyStop = userBoardingPoint && (
        s.name.toLowerCase().trim() === userBoardingPoint.toLowerCase().trim() ||
        s.name.toLowerCase().includes(userBoardingPoint.toLowerCase().trim()) ||
        userBoardingPoint.toLowerCase().includes(s.name.toLowerCase().trim())
      )

      return {
        ...s,
        kmFromStart: Math.round(totalKm),
        isPassed,
        isCurrent,
        isMyStop,
      }
    })
  }, [stops, currentStopIndex, userBoardingPoint])

  const filteredStops = useMemo(() => {
    if (!filterQuery.trim()) return stopsWithDistances
    const q = filterQuery.toLowerCase().trim()
    return stopsWithDistances.filter(s => s.name.toLowerCase().includes(q))
  }, [stopsWithDistances, filterQuery])

  return (
    <div className="bg-white rounded-3xl border border-emerald-100 shadow-xl overflow-hidden text-slate-800 font-sans">
      {/* 1. TOP HEADER (Where is my train style) */}
      <div className="bg-gradient-to-r from-[#1B5E20] via-[#2E7D32] to-[#40A047] text-white p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center ring-1 ring-white/25 shadow-inner">
              <Bus size={22} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm sm:text-base font-black tracking-wide text-white">
                  {busNumber}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-white/20 text-emerald-100 font-semibold backdrop-blur-sm">
                  Route {route?.id || '—'}
                </span>
              </div>
              <h1 className="text-xs sm:text-sm font-medium text-emerald-100 line-clamp-1">
                {routeName.split(' - ')[1] || routeName}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="p-2 rounded-xl bg-white/15 hover:bg-white/25 transition-all text-white backdrop-blur-sm"
              title="Refresh Live Location"
            >
              <RefreshCw size={17} className={isRefreshing ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={onToggleMap}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white text-emerald-800 text-xs font-bold shadow-md hover:bg-emerald-50 transition-all"
            >
              <MapIcon size={14} className="text-[#40A047]" />
              {isMapVisible ? 'Hide Map' : 'View in Map'}
            </button>
          </div>
        </div>

        {/* Quick action pills row */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 scrollbar-none text-xs">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/15 backdrop-blur-sm text-white font-medium shrink-0">
            <Clock size={13} className="text-emerald-200" />
            <span>Today • {new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', weekday: 'short' })}</span>
          </div>

          <button
            onClick={() => setShowAlarmModal(true)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-bold shrink-0 transition-all ${
              alarmActive ? 'bg-amber-400 text-slate-900 shadow-md ring-2 ring-white/50' : 'bg-white/15 hover:bg-white/25 text-white'
            }`}
          >
            <Bell size={13} className={alarmActive ? 'fill-slate-900' : ''} />
            <span>{alarmActive ? 'Alarm ON' : 'Alarm'}</span>
          </button>

          <button
            onClick={() => setShowSeatModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/15 hover:bg-white/25 text-white font-medium shrink-0 transition-all"
          >
            <Armchair size={13} />
            <span>Seats & Coach</span>
          </button>

          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/15 hover:bg-white/25 text-white font-medium shrink-0 transition-all"
          >
            <Share2 size={13} />
            <span>Share</span>
          </button>
        </div>
      </div>

      {/* 2. ROUTE SELECTOR DROPDOWN / CHIPS */}
      <div className="px-4 py-3 bg-slate-50 border-b border-emerald-100 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider">Active Route:</span>
          <select
            value={selectedRouteId}
            onChange={(e) => onSelectRoute(e.target.value)}
            className="text-xs font-bold px-3 py-1.5 bg-white border border-emerald-300 rounded-xl text-emerald-950 focus:outline-none focus:ring-2 focus:ring-[#40A047] shadow-sm"
          >
            <option value="ALL">Fleet Overview (All 23 Routes)</option>
            {fullRoutesList.map((r) => (
              <option key={r.id} value={r.id}>
                Route {r.id}: {r.busNumber} • {r.startPoint}
              </option>
            ))}
          </select>
        </div>

        {/* Search stop */}
        <div className="relative w-full sm:w-60">
          <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search stops on this route..."
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#40A047]"
          />
        </div>
      </div>

      {/* 3. SUBHEADER: ARRIVAL / DEPARTURE SUMMARY */}
      <div className="px-4 sm:px-6 py-3 bg-emerald-50/70 border-b border-emerald-100 flex items-center justify-between text-xs font-bold text-emerald-900">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-600" />
          <span>Arrival at Stop</span>
        </div>
        <div className="text-center font-extrabold text-emerald-950">
          <span>{startPoint} ➔ {endPoint}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span>Reporting Time</span>
          <span className="w-2 h-2 rounded-full bg-emerald-600" />
        </div>
      </div>

      {/* 4. STATION / STOP VERTICAL LINE TRACK (Where is my train exact layout) */}
      <div className="p-4 sm:p-6 space-y-0 max-h-[560px] overflow-y-auto relative scrollbar-thin scrollbar-thumb-emerald-200">
        {filteredStops.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">No stops match your search.</div>
        ) : (
          filteredStops.map((stop, index) => {
            const isLast = index === filteredStops.length - 1
            const isFirst = index === 0

            return (
              <div
                key={stop.name + index}
                onClick={() => onSelectStop && onSelectStop(stop)}
                className={`group relative flex items-center justify-between py-3.5 px-3 rounded-2xl transition-all cursor-pointer ${
                  stop.isMyStop
                    ? 'bg-emerald-50/90 border border-emerald-300 shadow-sm'
                    : stop.isCurrent
                    ? 'bg-slate-50 border border-slate-200'
                    : 'hover:bg-slate-50/80 border border-transparent'
                }`}
              >
                {/* LEFT: ARRIVAL TIME & DELAY STATUS */}
                <div className="w-24 sm:w-28 text-left shrink-0">
                  <p className={`text-xs font-black ${stop.isPassed ? 'text-slate-400' : 'text-slate-900'}`}>
                    {stop.stopTime || route?.reportingTime || '07:00 AM'}
                  </p>
                  <p className={`text-[11px] font-bold ${
                    stop.isPassed
                      ? 'text-slate-400'
                      : isOnline
                      ? 'text-emerald-700'
                      : 'text-slate-500'
                  }`}>
                    {stop.isPassed ? 'Passed' : isOnline ? 'On Time' : 'Scheduled'}
                  </p>
                </div>

                {/* CENTER: VERTICAL GREEN RAILWAY/ROAD TRACK & STATION NODES */}
                <div className="relative flex flex-col items-center justify-center px-4 shrink-0">
                  {/* Continuous vertical track line */}
                  {!isLast && (
                    <div
                      className={`absolute top-6 bottom-[-24px] w-1.5 transition-all ${
                        stop.isPassed
                          ? 'bg-emerald-300'
                          : 'bg-emerald-500'
                      }`}
                    />
                  )}

                  {/* Station node dot */}
                  <div
                    className={`relative z-10 w-4 h-4 rounded-full border-2 transition-all flex items-center justify-center ${
                      stop.isCurrent
                        ? 'bg-emerald-600 border-white ring-4 ring-emerald-300 scale-125'
                        : stop.isMyStop
                        ? 'bg-amber-400 border-white ring-4 ring-amber-200 scale-110'
                        : stop.isPassed
                        ? 'bg-emerald-400 border-white'
                        : 'bg-white border-emerald-600'
                    }`}
                  >
                    {stop.isMyStop && <span className="w-1.5 h-1.5 bg-slate-900 rounded-full" />}
                  </div>

                  {/* LIVE BUS BADGE AT CURRENT STOP (Where is my train speech bubble) */}
                  {stop.isCurrent && (
                    <div className="absolute left-6 z-20 whitespace-nowrap">
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-[#1B5E20] to-[#2E7D32] text-white text-[11px] font-bold rounded-xl shadow-lg border border-emerald-300/40"
                      >
                        <span className="w-2 h-2 rounded-full bg-emerald-300 animate-ping" />
                        <Bus size={13} className="text-emerald-200 shrink-0" />
                        <span>
                          {isOnline ? `Approaching ${stop.name} (${busSpeed} km/h)` : `Scheduled at ${stop.name}`}
                        </span>
                      </motion.div>
                    </div>
                  )}
                </div>

                {/* MIDDLE: STOP NAME & DISTANCE (Where is my train style) */}
                <div className="flex-1 px-3 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className={`text-xs sm:text-sm font-extrabold truncate ${
                      stop.isMyStop ? 'text-emerald-950 font-black' : stop.isPassed ? 'text-slate-500' : 'text-slate-900'
                    }`}>
                      {stop.name}
                    </h3>
                    {stop.isMyStop && (
                      <span className="px-2 py-0.5 bg-emerald-600 text-white text-[10px] font-black rounded-full shadow-sm flex items-center gap-1">
                        <Sparkles size={10} />
                        Your Boarding Stop
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                    <span>{stop.kmFromStart} km</span>
                    <span>•</span>
                    <span>Stop #{stop.stopOrder || index + 1}</span>
                  </div>
                </div>

                {/* RIGHT: DEPARTURE TIME */}
                <div className="w-20 text-right shrink-0">
                  <p className={`text-xs font-black ${stop.isPassed ? 'text-slate-400' : 'text-slate-900'}`}>
                    {isLast ? 'HITAM' : (stop.stopTime || '07:05 AM')}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    {isLast ? 'Destination' : 'Departure'}
                  </p>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* 5. FLOATING "VIEW IN MAP" PILL OVERLAY (Like Where is my Train) */}
      <div className="p-4 bg-slate-50 border-t border-emerald-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
            <Navigation size={18} className="text-[#40A047]" />
          </div>
          <div>
            <p className="text-xs font-black text-slate-900">
              {isOnline ? `Live: ${currentStop.name} ➔ ${nextStop.name}` : `Route ${route?.id || 1} Transit Corridor`}
            </p>
            <p className="text-[11px] text-slate-500">
              {isOnline ? `GPS active • Speed: ${busSpeed} km/h • Updated 5s ago` : 'GPS Device in standby mode'}
            </p>
          </div>
        </div>

        <button
          onClick={onToggleMap}
          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#40A047] hover:bg-[#2d7a33] text-white text-xs font-bold shadow-md shadow-green-600/20 transition-all shrink-0"
        >
          <MapPin size={15} />
          <span>{isMapVisible ? 'Close Map View' : 'View journey in Google Map'}</span>
        </button>
      </div>

      {/* 6. STOP ALARM MODAL */}
      <AnimatePresence>
        {showAlarmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-emerald-100"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center">
                    <Bell size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900">Set Destination Alarm</h3>
                    <p className="text-xs text-slate-500">Get notified when your bus is approaching</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAlarmModal(false)}
                  className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Alarm Stop</label>
                  <select
                    value={alarmStopName}
                    onChange={(e) => setAlarmStopName(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#40A047] focus:outline-none"
                  >
                    {stops.map((s) => (
                      <option key={s.name} value={s.name}>
                        {s.name} ({s.stopTime || '07:00 AM'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Notify Before</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[5, 10, 15].map((mins) => (
                      <button
                        key={mins}
                        onClick={() => setAlarmMinutesBefore(mins)}
                        className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                          alarmMinutesBefore === mins
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {mins} Minutes
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-2 flex items-center gap-2">
                  <button
                    onClick={() => {
                      setAlarmActive(true)
                      setShowAlarmModal(false)
                      showToast(`Alarm set for ${alarmStopName} (${alarmMinutesBefore}m before)!`)
                    }}
                    className="flex-1 py-3 bg-[#40A047] hover:bg-[#2d7a33] text-white text-xs font-bold rounded-xl shadow-lg shadow-green-600/20 transition-all"
                  >
                    Activate Alarm
                  </button>
                  {alarmActive && (
                    <button
                      onClick={() => {
                        setAlarmActive(false)
                        setShowAlarmModal(false)
                        showToast('Alarm turned off')
                      }}
                      className="px-4 py-3 bg-red-50 text-red-600 hover:bg-red-100 text-xs font-bold rounded-xl transition-all"
                    >
                      Turn Off
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 7. SEAT & COACH LAYOUT MODAL */}
      <AnimatePresence>
        {showSeatModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-emerald-100 max-h-[85vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                    <Armchair size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900">Bus {busNumber} Layout</h3>
                    <p className="text-xs text-slate-500">50-Seater Campus Transit Vehicle</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowSeatModal(false)}
                  className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Seat grid representation */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
                <div className="flex justify-between items-center mb-3 text-xs font-bold text-slate-600">
                  <span>Front (Driver Cabin)</span>
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[10px]">50 Seats</span>
                </div>
                <div className="grid grid-cols-5 gap-2 text-center text-xs font-bold">
                  {Array.from({ length: 50 }, (_, i) => {
                    const seatNum = i + 1
                    const isOccupied = seatNum % 2 === 0 || seatNum < 15
                    return (
                      <div
                        key={seatNum}
                        className={`p-2 rounded-xl border flex flex-col items-center justify-center gap-0.5 transition-all ${
                          seatNum === 20 || seatNum === 29 || seatNum === 36
                            ? 'bg-emerald-600 text-white border-emerald-700 shadow-md ring-2 ring-emerald-300'
                            : isOccupied
                            ? 'bg-slate-200 text-slate-600 border-slate-300'
                            : 'bg-white text-emerald-800 border-emerald-300'
                        }`}
                      >
                        <Armchair size={13} />
                        <span className="text-[10px]">{seatNum}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 8. TOAST NOTIFICATION */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 right-6 z-50 px-4 py-3 bg-slate-900 text-white text-xs font-bold rounded-2xl shadow-xl border border-slate-700 flex items-center gap-2"
          >
            <CheckCircle2 size={16} className="text-emerald-400" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
