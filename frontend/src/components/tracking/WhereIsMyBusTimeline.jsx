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
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Volume2,
  VolumeX,
  X,
  Navigation,
  Sparkles,
  Search,
  ArrowRight,
  ShieldCheck,
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
  // Multiplying by road curvature factor ~ 1.25 for real city driving distance
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
  const busSpeed = liveLocation?.speed ? Math.round(liveLocation.speed) : (isOnline ? 35 : 0)

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

  const totalJourneyKm = enrichedStops.length > 0 ? enrichedStops[enrichedStops.length - 1].cumulativeKm : 34

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden font-sans text-slate-800">
      {/* 1. TOP HEADER (Where is My Train exact layout) */}
      <div className="bg-[#1E293B] text-white p-4 sm:p-5 border-b border-slate-700">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#40A047]/20 border border-[#40A047]/40 flex items-center justify-center text-[#40A047] shadow-inner">
              <Bus size={22} className="text-[#4CD964]" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-base sm:text-lg font-black tracking-wide text-white">
                  {busNumber}
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#40A047]/30 text-[#4CD964] font-bold border border-[#40A047]/40">
                  Route {route?.id || '—'}
                </span>
              </div>
              <h1 className="text-xs sm:text-sm font-medium text-slate-300 line-clamp-1 mt-0.5">
                {routeName.split(' - ')[1] || routeName}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 transition-all text-slate-200 border border-slate-700 shadow-sm"
              title="Refresh Live Status"
            >
              <RefreshCw size={16} className={isRefreshing ? 'animate-spin text-[#4CD964]' : ''} />
            </button>
            <button
              onClick={onToggleMap}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#40A047] hover:bg-[#2e7d32] text-white text-xs font-bold shadow-md shadow-green-900/30 transition-all"
            >
              <MapIcon size={14} />
              {isMapVisible ? 'Hide Map' : 'View in Map'}
            </button>
          </div>
        </div>

        {/* Action Pills Row (Date, Alarm, Coach, Share) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 scrollbar-none text-xs">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-800/80 text-slate-300 border border-slate-700 font-semibold shrink-0">
            <Clock size={13} className="text-[#4CD964]" />
            <span>Today • {new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', weekday: 'short' })}</span>
          </div>

          <button
            onClick={() => setShowAlarmModal(true)}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full font-bold shrink-0 transition-all border ${
              alarmActive
                ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-md ring-2 ring-amber-300/40'
                : 'bg-slate-800/80 hover:bg-slate-700 text-slate-200 border-slate-700'
            }`}
          >
            <Bell size={13} className={alarmActive ? 'fill-slate-950' : ''} />
            <span>{alarmActive ? 'Alarm Active' : 'Set Alarm'}</span>
          </button>

          <button
            onClick={() => setShowSeatModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold shrink-0 transition-all"
          >
            <Armchair size={13} />
            <span>50-Seater Coach</span>
          </button>

          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold shrink-0 transition-all"
          >
            <Share2 size={13} />
            <span>Share Trip</span>
          </button>
        </div>
      </div>

      {/* 2. ROUTE SELECTOR & SEARCH BAR */}
      <div className="px-4 py-3 bg-slate-50/80 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-black text-slate-700 uppercase tracking-wider">Select Bus Route:</span>
          <select
            value={selectedRouteId}
            onChange={(e) => onSelectRoute(e.target.value)}
            className="text-xs font-bold px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#40A047] shadow-sm cursor-pointer"
          >
            <option value="ALL">Fleet Overview (All 23 Routes)</option>
            {fullRoutesList.map((r) => (
              <option key={r.id} value={r.id}>
                Route {r.id}: {r.busNumber} • {r.startPoint}
              </option>
            ))}
          </select>
        </div>

        <div className="relative w-full sm:w-64">
          <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search stop or landmark..."
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#40A047] shadow-sm"
          />
        </div>
      </div>

      {/* 3. SUBHEADER: ARRIVAL / DEPARTURE COLUMN LABELS */}
      <div className="grid grid-cols-12 items-center px-4 sm:px-6 py-2.5 bg-slate-100/90 border-b border-slate-200 text-[11px] font-black uppercase tracking-wider text-slate-600">
        <div className="col-span-3 text-left">
          <span>Arrival (ETA)</span>
        </div>
        <div className="col-span-6 text-center font-bold text-slate-800 truncate px-2">
          <span>{startPoint} ➔ {endPoint} ({totalJourneyKm} km)</span>
        </div>
        <div className="col-span-3 text-right">
          <span>Reporting Time</span>
        </div>
      </div>

      {/* 4. STATION / STOP UNBROKEN VERTICAL TIMELINE TRACK (ZERO GAPS) */}
      <div className="p-3 sm:p-5 max-h-[580px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300">
        {filteredStops.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">No stops found on this route.</div>
        ) : (
          filteredStops.map((stop, index) => {
            const isLast = index === filteredStops.length - 1
            const isFirst = index === 0

            return (
              <div
                key={stop.name + index}
                onClick={() => onSelectStop && onSelectStop(stop)}
                className={`group relative grid grid-cols-12 items-center min-h-[58px] px-3 rounded-2xl transition-all cursor-pointer ${
                  stop.isMyStop
                    ? 'bg-emerald-50/90 border border-[#40A047]/60 shadow-sm'
                    : stop.isCurrent
                    ? 'bg-slate-100/70 border border-slate-300'
                    : 'hover:bg-slate-50 border border-transparent'
                }`}
              >
                {/* LEFT: SCHEDULED & LIVE ARRIVAL TIME */}
                <div className="col-span-3 text-left shrink-0 py-2">
                  <p className={`text-xs font-black ${stop.isPassed ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                    {stop.stopTime || route?.reportingTime || '07:00 AM'}
                  </p>
                  <p className={`text-[11px] font-bold mt-0.5 ${
                    stop.isPassed
                      ? 'text-slate-400'
                      : isOnline
                      ? 'text-[#2E7D32]'
                      : 'text-slate-500'
                  }`}>
                    {stop.isPassed ? 'Departed' : isOnline ? 'On Time' : 'Scheduled'}
                  </p>
                </div>

                {/* CENTER: 100% UNBROKEN CONTINUOUS VERTICAL LINE & NODES */}
                <div className="col-span-1 relative self-stretch flex items-center justify-center shrink-0">
                  {/* TOP HALF LINE (connects upwards to previous row) */}
                  {!isFirst && (
                    <div
                      className={`absolute top-0 left-1/2 -translate-x-1/2 w-[5px] h-1/2 z-0 ${
                        stop.isPassed ? 'bg-slate-300' : 'bg-[#40A047]'
                      }`}
                    />
                  )}

                  {/* BOTTOM HALF LINE (connects downwards to next row) */}
                  {!isLast && (
                    <div
                      className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-[5px] h-1/2 z-0 ${
                        stop.isPassed ? 'bg-slate-300' : 'bg-[#40A047]'
                      }`}
                    />
                  )}

                  {/* STATION CIRCULAR NODE (Sits cleanly on top of unbroken line) */}
                  <div
                    className={`relative z-10 w-[18px] h-[18px] rounded-full border-[3px] transition-all flex items-center justify-center ${
                      stop.isCurrent
                        ? 'bg-[#40A047] border-white ring-4 ring-emerald-300 scale-125 shadow-md'
                        : stop.isMyStop
                        ? 'bg-amber-400 border-white ring-4 ring-amber-200 scale-110 shadow-sm'
                        : stop.isPassed
                        ? 'bg-white border-slate-400'
                        : 'bg-white border-[#40A047]'
                    }`}
                  >
                    {stop.isMyStop && <span className="w-1.5 h-1.5 bg-slate-900 rounded-full" />}
                  </div>

                  {/* SPEECH BUBBLE BADGE AT LIVE BUS LOCATION */}
                  {stop.isCurrent && (
                    <div className="absolute left-7 z-30 whitespace-nowrap">
                      <motion.div
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-2 px-3 py-1.5 bg-[#1E293B] text-white text-[11px] font-bold rounded-xl shadow-xl border border-emerald-400"
                      >
                        <span className="w-2 h-2 rounded-full bg-[#4CD964] animate-ping" />
                        <Bus size={13} className="text-[#4CD964] shrink-0" />
                        <span>
                          {isOnline
                            ? `At / Approaching ${stop.name} • ${busSpeed} km/h`
                            : `Bus at ${stop.name}`}
                        </span>
                      </motion.div>
                    </div>
                  )}
                </div>

                {/* MIDDLE DETAILS: STOP NAME, DISTANCE IN KM, INTER-STOP KM */}
                <div className="col-span-5 px-3 min-w-0 py-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h3 className={`text-xs sm:text-sm font-black truncate ${
                      stop.isMyStop
                        ? 'text-emerald-950 font-black'
                        : stop.isPassed
                        ? 'text-slate-400'
                        : 'text-slate-900'
                    }`}>
                      {stop.name}
                    </h3>
                    {stop.isMyStop && (
                      <span className="px-2 py-0.5 bg-[#40A047] text-white text-[10px] font-black rounded-full shadow-sm flex items-center gap-1">
                        <Sparkles size={10} />
                        Your Boarding Point
                      </span>
                    )}
                  </div>

                  {/* Distance Breakdown in KM */}
                  <div className="flex items-center gap-2 text-[11px] text-slate-500 font-semibold mt-0.5 flex-wrap">
                    <span className="px-1.5 py-0.2 bg-slate-200/70 text-slate-700 rounded text-[10px] font-bold">
                      {stop.cumulativeKm} km
                    </span>
                    {stop.legKm > 0 && (
                      <span className="text-[10px] text-emerald-700 font-bold">
                        (+{stop.legKm} km from prev stop)
                      </span>
                    )}
                    <span>•</span>
                    <span>Stop #{stop.stopOrder || index + 1}</span>
                  </div>
                </div>

                {/* RIGHT: SCHEDULED REPORTING TIME */}
                <div className="col-span-3 text-right shrink-0 py-2">
                  <p className={`text-xs font-black ${stop.isPassed ? 'text-slate-400' : 'text-slate-900'}`}>
                    {isLast ? 'HITAM Gate' : (stop.stopTime || '07:05 AM')}
                  </p>
                  <p className="text-[10px] text-slate-400 font-medium">
                    {isLast ? 'Arrival Hub' : 'Scheduled Stop'}
                  </p>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* 5. FLOATING MAP ACTION BAR (Where is My Train floating pill) */}
      <div className="p-4 bg-slate-900 text-white border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#40A047]/20 border border-[#40A047]/40 flex items-center justify-center text-[#4CD964] shrink-0">
            <Navigation size={18} />
          </div>
          <div>
            <p className="text-xs font-black text-white flex items-center gap-2">
              <span>{isOnline ? `Live: ${currentStop.name} ➔ ${nextStop.name}` : `Route ${route?.id || 1} Corridor`}</span>
              <span className="px-2 py-0.2 rounded-full bg-emerald-500/20 text-[#4CD964] text-[10px] font-bold">
                {isOnline ? 'GPS Active' : 'Standby'}
              </span>
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {isOnline ? `Speed: ${busSpeed} km/h • Real-time GPS stream active` : 'Telemetry waiting for vehicle ignition'}
            </p>
          </div>
        </div>

        <button
          onClick={onToggleMap}
          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#40A047] hover:bg-[#2e7d32] text-white text-xs font-bold shadow-lg shadow-green-900/40 transition-all shrink-0"
        >
          <MapPin size={15} />
          <span>{isMapVisible ? 'Close Map View' : 'View journey in Google Map'}</span>
        </button>
      </div>

      {/* 6. DESTINATION ALARM MODAL */}
      <AnimatePresence>
        {showAlarmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1 }}
              className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center">
                    <Bell size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900">Stop Proximity Alarm</h3>
                    <p className="text-xs text-slate-500">Wake up before your bus reaches your stop</p>
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
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Your Stop</label>
                  <select
                    value={alarmStopName}
                    onChange={(e) => setAlarmStopName(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs font-bold bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#40A047] focus:outline-none"
                  >
                    {stops.map((s) => (
                      <option key={s.name} value={s.name}>
                        {s.name} ({s.stopTime || '07:00 AM'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Alert Timing</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[5, 10, 15].map((mins) => (
                      <button
                        key={mins}
                        onClick={() => setAlarmMinutesBefore(mins)}
                        className={`py-2.5 rounded-xl text-xs font-bold border transition-all ${
                          alarmMinutesBefore === mins
                            ? 'bg-[#40A047] text-white border-[#40A047] shadow-md'
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
                      showToast(`Alarm set for ${alarmStopName} (${alarmMinutesBefore} min prior)!`)
                    }}
                    className="flex-1 py-3 bg-[#40A047] hover:bg-[#2e7d32] text-white text-xs font-bold rounded-xl shadow-lg shadow-green-600/20 transition-all"
                  >
                    Set Stop Alarm
                  </button>
                  {alarmActive && (
                    <button
                      onClick={() => {
                        setAlarmActive(false)
                        setShowAlarmModal(false)
                        showToast('Alarm deactivated')
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1 }}
              className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 max-h-[85vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                    <Armchair size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900">Bus {busNumber} Seat Map</h3>
                    <p className="text-xs text-slate-500">50 Seats • 2x2 Seating Arrangement</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowSeatModal(false)}
                  className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400"
                >
                  <X size={18} />
                </button>
              </div>

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
                            ? 'bg-[#40A047] text-white border-[#2e7d32] shadow-md ring-2 ring-emerald-300'
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

      {/* 8. TOAST MESSAGE */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 right-6 z-50 px-4 py-3 bg-slate-900 text-white text-xs font-bold rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-2"
          >
            <CheckCircle2 size={16} className="text-[#4CD964]" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
