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
  ChevronDown,
  CheckCircle2,
  AlertCircle,
  Volume2,
  VolumeX,
  X,
  Navigation,
  Sparkles,
  Search,
  MoreVertical,
  Edit3,
} from 'lucide-react'

// Haversine distance formula for accurate km between stop coordinates
function getHaversineKm(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 2.0
  const R = 6371 // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return Math.round(R * c * 1.25 * 10) / 10
}

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
  const [showRouteMenu, setShowRouteMenu] = useState(false)

  const busNumber = route?.busNumber || `TS 09 UB ${1200 + parseInt(route?.id || 1)}`
  const routeName = route?.name || `Route ${route?.id || 1}`
  const startPoint = route?.startPoint || stops[0]?.name || 'Origin'
  const endPoint = route?.endPoint || 'HITAM College'

  // Calculate accurate cumulative & inter-stop distances
  const enrichedStops = useMemo(() => {
    let cumulativeKm = 0
    return stops.map((s, idx) => {
      let legKm = 0
      if (idx > 0) {
        const prev = stops[idx - 1]
        legKm = getHaversineKm(prev.latitude, prev.longitude, s.latitude, s.longitude)
        cumulativeKm += legKm
      }

      return {
        ...s,
        legKm: Math.round(legKm * 10) / 10,
        cumulativeKm: Math.round(cumulativeKm * 10) / 10,
      }
    })
  }, [stops])

  // Determine current bus position index along stops
  const currentStopIndex = useMemo(() => {
    if (!enrichedStops.length) return 0
    if (!liveLocation || !liveLocation.latitude || liveLocation.latitude === 0) return 0

    let closestIdx = 0
    let minDistance = Infinity

    for (let i = 0; i < enrichedStops.length; i++) {
      const s = enrichedStops[i]
      if (s.latitude && s.longitude) {
        const d = Math.hypot(s.latitude - liveLocation.latitude, s.longitude - liveLocation.longitude)
        if (d < minDistance) {
          minDistance = d
          closestIdx = i
        }
      }
    }
    return closestIdx
  }, [enrichedStops, liveLocation])

  const currentStop = enrichedStops[currentStopIndex] || enrichedStops[0] || { name: startPoint }
  const nextStop = enrichedStops[Math.min(currentStopIndex + 1, enrichedStops.length - 1)] || enrichedStops[enrichedStops.length - 1] || currentStop
  const isOnline = liveLocation && (liveLocation.status === 'online' || liveLocation.status === 'LIVE' || liveLocation.status === 'ack' || liveLocation.speed > 0)
  const busSpeed = liveLocation?.speed ? Math.round(liveLocation.speed) : (isOnline ? 36 : 0)

  // Clean matched stops list
  const stopsWithStatus = useMemo(() => {
    return enrichedStops.map((s, idx) => {
      const isPassed = idx < currentStopIndex
      const isCurrent = idx === currentStopIndex
      const isMyStop = userBoardingPoint && (
        s.name.toLowerCase().trim() === userBoardingPoint.toLowerCase().trim() ||
        s.name.toLowerCase().includes(userBoardingPoint.toLowerCase().trim()) ||
        userBoardingPoint.toLowerCase().includes(s.name.toLowerCase().trim())
      )

      return {
        ...s,
        isPassed,
        isCurrent,
        isMyStop,
      }
    })
  }, [enrichedStops, currentStopIndex, userBoardingPoint])

  const filteredStops = useMemo(() => {
    if (!filterQuery.trim()) return stopsWithStatus
    const q = filterQuery.toLowerCase().trim()
    return stopsWithStatus.filter(s => s.name.toLowerCase().includes(q))
  }, [stopsWithStatus, filterQuery])

  const showToast = (msg) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3500)
  }

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `Live Tracking: Bus ${busNumber}`,
        text: `Track HITAM Bus ${busNumber} (${routeName}) in real-time!`,
        url: window.location.href,
      }).catch(() => {})
    } else {
      navigator.clipboard?.writeText(window.location.href)
      showToast('Live tracking link copied to clipboard!')
    }
  }

  const todayStr = useMemo(() => {
    const d = new Date()
    return `Day 1 - ${d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', weekday: 'short' })}`
  }, [])

  return (
    <div className="bg-[#111827] rounded-3xl border border-slate-800 shadow-2xl overflow-hidden font-sans text-white max-w-4xl mx-auto">
      {/* 1. TOP HEADER (Exact "Where is my Train" title bar) */}
      <div className="bg-[#1E293B] px-4 py-3.5 border-b border-slate-800">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => window.history.back()}
              className="p-1.5 -ml-1 text-slate-300 hover:text-white rounded-lg"
            >
              <ChevronLeft size={22} />
            </button>
            <div>
              <h1 className="text-base sm:text-lg font-black tracking-wide text-white flex items-center gap-2">
                <span>{busNumber} - {routeName.split(' - ')[0]}</span>
                <span className="text-xs font-normal text-slate-400">({startPoint.slice(0, 3).toUpperCase()}-HITAM)</span>
              </h1>
            </div>
          </div>

          <div className="relative">
            <button
              onClick={() => setShowRouteMenu(v => !v)}
              className="p-2 text-slate-300 hover:text-white rounded-lg hover:bg-slate-800"
            >
              <MoreVertical size={20} />
            </button>
            {showRouteMenu && (
              <div className="absolute right-0 top-10 z-50 bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl py-2 w-64">
                <p className="px-3 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Switch Route</p>
                <div className="max-h-60 overflow-y-auto">
                  {fullRoutesList.map(r => (
                    <button
                      key={r.id}
                      onClick={() => {
                        onSelectRoute(r.id)
                        setShowRouteMenu(false)
                      }}
                      className={`w-full text-left px-3 py-2 text-xs font-bold hover:bg-slate-700 transition ${
                        selectedRouteId === r.id ? 'text-[#4CD964] bg-slate-700/50' : 'text-slate-200'
                      }`}
                    >
                      Route {r.id}: {r.busNumber} ({r.startPoint})
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Pills: Today, Alarm, Coach, Share */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-3 scrollbar-none text-xs">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-800 text-slate-200 border border-slate-700 font-bold shrink-0">
            <span>Today</span>
            <ChevronDown size={14} className="text-slate-400" />
          </div>

          <button
            onClick={() => setShowAlarmModal(true)}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full font-bold shrink-0 transition-all border ${
              alarmActive
                ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-md ring-2 ring-amber-300/40'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
            }`}
          >
            <Bell size={13} className={alarmActive ? 'fill-slate-950' : ''} />
            <span>Alarm</span>
          </button>

          <button
            onClick={() => setShowSeatModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold shrink-0 transition-all"
          >
            <Armchair size={13} />
            <span>Coach</span>
          </button>

          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold shrink-0 transition-all"
          >
            <Share2 size={13} />
            <span>Share</span>
          </button>
        </div>
      </div>

      {/* 2. SUBHEADER (Arrival | Day 1 - Sep 03, Thu | Departure) */}
      <div className="grid grid-cols-12 items-center px-4 sm:px-6 py-2.5 bg-[#0F172A] border-b border-slate-800 text-xs font-bold text-slate-300">
        <div className="col-span-3 text-left">
          <span className="text-slate-200 font-extrabold">Arrival</span>
        </div>
        <div className="col-span-6 text-center font-black text-white truncate px-2">
          <span>{todayStr}</span>
        </div>
        <div className="col-span-3 text-right">
          <span className="text-slate-200 font-extrabold">Departure</span>
        </div>
      </div>

      {/* 3. VERTICAL STATION TIMELINE TRACK (Exact "Where is my Train" layout) */}
      <div className="bg-[#111827] p-2 sm:p-4 max-h-[620px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700">
        {filteredStops.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-xs">No stops available on this route.</div>
        ) : (
          filteredStops.map((stop, index) => {
            const isLast = index === filteredStops.length - 1
            const isFirst = index === 0

            return (
              <div
                key={stop.name + index}
                onClick={() => onSelectStop && onSelectStop(stop)}
                className={`group relative grid grid-cols-12 items-center min-h-[64px] px-3 py-2 rounded-2xl transition-all cursor-pointer ${
                  stop.isMyStop
                    ? 'bg-emerald-950/40 border border-[#10B981]/50 shadow-inner'
                    : stop.isCurrent
                    ? 'bg-slate-800/40'
                    : 'hover:bg-slate-800/20'
                }`}
              >
                {/* LEFT COLUMN: SCHEDULED ARRIVAL & LIVE ESTIMATED (Green / Red) */}
                <div className="col-span-3 text-left shrink-0">
                  <p className={`text-xs sm:text-sm font-black ${
                    stop.isPassed ? 'text-slate-500' : 'text-slate-200'
                  }`}>
                    {stop.stopTime || '06:40 AM'}
                  </p>
                  <p className={`text-xs font-black mt-0.5 ${
                    stop.isPassed
                      ? 'text-slate-500'
                      : isOnline
                      ? 'text-[#10B981]' // Green on-time
                      : 'text-amber-400'
                  }`}>
                    {stop.isPassed ? '---' : isOnline ? (stop.stopTime || '06:40 AM') : 'Expected'}
                  </p>
                </div>

                {/* CENTER COLUMN: CONTINUOUS UNBROKEN VERTICAL RAIL/ROAD TRACK (0 GAPS) */}
                <div className="col-span-1 relative self-stretch flex items-center justify-center shrink-0">
                  {/* Vertical Track: Top Half */}
                  {!isFirst && (
                    <div
                      className={`absolute top-0 left-1/2 -translate-x-1/2 w-[7px] h-1/2 z-0 ${
                        stop.isPassed ? 'bg-[#0284C7]/40' : 'bg-[#0284C7]'
                      }`}
                    />
                  )}

                  {/* Vertical Track: Bottom Half */}
                  {!isLast && (
                    <div
                      className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-[7px] h-1/2 z-0 ${
                        stop.isPassed ? 'bg-[#0284C7]/40' : 'bg-[#0284C7]'
                      }`}
                    />
                  )}

                  {/* Circular Station Node on the Track */}
                  <div
                    className={`relative z-10 w-4 h-4 rounded-full border-2 transition-all flex items-center justify-center ${
                      stop.isCurrent
                        ? 'bg-[#0284C7] border-white ring-4 ring-[#0284C7]/40 scale-125 shadow-lg'
                        : stop.isMyStop
                        ? 'bg-amber-400 border-white ring-4 ring-amber-400/40 scale-110 shadow-md'
                        : stop.isPassed
                        ? 'bg-[#111827] border-slate-500'
                        : 'bg-[#111827] border-[#0284C7]'
                    }`}
                  >
                    {stop.isMyStop && <span className="w-1.5 h-1.5 bg-slate-900 rounded-full" />}
                  </div>

                  {/* LIVE BUS BADGE & GREEN SPEECH BUBBLE (Exact Where is my Train Pill) */}
                  {stop.isCurrent && (
                    <div className="absolute left-6 z-30 whitespace-nowrap">
                      <motion.div
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-2 px-3 py-1.5 bg-[#15803D] text-white text-xs font-bold rounded-xl shadow-2xl border border-emerald-400"
                      >
                        <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
                          <Bus size={13} className="text-white" />
                        </div>
                        <span>
                          {isOnline
                            ? `Approaching ${stop.name} (Updated just now)`
                            : `Bus at ${stop.name}`}
                        </span>
                      </motion.div>
                    </div>
                  )}
                </div>

                {/* MIDDLE COLUMN: STATION NAME, DISTANCE IN KM, PLATFORM/STOP BADGE */}
                <div className="col-span-5 px-3 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className={`text-xs sm:text-sm font-extrabold truncate ${
                      stop.isMyStop
                        ? 'text-[#4CD964] font-black'
                        : stop.isPassed
                        ? 'text-slate-400'
                        : 'text-white'
                    }`}>
                      {stop.name}
                    </h3>
                    {stop.isMyStop && (
                      <span className="px-2 py-0.5 bg-[#15803D] text-white text-[10px] font-black rounded-full shadow-sm flex items-center gap-1">
                        <Sparkles size={10} />
                        Your Boarding Stop
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-400 font-medium mt-1">
                    <span>{stop.cumulativeKm} km</span>
                    <div className="flex items-center gap-1 px-1.5 py-0.2 bg-slate-800 border border-slate-700 rounded text-[11px] text-slate-300">
                      <span>Stop {stop.stopOrder || index + 1}</span>
                      <Edit3 size={10} className="text-slate-500" />
                    </div>
                  </div>
                </div>

                {/* RIGHT COLUMN: DEPARTURE TIME */}
                <div className="col-span-3 text-right shrink-0">
                  <p className={`text-xs sm:text-sm font-black ${
                    stop.isPassed ? 'text-slate-500' : 'text-slate-200'
                  }`}>
                    {isLast ? 'HITAM' : (stop.stopTime || '06:45 AM')}
                  </p>
                  <p className="text-xs text-slate-500 font-bold mt-0.5">
                    {isLast ? 'End' : '---'}
                  </p>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* 4. FLOATING GOOGLE MAPS BUTTON & TOOLTIP (Exact Where is my Train Floating Pill) */}
      <div className="relative bg-[#0F172A] p-4 border-t border-slate-800 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-[#4CD964] shadow-md">
            <MapPin size={20} className="text-[#4CD964]" />
          </div>
          <div>
            <p className="text-xs sm:text-sm font-black text-[#4CD964]">
              {isOnline ? `Approaching ${currentStop.name}` : `Route ${route?.id || 1} Corridor`}
            </p>
            <p className="text-[11px] text-slate-400">
              {isOnline ? `Updated 2s ago • Speed: ${busSpeed} km/h` : 'Standby mode'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* View directions in Google Maps button */}
          <button
            onClick={onToggleMap}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-xs font-bold shadow-lg transition-all"
          >
            <div className="w-4 h-4 rounded-full bg-red-500/20 flex items-center justify-center">
              <span className="w-2 h-2 rounded-full bg-red-500" />
            </div>
            <span>{isMapVisible ? 'Close Map' : 'View in Google Maps'}</span>
          </button>

          {/* Refresh Button */}
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="w-10 h-10 rounded-2xl bg-[#93C5FD] text-slate-900 flex items-center justify-center shadow-lg hover:bg-blue-300 transition-all shrink-0"
            title="Refresh Live Telemetry"
          >
            <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* 5. STOP ALARM MODAL */}
      <AnimatePresence>
        {showAlarmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-800 text-white"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-amber-400/20 text-amber-400 flex items-center justify-center">
                    <Bell size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white">Destination Stop Alarm</h3>
                    <p className="text-xs text-slate-400">Get notified when bus approaches your stop</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAlarmModal(false)}
                  className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">Select Stop</label>
                  <select
                    value={alarmStopName}
                    onChange={(e) => setAlarmStopName(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs font-bold bg-slate-800 border border-slate-700 text-white rounded-xl focus:ring-2 focus:ring-[#4CD964] focus:outline-none"
                  >
                    {stops.map((s) => (
                      <option key={s.name} value={s.name}>
                        {s.name} ({s.stopTime || '07:00 AM'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">Alert Timing</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[5, 10, 15].map((mins) => (
                      <button
                        key={mins}
                        onClick={() => setAlarmMinutesBefore(mins)}
                        className={`py-2.5 rounded-xl text-xs font-bold border transition-all ${
                          alarmMinutesBefore === mins
                            ? 'bg-[#15803D] text-white border-emerald-500 shadow-md'
                            : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'
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
                      showToast(`Alarm activated for ${alarmStopName} (${alarmMinutesBefore} min before)!`)
                    }}
                    className="flex-1 py-3 bg-[#15803D] hover:bg-[#166534] text-white text-xs font-bold rounded-xl shadow-lg shadow-green-900/40 transition-all"
                  >
                    Set Stop Alarm
                  </button>
                  {alarmActive && (
                    <button
                      onClick={() => {
                        setAlarmActive(false)
                        setShowAlarmModal(false)
                        showToast('Alarm turned off')
                      }}
                      className="px-4 py-3 bg-red-900/40 text-red-400 hover:bg-red-900/60 text-xs font-bold rounded-xl transition-all"
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

      {/* 6. COACH / SEAT LAYOUT MODAL */}
      <AnimatePresence>
        {showSeatModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1 }}
              className="bg-slate-900 rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-800 text-white max-h-[85vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-[#4CD964] flex items-center justify-center">
                    <Armchair size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white">Bus {busNumber} Coach Layout</h3>
                    <p className="text-xs text-slate-400">50 Seats • 2x2 Seating Plan</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowSeatModal(false)}
                  className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="bg-slate-800/80 rounded-2xl p-4 border border-slate-700">
                <div className="flex justify-between items-center mb-3 text-xs font-bold text-slate-300">
                  <span>Front (Driver Cabin)</span>
                  <span className="px-2 py-0.5 bg-emerald-900/50 text-[#4CD964] rounded-full text-[10px] border border-emerald-700/50">50 Seats</span>
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
                            ? 'bg-[#15803D] text-white border-emerald-400 shadow-md ring-2 ring-emerald-400/40'
                            : isOccupied
                            ? 'bg-slate-700 text-slate-400 border-slate-600'
                            : 'bg-slate-800 text-emerald-400 border-slate-600'
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

      {/* 7. TOAST MESSAGE */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 right-6 z-50 px-4 py-3 bg-slate-800 text-white text-xs font-bold rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-2"
          >
            <CheckCircle2 size={16} className="text-[#4CD964]" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
