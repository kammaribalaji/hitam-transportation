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
  journeyDirection = 'MORNING',
  onToggleJourneyDirection,
  hasReachedCampus = false,
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
  
  const isOnline = liveLocation && (
    (liveLocation.status === 'online' || liveLocation.status === 'LIVE' || liveLocation.status === 'moving' || liveLocation.speed > 0) &&
    !liveLocation.isStale &&
    liveLocation.latitude !== 0
  )
  const busSpeed = liveLocation?.speed ? Math.round(liveLocation.speed) : (isOnline ? 38 : 0)

  // Clean matched stops list with dynamic continuous ETA calculation
  const stopsWithStatus = useMemo(() => {
    const currentDist = enrichedStops[currentStopIndex]?.cumulativeKm || 0

    return enrichedStops.map((s, idx) => {
      const isPassed = idx < currentStopIndex
      const isCurrent = idx === currentStopIndex
      const isMyStop = userBoardingPoint && (
        s.name.toLowerCase().trim() === userBoardingPoint.toLowerCase().trim() ||
        s.name.toLowerCase().includes(userBoardingPoint.toLowerCase().trim()) ||
        userBoardingPoint.toLowerCase().includes(s.name.toLowerCase().trim())
      )

      // Dynamic ETA Calculation in Minutes
      const distFromBusKm = Math.max(0, (s.cumulativeKm || 0) - currentDist)
      const effectiveSpeed = busSpeed > 10 ? busSpeed : 32
      const etaMinutes = isPassed ? 0 : isCurrent ? 1 : Math.max(2, Math.round((distFromBusKm / effectiveSpeed) * 60) + (idx - currentStopIndex))

      return {
        ...s,
        isPassed,
        isCurrent,
        isMyStop,
        distFromBusKm: Math.round(distFromBusKm * 10) / 10,
        etaMinutes,
      }
    })
  }, [enrichedStops, currentStopIndex, userBoardingPoint, busSpeed])

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
    return `${journeyDirection === 'RETURN' ? 'Evening Return Leg' : 'Morning Inward Leg'} • ${d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', weekday: 'short' })}`
  }, [journeyDirection])

  return (
    <div className="bg-white rounded-2xl sm:rounded-3xl border border-[#C8E6C9] shadow-xl overflow-hidden font-sans text-slate-800 w-full max-w-4xl mx-auto">
      {/* 1. TOP HEADER (Gradient with Bus Plate, Route & Speedometer) */}
      <div className="bg-gradient-to-r from-[#1B5E20] via-[#2E7D32] to-[#40A047] text-white p-3 sm:p-5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <button
              onClick={() => window.history.back()}
              className="p-1.5 -ml-1 text-white/90 hover:text-white hover:bg-white/15 rounded-xl transition shrink-0"
              aria-label="Go Back"
            >
              <ChevronLeft size={20} />
            </button>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-sm sm:text-lg font-black tracking-wide text-white truncate">
                  {busNumber}
                </span>
                <span className="text-[10px] sm:text-xs px-2 py-0.5 rounded-full bg-white/20 text-emerald-100 font-bold border border-white/30 shrink-0">
                  Route {route?.id || '—'}
                </span>
                <span className={`text-[10px] sm:text-xs px-2 py-0.5 rounded-full font-black uppercase flex items-center gap-1 ${
                  isOnline ? 'bg-amber-400 text-slate-950 shadow-sm' : 'bg-slate-900/60 text-slate-200 border border-white/20'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-slate-950 animate-ping' : 'bg-slate-400'}`} />
                  {isOnline ? `${busSpeed} km/h` : 'Offline'}
                </span>
              </div>
              <h1 className="text-[11px] sm:text-sm font-medium text-emerald-100 truncate mt-0.5">
                {routeName.split(' - ')[1] || routeName}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="p-2 rounded-xl bg-white/20 hover:bg-white/30 text-white transition-all backdrop-blur-sm shadow-sm"
              title="Refresh Live Status"
            >
              <RefreshCw size={15} className={isRefreshing ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={onToggleMap}
              className="flex items-center gap-1 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-white text-[#1B5E20] text-[11px] sm:text-xs font-black shadow-md hover:bg-emerald-50 transition-all"
            >
              <MapIcon size={13} className="text-[#2E7D32]" />
              <span className="hidden xs:inline">{isMapVisible ? 'Hide Map' : 'Map View'}</span>
              <span className="xs:hidden">{isMapVisible ? 'Hide' : 'Map'}</span>
            </button>
          </div>
        </div>

        {/* Journey direction selector & Action Pills */}
        <div className="flex items-center justify-between gap-1.5 sm:gap-2 overflow-x-auto pb-0.5 pt-2.5 scrollbar-none text-[11px] sm:text-xs w-full">
          <div className="flex items-center gap-1 bg-black/20 p-0.5 rounded-full border border-white/20 shrink-0">
            <button
              onClick={() => onToggleJourneyDirection && onToggleJourneyDirection('MORNING')}
              className={`px-2.5 py-1 rounded-full font-black text-[10px] sm:text-xs transition-all ${
                journeyDirection === 'MORNING'
                  ? 'bg-amber-400 text-slate-950 shadow-sm'
                  : 'text-emerald-100 hover:text-white'
              }`}
            >
              Morning
            </button>
            <button
              onClick={() => onToggleJourneyDirection && onToggleJourneyDirection('RETURN')}
              className={`px-2.5 py-1 rounded-full font-black text-[10px] sm:text-xs transition-all ${
                journeyDirection === 'RETURN'
                  ? 'bg-indigo-400 text-slate-950 shadow-sm'
                  : 'text-emerald-100 hover:text-white'
              }`}
            >
              Return Trip
            </button>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => setShowAlarmModal(true)}
              className={`flex items-center gap-1 px-3 py-1 rounded-full font-bold shrink-0 transition-all border ${
                alarmActive
                  ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-md ring-2 ring-amber-200'
                  : 'bg-white/20 hover:bg-white/30 text-white border-white/20'
              }`}
            >
              <Bell size={12} className={alarmActive ? 'fill-slate-950' : ''} />
              <span>Alarm</span>
            </button>

            <button
              onClick={() => setShowSeatModal(true)}
              className="flex items-center gap-1 px-3 py-1 rounded-full bg-white/20 hover:bg-white/30 text-white font-bold border border-white/20 shrink-0 transition-all"
            >
              <Armchair size={12} />
              <span>Coach</span>
            </button>

            <button
              onClick={handleShare}
              className="flex items-center gap-1 px-3 py-1 rounded-full bg-white/20 hover:bg-white/30 text-white font-bold border border-white/20 shrink-0 transition-all"
            >
              <Share2 size={12} />
              <span>Share</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. ROUTE SELECTOR & SEARCH (Fully Responsive on Mobile) */}
      <div className="px-3 sm:px-4 py-2.5 bg-[#F1F8E9] border-b border-[#C8E6C9] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-[11px] font-black text-[#1B5E20] uppercase tracking-wider shrink-0">Route:</span>
          <select
            value={selectedRouteId}
            onChange={(e) => onSelectRoute(e.target.value)}
            className="text-xs font-bold px-2.5 py-1.5 bg-white border border-[#A5D6A7] rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#2E7D32] shadow-sm cursor-pointer w-full sm:w-auto"
          >
            <option value="ALL">Fleet Overview (All 23 Routes)</option>
            {fullRoutesList.map((r) => (
              <option key={r.id} value={r.id}>
                Route {r.id}: {r.busNumber} • {r.startPoint}
              </option>
            ))}
          </select>
        </div>

        <div className="relative w-full sm:w-60">
          <Search size={13} className="absolute left-2.5 top-2 text-slate-400" />
          <input
            type="text"
            placeholder="Search stop or landmark..."
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            className="w-full pl-7 pr-2.5 py-1 text-xs bg-white border border-[#A5D6A7] rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2E7D32] shadow-sm"
          />
        </div>
      </div>

      {/* 3. SUBHEADER: ARRIVAL | DATE | DEPARTURE */}
      <div className="grid grid-cols-12 items-center px-3 sm:px-6 py-2 bg-[#E8F5E9] border-b border-[#C8E6C9] text-[10px] sm:text-xs font-black text-[#1B5E20]">
        <div className="col-span-3 text-left truncate">
          <span>Arrival</span>
        </div>
        <div className="col-span-6 text-center font-black truncate px-1">
          <span>{todayStr}</span>
        </div>
        <div className="col-span-3 text-right truncate">
          <span>Departure</span>
        </div>
      </div>

      {/* 4. STATION / STOP UNBROKEN TIMELINE (Mobile Optimized, Zero Overflow) */}
      <div className="bg-white p-1.5 sm:p-4 max-h-[620px] overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-emerald-200">
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
                className={`group relative grid grid-cols-12 items-center min-h-[56px] sm:min-h-[64px] px-1.5 sm:px-3 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl transition-all cursor-pointer ${
                  stop.isMyStop
                    ? 'bg-[#E8F5E9] border-2 border-[#2E7D32] shadow-sm'
                    : stop.isCurrent
                    ? 'bg-emerald-50/70 border border-emerald-200'
                    : 'hover:bg-emerald-50/40 border border-transparent'
                }`}
              >
                {/* LEFT COLUMN: SCHEDULED ARRIVAL & LIVE ESTIMATED / DEPARTED */}
                <div className="col-span-3 text-left shrink-0 min-w-0 pr-1">
                  <p className={`text-[11px] sm:text-sm font-black truncate ${
                    stop.isPassed ? 'text-slate-400 line-through' : 'text-slate-900'
                  }`}>
                    {stop.stopTime || '06:40 AM'}
                  </p>
                  <p className={`text-[9px] sm:text-xs font-black mt-0.5 truncate ${
                    stop.isPassed
                      ? 'text-slate-400'
                      : stop.isCurrent
                      ? 'text-emerald-700 animate-pulse'
                      : isOnline
                      ? 'text-[#2E7D32]'
                      : 'text-amber-600'
                  }`}>
                    {stop.actualDepartureTime
                      ? `Dep ${stop.actualDepartureTime}`
                      : stop.isPassed
                      ? 'Departed'
                      : stop.isCurrent
                      ? 'Arriving Now'
                      : isOnline
                      ? `in ${stop.etaMinutes || 2}m`
                      : 'Scheduled'}
                  </p>
                </div>

                {/* CENTER COLUMN: 100% UNBROKEN CONTINUOUS VERTICAL GREEN LINE & NODES */}
                <div className="col-span-1 relative self-stretch flex items-center justify-center shrink-0">
                  {/* Vertical Green Track: Top Half */}
                  {!isFirst && (
                    <div
                      className={`absolute top-0 left-1/2 -translate-x-1/2 w-[5px] sm:w-[6px] h-1/2 z-0 ${
                        stop.isPassed ? 'bg-slate-300' : 'bg-[#40A047]'
                      }`}
                    />
                  )}

                  {/* Vertical Green Track: Bottom Half */}
                  {!isLast && (
                    <div
                      className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-[5px] sm:w-[6px] h-1/2 z-0 ${
                        stop.isPassed ? 'bg-slate-300' : 'bg-[#40A047]'
                      }`}
                    />
                  )}

                  {/* Circular Station Node on the Green Track */}
                  <div
                    className={`relative z-10 w-3.5 h-3.5 sm:w-[18px] sm:h-[18px] rounded-full border-2 sm:border-[3px] transition-all flex items-center justify-center ${
                      stop.isCurrent
                        ? 'bg-[#2E7D32] border-white ring-2 sm:ring-4 ring-emerald-300 scale-110 sm:scale-125 shadow-md'
                        : stop.isMyStop
                        ? 'bg-amber-400 border-white ring-2 sm:ring-4 ring-amber-200 scale-105 sm:scale-110 shadow-sm'
                        : stop.isPassed
                        ? 'bg-white border-slate-400'
                        : 'bg-white border-[#2E7D32]'
                    }`}
                  >
                    {stop.isMyStop && <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 bg-slate-900 rounded-full" />}
                  </div>
                </div>

                {/* MIDDLE COLUMN: STATION NAME, DISTANCE IN KM, PLATFORM BADGE, LIVE BUS PILL */}
                <div className="col-span-5 px-1.5 sm:px-3 min-w-0">
                  <div className="flex items-center gap-1 sm:gap-2 flex-wrap min-w-0">
                    <h3 className={`text-xs sm:text-sm font-black truncate ${
                      stop.isMyStop
                        ? 'text-[#1B5E20]'
                        : stop.isPassed
                        ? 'text-slate-400'
                        : 'text-slate-900'
                    }`}>
                      {stop.name}
                    </h3>
                    {stop.isMyStop && (
                      <span className="px-1.5 py-0.2 bg-[#2E7D32] text-white text-[9px] sm:text-[10px] font-black rounded-full shadow-sm flex items-center gap-0.5 shrink-0">
                        <Sparkles size={9} />
                        Your Stop
                      </span>
                    )}
                  </div>

                  {/* Live speech bubble directly below stop name for mobile friendliness */}
                  {stop.isCurrent && (
                    <div className="mt-1">
                      <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-[#1B5E20] text-white text-[9px] sm:text-xs font-bold rounded-lg shadow-md border border-emerald-300 max-w-full truncate">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-ping shrink-0" />
                        <Bus size={11} className="text-emerald-200 shrink-0" />
                        <span className="truncate">
                          {isOnline ? `Bus Approaching (${busSpeed} km/h)` : `Bus Parked Here`}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Distance & Dynamic ETA badge */}
                  <div className="flex items-center gap-1 sm:gap-1.5 text-[9px] sm:text-xs text-slate-500 font-semibold mt-0.5 flex-wrap">
                    <span className="px-1 py-0.2 bg-emerald-100/80 text-[#1B5E20] rounded font-bold text-[9px] sm:text-[10px]">
                      {stop.cumulativeKm} km
                    </span>
                    {!stop.isPassed && isOnline && stop.etaMinutes > 0 && (
                      <span className="px-1.5 py-0.2 bg-emerald-50 text-emerald-800 font-black rounded text-[9px] border border-emerald-200">
                        ETA ~{stop.etaMinutes} mins
                      </span>
                    )}
                    <span className="text-slate-300">•</span>
                    <span>Stop #{stop.stopOrder || index + 1}</span>
                  </div>
                </div>

                {/* RIGHT COLUMN: DEPARTURE TIME */}
                <div className="col-span-3 text-right shrink-0 min-w-0 pl-1">
                  <p className={`text-[11px] sm:text-sm font-black truncate ${
                    stop.isPassed ? 'text-slate-400' : 'text-slate-900'
                  }`}>
                    {stop.actualDepartureTime ? stop.actualDepartureTime : (isLast ? (journeyDirection === 'RETURN' ? 'Terminal' : 'HITAM') : (stop.stopTime || '06:45 AM'))}
                  </p>
                  <p className="text-[9px] sm:text-xs text-slate-400 font-bold mt-0.5 truncate">
                    {stop.actualDepartureTime ? 'Actual Dep' : (isLast ? 'Destination' : 'Scheduled')}
                  </p>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* 5. FOOTER & GOOGLE MAPS BUTTON (Responsive & Mobile Fitted) */}
      <div className="bg-[#E8F5E9] p-2.5 sm:p-4 border-t border-[#C8E6C9] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-[#C8E6C9] flex items-center justify-center text-[#1B5E20] shrink-0">
            <Navigation size={16} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] sm:text-sm font-black text-[#1B5E20] truncate">
              {isOnline ? `Approaching ${currentStop.name}` : `Route ${route?.id || 1} Corridor`}
            </p>
            <p className="text-[10px] sm:text-[11px] text-[#2E7D32] font-semibold truncate">
              {isOnline ? `Speed: ${busSpeed} km/h • Live GPS Active` : 'GPS telemetry standby'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={onToggleMap}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#2E7D32] hover:bg-[#1B5E20] text-white text-[11px] sm:text-xs font-black shadow-md transition-all"
          >
            <MapPin size={13} />
            <span>{isMapVisible ? 'Close Map' : 'View in Google Map'}</span>
          </button>

          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#C8E6C9] text-[#1B5E20] hover:bg-[#A5D6A7] flex items-center justify-center shadow-sm transition-all shrink-0"
            title="Refresh Live Telemetry"
          >
            <RefreshCw size={15} className={isRefreshing ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* 6. STOP ALARM MODAL (Fitted for mobile view) */}
      <AnimatePresence>
        {showAlarmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 max-w-md w-full shadow-2xl border border-emerald-100 text-slate-900 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                    <Bell size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-black text-slate-900">Stop Proximity Alarm</h3>
                    <p className="text-[10px] sm:text-xs text-slate-500">Wake up before your stop arrives</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAlarmModal(false)}
                  className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-3 sm:space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Select Stop</label>
                  <select
                    value={alarmStopName}
                    onChange={(e) => setAlarmStopName(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-bold bg-slate-50 border border-slate-300 text-slate-900 rounded-xl focus:ring-2 focus:ring-[#2E7D32] focus:outline-none"
                  >
                    {stops.map((s) => (
                      <option key={s.name} value={s.name}>
                        {s.name} ({s.stopTime || '07:00 AM'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Alert Timing</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[5, 10, 15].map((mins) => (
                      <button
                        key={mins}
                        onClick={() => setAlarmMinutesBefore(mins)}
                        className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                          alarmMinutesBefore === mins
                            ? 'bg-[#2E7D32] text-white border-[#2E7D32] shadow-sm'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {mins} Mins
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
                    className="flex-1 py-2.5 sm:py-3 bg-[#2E7D32] hover:bg-[#1B5E20] text-white text-xs font-bold rounded-xl shadow-md transition-all"
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
                      className="px-3 py-2.5 sm:py-3 bg-red-50 text-red-600 hover:bg-red-100 text-xs font-bold rounded-xl transition-all"
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

      {/* 7. COACH SEAT LAYOUT MODAL (Responsive grid for mobile) */}
      <AnimatePresence>
        {showSeatModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 max-w-lg w-full shadow-2xl border border-emerald-100 text-slate-900 max-h-[85vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-emerald-100 text-[#1B5E20] flex items-center justify-center">
                    <Armchair size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-black text-slate-900">Bus {busNumber} Layout</h3>
                    <p className="text-[10px] sm:text-xs text-slate-500">50 Seats • 2x2 Seating Plan</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowSeatModal(false)}
                  className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="bg-slate-50 rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-slate-200">
                <div className="flex justify-between items-center mb-2.5 text-[11px] font-bold text-slate-600">
                  <span>Front (Driver Cabin)</span>
                  <span className="px-2 py-0.2 bg-emerald-100 text-[#1B5E20] rounded-full text-[10px] font-bold">50 Seats</span>
                </div>
                <div className="grid grid-cols-5 gap-1.5 sm:gap-2 text-center text-[10px] sm:text-xs font-bold">
                  {Array.from({ length: 50 }, (_, i) => {
                    const seatNum = i + 1
                    const isOccupied = seatNum % 2 === 0 || seatNum < 15
                    return (
                      <div
                        key={seatNum}
                        className={`p-1.5 sm:p-2 rounded-lg sm:rounded-xl border flex flex-col items-center justify-center gap-0.5 transition-all ${
                          seatNum === 20 || seatNum === 29 || seatNum === 36
                            ? 'bg-[#2E7D32] text-white border-[#1B5E20] shadow-sm ring-1 ring-emerald-300'
                            : isOccupied
                            ? 'bg-slate-200 text-slate-600 border-slate-300'
                            : 'bg-white text-[#2E7D32] border-[#A5D6A7]'
                        }`}
                      >
                        <Armchair size={11} />
                        <span className="text-[9px] sm:text-[10px]">{seatNum}</span>
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
            className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 px-3.5 py-2.5 bg-slate-900 text-white text-xs font-bold rounded-xl shadow-2xl border border-slate-700 flex items-center gap-2 max-w-[90vw]"
          >
            <CheckCircle2 size={15} className="text-[#4CD964] shrink-0" />
            <span className="truncate">{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
