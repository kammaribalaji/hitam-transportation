import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../../hooks/useAuth.js'
import { liveLocationService, routeService } from '../../api/services.js'
import {
  haversineKm,
  effectiveBusHeading,
  normalizeHeading,
  headingDelta,
} from '../../utils/routeCoordinates.js'
import {
  Bus,
  Navigation,
  Zap,
  RefreshCw,
  Play,
  Pause,
  ZoomIn,
  ZoomOut,
  Compass,
  MapPin,
  WifiOff,
  Layers,
  Search,
  CheckCircle2,
  ListOrdered,
  LayoutGrid,
  Sun,
  Sunset,
  ArrowRightLeft,
  Gauge,
} from 'lucide-react'
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import WhereIsMyBusTimeline from '../../components/tracking/WhereIsMyBusTimeline.jsx'

const HITAM_CAMPUS_COORD = [17.5953257, 78.4530613]
const DEFAULT_CENTER = HITAM_CAMPUS_COORD
const POLL_INTERVAL_MS = 5000
const ANIM_MS = 3000

const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

function FitRouteBounds({ points, followBus, busPosition, isAllBusesView, allBusPositions }) {
  const map = useMap()

  useEffect(() => {
    if (followBus && busPosition) {
      map.flyTo(busPosition, Math.max(map.getZoom(), 14), { duration: 0.6 })
      return
    }

    if (isAllBusesView && allBusPositions?.length) {
      const valid = allBusPositions.filter(p => p && p[0] && p[1] && p[0] !== 0)
      if (valid.length > 0) {
        const bounds = L.latLngBounds([...valid, HITAM_CAMPUS_COORD])
        map.fitBounds(bounds, { padding: [36, 36] })
      }
      return
    }

    if (points?.length) {
      const bounds = L.latLngBounds(points)
      map.fitBounds(bounds, { padding: [36, 36] })
    }
  }, [map, points, followBus, busPosition, isAllBusesView, allBusPositions])

  return null
}

function createBusDivIcon(status, heading, routeName, iconSrc, isSelected = false, isOffline = false, speed = 0) {
  const size = isSelected ? 52 : 44
  const imgSize = isSelected ? 42 : 36
  const rot = normalizeHeading(heading)
  const isMoving = (status === 'LIVE' || status === 'online' || status === 'moving' || speed > 0) && !isOffline

  // If offline, use black bus icon; if online, use vibrant coloured icon
  const actualIconSrc = isOffline 
    ? '/assets/icons/bus-static-black.png' 
    : (iconSrc || '/assets/icons/bus-realistic-yellow.png')

  const html = `
    <div class="bus-marker ${isMoving ? 'bus-marker--moving' : 'bus-marker--idle'} ${isOffline ? 'bus-marker--offline' : ''} ${isSelected ? 'bus-marker--selected' : ''}" style="width:${size}px;height:${size}px;">
      ${isMoving ? '<span class="bus-marker__pulse-ring"></span>' : ''}
      <div class="bus-marker__body" style="width:${imgSize}px;height:${imgSize}px; ${isOffline ? 'filter: grayscale(100%) drop-shadow(0 2px 4px rgba(0,0,0,0.5));' : ''}">
        <div class="bus-marker__spin" style="transform:rotate(${rot.toFixed(1)}deg);">
          <img src="${actualIconSrc}" alt="Bus" style="width:${imgSize}px;height:${imgSize}px;object-fit:contain;" class="bus-marker__img" />
        </div>
      </div>
      <span class="bus-marker__route-label" style="${isOffline ? 'background:#0f172a; color:#94a3b8; border-color:#334155;' : ''}">${routeName || 'Bus'}${isOffline ? ' (Offline)' : ''}</span>
    </div>
  `

  return L.divIcon({
    className: 'bus-marker-wrap',
    html,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}

function createCampusDivIcon() {
  const size = 44
  const img = 36
  return L.divIcon({
    className: 'campus-marker-wrap',
    html: `
      <div class="campus-marker" style="width:${size}px;height:${size}px;">
        <img src="/assets/icons/clg-static.png" alt="HITAM" style="width:${img}px;height:${img}px;object-fit:contain;" class="campus-marker__img" />
        <span class="campus-marker__label">HITAM Campus</span>
      </div>
    `,
    iconSize: [size, size + 14],
    iconAnchor: [size / 2, size / 2],
  })
}

function createPickupPinDivIcon(isSelected = false, isStartOrEnd = false, stopIndex = 1) {
  const size = isStartOrEnd ? 34 : 28
  const color = isSelected ? '#16A34A' : isStartOrEnd ? '#059669' : '#F59E0B'
  return L.divIcon({
    className: 'pickup-pin-wrap',
    html: `
      <div class="pickup-pin" style="width:${size}px;height:${size}px; display:flex; align-items:center; justify-content:center;">
        <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 22s7-6.2 7-12A7 7 0 0 0 5 10c0 5.8 7 12 7 12Z" fill="${color}" stroke="#fff" stroke-width="2" stroke-linejoin="round"/>
          <circle cx="12" cy="10" r="3.2" fill="#fff"/>
        </svg>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
  })
}

function AnimatedBusMarker({ location, isAnimating, routeName, iconSrc, isSelected, onClick, fallbackPosition, isOffline, children }) {
  const markerRef = useRef(null)
  
  const actualLat = Number.isFinite(location?.latitude) && location.latitude !== 0 ? location.latitude : fallbackPosition?.[0] || HITAM_CAMPUS_COORD[0]
  const actualLng = Number.isFinite(location?.longitude) && location.longitude !== 0 ? location.longitude : fallbackPosition?.[1] || HITAM_CAMPUS_COORD[1]

  const displayPos = useRef([actualLat, actualLng])
  const smoothHeading = useRef(effectiveBusHeading(location))
  const rafRef = useRef(null)

  const targetHeading = useMemo(() => effectiveBusHeading(location), [location])

  const displayHeading = useMemo(() => {
    const prev = smoothHeading.current
    const delta = headingDelta(prev, targetHeading)
    const next = Math.abs(delta) > 90 ? targetHeading : normalizeHeading(prev + delta * 0.55)
    smoothHeading.current = next
    return next
  }, [targetHeading])

  const icon = useMemo(() => {
    const status = isOffline ? 'offline' : (isAnimating ? 'LIVE' : (location?.status || 'online'))
    return createBusDivIcon(status, displayHeading, routeName, iconSrc, isSelected, isOffline, location?.speed || 0)
  }, [isOffline, isAnimating, location?.status, location?.speed, displayHeading, routeName, iconSrc, isSelected])

  useEffect(() => {
    const marker = markerRef.current
    if (!marker) return

    const target = [actualLat, actualLng]
    if (!isAnimating || isOffline) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      displayPos.current = target
      marker.setLatLng(target)
      return
    }

    const from = displayPos.current
    const dist = Math.abs(from[0] - target[0]) + Math.abs(from[1] - target[1])
    if (dist < 1e-7 || dist > 0.08) {
      displayPos.current = target
      marker.setLatLng(target)
      return
    }

    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    const start = performance.now()
    const tick = (now) => {
      const t = Math.min((now - start) / ANIM_MS, 1)
      const e = easeInOutCubic(t)
      const lat = from[0] + (target[0] - from[0]) * e
      const lng = from[1] + (target[1] - from[1]) * e
      displayPos.current = [lat, lng]
      marker.setLatLng([lat, lng])
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick)
      }
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [actualLat, actualLng, isAnimating, isOffline])

  useEffect(() => {
    markerRef.current?.setIcon(icon)
  }, [icon])

  return (
    <Marker
      ref={markerRef}
      position={displayPos.current}
      icon={icon}
      zIndexOffset={isSelected ? 1000 : 100}
      eventHandlers={onClick ? { click: onClick } : undefined}
    >
      {children}
    </Marker>
  )
}

export default function LiveTrackingPage() {
  const { user } = useAuth()
  const initialRouteId = useMemo(() => {
    if (user?.assignedRouteId && String(user.assignedRouteId) !== '0') {
      return String(user.assignedRouteId)
    }
    return '15'
  }, [user])

  const [routes, setRoutes] = useState([])
  const [rawStops, setRawStops] = useState([])
  const [selectedRouteId, setSelectedRouteId] = useState(initialRouteId)
  const [viewMode, setViewMode] = useState('TIMELINE') // 'TIMELINE' | 'MAP' | 'SPLIT'
  const [isLive, setIsLive] = useState(true)
  const [followBus, setFollowBus] = useState(false)
  const [selectedPickupStopId, setSelectedPickupStopId] = useState(null)
  const [liveLocation, setLiveLocation] = useState(null)
  const [allLiveLocations, setAllLiveLocations] = useState([])
  const [trackingError, setTrackingError] = useState(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [selectedIconIndex, setSelectedIconIndex] = useState(0)
  
  // Journey Direction: 'MORNING' (To Campus) | 'RETURN' (From Campus)
  const [journeyDirection, setJourneyDirection] = useState('MORNING')
  const mapRef = useRef(null)

  const iconOptions = [
    { name: 'Realistic Yellow', src: '/assets/icons/bus-realistic-yellow.png' },
    { name: 'Side Modern', src: '/assets/icons/bus-opt1-side.png' },
    { name: 'City Bus', src: '/assets/icons/bus-opt2-cartoon.png' },
    { name: 'Transit Line', src: '/assets/icons/bus-opt4-line.png' },
  ]

  const activeIconSrc = iconOptions[selectedIconIndex].src
  const isAllBusesMode = selectedRouteId === 'ALL'
  const route = routes.find(r => String(r.id) === String(selectedRouteId)) || null

  const fullRoutesList = useMemo(() => {
    const existingMap = new Map(routes.map(r => [String(r.id), r]))
    return Array.from({ length: 23 }, (_, i) => {
      const id = String(i + 1)
      if (existingMap.has(id)) return existingMap.get(id)
      return {
        id,
        name: `Route ${id} - City Corridor to HITAM Campus`,
        busNumber: `TS 09 UB ${1200 + parseInt(id)}`,
        startPoint: `Stop ${id}`,
        endPoint: 'HITAM College',
        pickupPoint: 'Campus Gate',
      }
    })
  }, [routes])

  useEffect(() => {
    routeService.getAll()
      .then(r => {
        const list = r.data || []
        setRoutes(list)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!selectedRouteId || selectedRouteId === 'ALL') {
      setRawStops([])
      return
    }
    routeService.getStops(selectedRouteId)
      .then(r => {
        const stopList = r.data?.stops || []
        setRawStops(stopList)
        if (user?.boardingPoint) {
          const matched = stopList.find(s => s.name?.toLowerCase().includes(user.boardingPoint.toLowerCase()))
          if (matched) setSelectedPickupStopId(matched.id)
        }
      })
      .catch(() => setRawStops([]))
  }, [selectedRouteId, user?.boardingPoint])

  // Determine Campus Arrival & Auto Set Return Journey
  const hasReachedCampus = useMemo(() => {
    if (liveLocation?.hasReachedCampus) return true
    if (liveLocation?.latitude && liveLocation?.longitude) {
      const distToCampus = haversineKm([liveLocation.latitude, liveLocation.longitude], HITAM_CAMPUS_COORD)
      if (distToCampus <= 1.2) return true
    }
    const currentHour = new Date().getHours()
    return currentHour >= 13
  }, [liveLocation])

  // Ordered stops based on journey direction
  const activeStops = useMemo(() => {
    if (!rawStops || rawStops.length === 0) return []
    if (journeyDirection === 'RETURN') {
      // Reverse stops for return journey with calculated evening departure schedule
      const reversed = [...rawStops].reverse()
      return reversed.map((s, idx) => {
        // Calculate evening departure (e.g. Campus: 04:30 PM, Stop 1: 04:45 PM, etc.)
        const baseMin = 30 + idx * 5
        const hour = 4 + Math.floor(baseMin / 60)
        const minute = baseMin % 60
        const eveningTime = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')} PM`
        return {
          ...s,
          stopTime: eveningTime,
          stopOrder: idx + 1,
          isReturnTrip: true,
        }
      })
    }
    return rawStops
  }, [rawStops, journeyDirection])

  // Strictly connect through all stop points in exact sequence!
  const roadPath = useMemo(() => {
    if (!activeStops || activeStops.length === 0) return []
    const stopPoints = activeStops.map(s => [s.latitude, s.longitude]).filter(p => p[0] && p[1])
    if (journeyDirection === 'RETURN') {
      return [HITAM_CAMPUS_COORD, ...stopPoints]
    }
    return [...stopPoints, HITAM_CAMPUS_COORD]
  }, [activeStops, journeyDirection])

  const fetchAllLocations = useCallback(async () => {
    try {
      const res = await liveLocationService.getAll()
      if (Array.isArray(res.data)) {
        setAllLiveLocations(res.data)
      }
    } catch {}
  }, [])

  const fetchSelectedLocation = useCallback(async () => {
    if (!selectedRouteId || selectedRouteId === 'ALL') return
    try {
      const res = await liveLocationService.getByRoute(selectedRouteId)
      setLiveLocation(res.data)
      setTrackingError(null)
    } catch (err) {
      setTrackingError(err.response?.data?.message || 'Live tracking standby')
    }
  }, [selectedRouteId])

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true)
    await Promise.all([fetchAllLocations(), fetchSelectedLocation()])
    setIsRefreshing(false)
  }, [fetchAllLocations, fetchSelectedLocation])

  useEffect(() => {
    if (!isLive) return
    let timer = null
    let cancelled = false

    const runPoll = async () => {
      if (cancelled) return
      await Promise.all([
        fetchAllLocations(),
        selectedRouteId !== 'ALL' ? fetchSelectedLocation() : Promise.resolve(),
      ])
      if (!cancelled && !document.hidden) {
        timer = setTimeout(runPoll, POLL_INTERVAL_MS)
      }
    }

    runPoll()
    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [isLive, selectedRouteId, fetchAllLocations, fetchSelectedLocation])

  // Determine bus position (or fallback to first stop coordinate)
  const busPosition = useMemo(() => {
    if (liveLocation && Number.isFinite(liveLocation.latitude) && Number.isFinite(liveLocation.longitude) && (liveLocation.latitude !== 0 || liveLocation.longitude !== 0)) {
      return [liveLocation.latitude, liveLocation.longitude]
    }
    if (activeStops.length > 0 && activeStops[0].latitude) {
      return [activeStops[0].latitude, activeStops[0].longitude]
    }
    return HITAM_CAMPUS_COORD
  }, [liveLocation, activeStops])

  const isBusOnline = useMemo(() => {
    if (!liveLocation) return false
    return (
      (liveLocation.status === 'online' || liveLocation.status === 'LIVE' || liveLocation.status === 'moving' || liveLocation.speed > 0) &&
      !liveLocation.isStale &&
      liveLocation.latitude !== 0
    )
  }, [liveLocation])

  const allBusPositions = useMemo(() => {
    return allLiveLocations.map(b => [b.latitude, b.longitude]).filter(p => p[0] && p[1] && p[0] !== 0)
  }, [allLiveLocations])

  const fleetOnlineCount = useMemo(() => {
    return allLiveLocations.filter(b => (b.status === 'online' || b.status === 'LIVE' || (b.speed && b.speed > 0)) && !b.isStale && b.latitude !== 0).length
  }, [allLiveLocations])

  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="space-y-3 sm:space-y-4 max-w-5xl mx-auto pb-8 px-2 sm:px-4 w-full overflow-hidden">
      {/* 1. TOP VIEW & JOURNEY DIRECTION SWITCHER */}
      <div className="flex flex-col gap-2.5 bg-white p-2.5 sm:p-3 rounded-2xl border border-emerald-100 shadow-sm w-full">
        {/* Morning vs Return Trip Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl w-full sm:w-auto">
            <button
              onClick={() => setJourneyDirection('MORNING')}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                journeyDirection === 'MORNING'
                  ? 'bg-amber-500 text-white shadow-sm ring-2 ring-amber-300'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sun size={13} className="shrink-0" />
              <span>🌅 Morning (To Campus)</span>
            </button>

            <button
              onClick={() => setJourneyDirection('RETURN')}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                journeyDirection === 'RETURN'
                  ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-300'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sunset size={13} className="shrink-0" />
              <span>🌆 Return Trip (From Campus)</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {hasReachedCampus ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-[10px] sm:text-xs border border-emerald-200">
                <CheckCircle2 size={12} className="text-emerald-600" />
                Bus Reached Campus
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 font-bold text-[10px] sm:text-xs border border-amber-200">
                <Bus size={12} className="text-amber-600" />
                In Transit to Campus
              </span>
            )}

            <div className="flex items-center gap-1.5">
              <span className={`w-2.5 h-2.5 rounded-full ${isBusOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
              <span className="text-[11px] font-black text-slate-700">
                {isBusOnline ? 'Bus Online (Colour Icon)' : 'Bus Offline (Black Icon)'}
              </span>
            </div>
          </div>
        </div>

        {/* View Mode Tabs: Timeline vs Map vs Split */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 sm:gap-2 w-full sm:w-auto">
            <button
              onClick={() => setViewMode('TIMELINE')}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-xs font-black transition-all ${
                viewMode === 'TIMELINE'
                  ? 'bg-[#40A047] text-white shadow-md shadow-green-600/20 ring-2 ring-emerald-300'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <ListOrdered size={15} />
              <span className="hidden sm:inline">Station Timeline</span>
              <span className="sm:hidden">Timeline</span>
            </button>

            <button
              onClick={() => setViewMode('MAP')}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-xs font-black transition-all ${
                viewMode === 'MAP'
                  ? 'bg-[#40A047] text-white shadow-md shadow-green-600/20 ring-2 ring-emerald-300'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Navigation size={15} />
              <span className="hidden sm:inline">Interactive Live Map</span>
              <span className="sm:hidden">Live Map</span>
            </button>

            <button
              onClick={() => setViewMode('SPLIT')}
              className={`hidden lg:flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black transition-all ${
                viewMode === 'SPLIT'
                  ? 'bg-[#40A047] text-white shadow-md shadow-green-600/20 ring-2 ring-emerald-300'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <LayoutGrid size={15} />
              <span>Split View</span>
            </button>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
            <button
              onClick={() => setIsLive(v => !v)}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                isLive ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-slate-100 text-slate-600 border-slate-300'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
              <span>{isLive ? 'Live Stream Active' : 'Stream Paused'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. MAIN VIEW CONTENT: TIMELINE / MAP / SPLIT */}
      <div className={`grid gap-4 ${viewMode === 'SPLIT' ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
        {/* TIMELINE COMPONENT (Where Is My Bus Style) */}
        {(viewMode === 'TIMELINE' || viewMode === 'SPLIT') && (
          <WhereIsMyBusTimeline
            route={route || { id: selectedRouteId, name: `Route ${selectedRouteId}`, busNumber: `TS 09 UB ${1200 + parseInt(selectedRouteId || 1)}` }}
            stops={activeStops}
            liveLocation={liveLocation}
            userBoardingPoint={user?.boardingPoint}
            journeyDirection={journeyDirection}
            onToggleJourneyDirection={(d) => setJourneyDirection(d)}
            hasReachedCampus={hasReachedCampus}
            onToggleMap={() => setViewMode(viewMode === 'TIMELINE' ? 'MAP' : 'TIMELINE')}
            isMapVisible={viewMode === 'MAP' || viewMode === 'SPLIT'}
            onRefresh={handleRefresh}
            isRefreshing={isRefreshing}
            fullRoutesList={fullRoutesList}
            selectedRouteId={selectedRouteId}
            onSelectRoute={(rId) => {
              setSelectedRouteId(rId)
              setFollowBus(false)
            }}
          />
        )}

        {/* MAP COMPONENT */}
        {(viewMode === 'MAP' || viewMode === 'SPLIT') && (
          <div className="bg-white rounded-3xl border border-emerald-100 shadow-xl overflow-hidden">
            <div className="p-4 bg-gradient-to-r from-emerald-950 via-emerald-900 to-emerald-800 text-white flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-black text-white">
                    {isAllBusesMode ? 'HITAM Fleet Overview (All Routes)' : (route?.name || `Route ${selectedRouteId}`)}
                  </h3>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                    isBusOnline ? 'bg-emerald-500 text-white shadow-sm' : 'bg-slate-800 text-slate-300 border border-slate-700'
                  }`}>
                    {isBusOnline ? 'LIVE GPS' : 'STANDBY / OFFLINE'}
                  </span>
                </div>
                <p className="text-[11px] text-emerald-200 mt-0.5">
                  {isAllBusesMode 
                    ? `${fleetOnlineCount} Active Fleet Buses` 
                    : `${route?.busNumber || 'TS 09 UB 1215'} • ${journeyDirection === 'RETURN' ? 'Return Leg (Campus -> City)' : 'Morning Leg (City -> Campus)'}`}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setFollowBus(v => !v)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    followBus ? 'bg-amber-400 text-slate-900 shadow-md' : 'bg-white/15 text-white hover:bg-white/25'
                  }`}
                >
                  {followBus ? 'Following Bus' : 'Follow Bus'}
                </button>
              </div>
            </div>

            <div className="relative" style={{ height: viewMode === 'SPLIT' ? '560px' : '500px' }}>
              <MapContainer
                ref={mapRef}
                center={busPosition || DEFAULT_CENTER}
                zoom={13}
                style={{ height: '100%', width: '100%' }}
                zoomControl={false}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <FitRouteBounds
                  points={roadPath}
                  followBus={followBus}
                  busPosition={busPosition}
                  isAllBusesView={isAllBusesMode}
                  allBusPositions={allBusPositions}
                />

                {/* Road Polyline Connecting Strictly Through All Stop Points */}
                {roadPath && roadPath.length > 1 && (
                  <>
                    <Polyline positions={roadPath} pathOptions={{ color: '#1B5E20', weight: 6, opacity: 0.85 }} />
                    <Polyline positions={roadPath} pathOptions={{ color: '#40A047', weight: 3, opacity: 0.95 }} />
                  </>
                )}

                {/* HITAM Campus Destination Marker */}
                <Marker position={HITAM_CAMPUS_COORD} icon={createCampusDivIcon()}>
                  <Popup>
                    <div className="text-center font-bold text-xs p-1">
                      <p className="text-[#40A047]">HITAM College Campus</p>
                      <p className="text-gray-500 text-[10px]">
                        {journeyDirection === 'RETURN' ? 'Return Trip Origin (Dep 04:30 PM)' : 'Morning Destination Hub'}
                      </p>
                    </div>
                  </Popup>
                </Marker>

                {/* Stops for Selected Route ONLY */}
                {!isAllBusesMode && activeStops.map((s, idx) => (
                  <Marker
                    key={s.id || s.name + idx}
                    position={[s.latitude, s.longitude]}
                    icon={createPickupPinDivIcon(
                      s.id === selectedPickupStopId || s.name?.toLowerCase().includes(user?.boardingPoint?.toLowerCase()),
                      idx === 0 || idx === activeStops.length - 1,
                      idx + 1
                    )}
                  >
                    <Popup>
                      <div className="p-1 text-xs">
                        <p className="font-extrabold text-slate-900">{s.name}</p>
                        <p className="text-emerald-700 font-bold text-[11px]">
                          {journeyDirection === 'RETURN' ? `Evening Drop: ${s.stopTime}` : `Scheduled Pick: ${s.stopTime || '07:00 AM'}`}
                        </p>
                        <p className="text-gray-400 text-[10px]">Stop #{s.stopOrder || idx + 1}</p>
                      </div>
                    </Popup>
                  </Marker>
                ))}

                {/* Live Bus Marker (Black when Offline, Colour when Online) */}
                {!isAllBusesMode && (
                  <AnimatedBusMarker
                    location={liveLocation}
                    isAnimating={isLive}
                    isOffline={!isBusOnline}
                    fallbackPosition={busPosition}
                    routeName={route?.busNumber || `Bus ${selectedRouteId}`}
                    iconSrc={activeIconSrc}
                    isSelected={true}
                  >
                    <Popup>
                      <div className="p-2 text-xs font-sans">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-2.5 h-2.5 rounded-full ${isBusOnline ? 'bg-green-500' : 'bg-slate-800'}`} />
                          <p className="font-black text-slate-900">{route?.busNumber || 'Fleet Bus'}</p>
                        </div>
                        <p className="text-gray-600 font-medium text-[11px] mt-0.5">{route?.name}</p>
                        <div className="mt-2 pt-2 border-t border-slate-100 text-[11px] text-gray-600 space-y-1">
                          <p>
                            Speed: <span className="font-bold text-slate-900">{Math.round(liveLocation?.speed || 0)} km/h</span>
                          </p>
                          <p>
                            Status: <span className={`font-bold ${isBusOnline ? 'text-emerald-600' : 'text-slate-500'}`}>
                              {isBusOnline ? 'LIVE GPS ACTIVE (Colour)' : 'OFFLINE / STANDBY (Black)'}
                            </span>
                          </p>
                          <p>
                            Journey: <span className="font-bold text-slate-800">
                              {journeyDirection === 'RETURN' ? 'Return Trip (From Campus)' : 'Morning Trip (To Campus)'}
                            </span>
                          </p>
                        </div>
                      </div>
                    </Popup>
                  </AnimatedBusMarker>
                )}

                {/* Fleet markers in ALL view */}
                {isAllBusesMode && allLiveLocations.map(loc => {
                  const isLocOnline = (loc.status === 'online' || loc.status === 'LIVE' || (loc.speed && loc.speed > 0)) && !loc.isStale && loc.latitude !== 0
                  return (
                    <AnimatedBusMarker
                      key={loc.deviceId || loc.routeId}
                      location={loc}
                      isAnimating={isLive}
                      isOffline={!isLocOnline}
                      fallbackPosition={[loc.latitude, loc.longitude]}
                      routeName={`R${loc.routeId}`}
                      iconSrc={activeIconSrc}
                      isSelected={false}
                      onClick={() => {
                        setSelectedRouteId(String(loc.routeId))
                        setViewMode('TIMELINE')
                      }}
                    />
                  )
                })}
              </MapContainer>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  )
}

