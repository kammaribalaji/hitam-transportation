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
} from 'lucide-react'
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import allPolylines from '../../data/polylines/allPolylines.json'

const HITAM_CAMPUS_COORD = [17.5953257, 78.4530613]
const DEFAULT_CENTER = HITAM_CAMPUS_COORD
const POLL_INTERVAL_MS = 5000
const STALE_AFTER_SEC = 120
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
      map.fitBounds(bounds, { padding: [32, 32] })
    }
  }, [map, points, followBus, busPosition, isAllBusesView, allBusPositions])

  return null
}

function createBusDivIcon(status, heading, routeName, iconSrc = '/assets/icons/bus-realistic-yellow.png', isSelected = false) {
  const size = isSelected ? 52 : 44
  const imgSize = isSelected ? 42 : 36
  const rot = normalizeHeading(heading)
  const isMoving = status === 'LIVE' || status === 'online' || status === 'moving'
  const isIdle = status === 'STANDBY' || status === 'STALE' || status === 'ACK' || status === 'ack' || status === 'idle'

  const html = `
    <div class="bus-marker ${isMoving ? 'bus-marker--moving' : isIdle ? 'bus-marker--idle' : ''} ${isSelected ? 'bus-marker--selected' : ''}" style="width:${size}px;height:${size}px;">
      ${isMoving || isSelected ? '<span class="bus-marker__pulse-ring"></span>' : ''}
      <div class="bus-marker__body" style="width:${imgSize}px;height:${imgSize}px;">
        <div class="bus-marker__spin" style="transform:rotate(${rot.toFixed(1)}deg);">
          <img src="${iconSrc}" alt="Bus" style="width:${imgSize}px;height:${imgSize}px;object-fit:contain;" class="bus-marker__img" />
        </div>
      </div>
      <span class="bus-marker__route-label">${routeName || 'Bus'}</span>
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

function createPickupPinDivIcon(isSelected = false) {
  const size = 32
  const color = isSelected ? '#16A34A' : '#F59E0B'
  return L.divIcon({
    className: 'pickup-pin-wrap',
    html: `
      <div class="pickup-pin" style="width:${size}px;height:${size}px;">
        <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 22s7-6.2 7-12A7 7 0 0 0 5 10c0 5.8 7 12 7 12Z" fill="${color}" stroke="#fff" stroke-width="1.8" stroke-linejoin="round"/>
          <circle cx="12" cy="10" r="2.8" fill="#fff"/>
        </svg>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
  })
}

function AnimatedBusMarker({ location, isAnimating, routeName, iconSrc, isSelected, onClick, children }) {
  const markerRef = useRef(null)
  const displayPos = useRef(location ? [location.latitude, location.longitude] : [0, 0])
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
    const status = isAnimating ? 'LIVE' : (location?.status === 'ack' ? 'STANDBY' : (location?.status || 'offline'))
    return createBusDivIcon(status, displayHeading, routeName, iconSrc, isSelected)
  }, [isAnimating, location?.status, displayHeading, routeName, iconSrc, isSelected])

  useEffect(() => {
    const marker = markerRef.current
    if (!marker || !location) return

    const target = [location.latitude, location.longitude]
    if (!isAnimating) {
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
  }, [location, isAnimating])

  useEffect(() => {
    markerRef.current?.setIcon(icon)
  }, [icon])

  if (!location || !Number.isFinite(location.latitude) || !Number.isFinite(location.longitude) || (location.latitude === 0 && location.longitude === 0)) {
    return null
  }

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
  const [routes, setRoutes] = useState([])
  const [stops, setStops] = useState([])
  const [selectedRouteId, setSelectedRouteId] = useState('ALL')
  const [isLive, setIsLive] = useState(true)
  const [followBus, setFollowBus] = useState(false)
  const [selectedPickupStopId, setSelectedPickupStopId] = useState(null)
  const [liveLocation, setLiveLocation] = useState(null)
  const [allLiveLocations, setAllLiveLocations] = useState([])
  const [trackingError, setTrackingError] = useState(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [selectedIconIndex, setSelectedIconIndex] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const mapRef = useRef(null)

  const iconOptions = [
    { name: 'Realistic Yellow', src: '/assets/icons/bus-realistic-yellow.png' },
    { name: 'Side Modern', src: '/assets/icons/bus-opt1-side.png' },
    { name: 'City Bus', src: '/assets/icons/bus-opt2-cartoon.png' },
    { name: 'Transit Line', src: '/assets/icons/bus-opt4-line.png' },
  ]

  const activeIconSrc = iconOptions[selectedIconIndex].src
  const isAllBusesMode = selectedRouteId === 'ALL'
  const route = routes.find(r => r.id === selectedRouteId) || (selectedRouteId === '12' ? { id: '12', name: 'Route 12 - Sangareddy Old Bus Stand to HITAM College', busNumber: 'TS 09 AB 1234' } : null)

  const fullRoutesList = useMemo(() => {
    const existingMap = new Map(routes.map(r => [String(r.id), r]))
    return Array.from({ length: 23 }, (_, i) => {
      const id = String(i + 1)
      if (existingMap.has(id)) return existingMap.get(id)
      return {
        id,
        name: id === '12' ? 'Route 12 - Sangareddy Old Bus Stand to HITAM College' : `Route ${id} - City Corridor to HITAM Campus`,
        busNumber: id === '12' ? 'TS 09 AB 1234' : `TS 09 UB ${1200 + parseInt(id)}`,
        startPoint: id === '12' ? 'Sangareddy Old Bus Stand' : `Stop ${id}`,
        endPoint: 'HITAM College',
        pickupPoint: id === '12' ? 'Sangareddy Old Bus Stand' : 'Campus Gate',
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
      setStops([])
      return
    }
    routeService.getStops(selectedRouteId)
      .then(r => {
        const stopList = r.data?.stops || []
        setStops(stopList)
        if (user?.boardingPoint) {
          const matched = stopList.find(s => s.name?.toLowerCase().includes(user.boardingPoint.toLowerCase()))
          if (matched) setSelectedPickupStopId(matched.id)
        }
      })
      .catch(() => setStops([]))
  }, [selectedRouteId, user?.boardingPoint])

  const [dynamicPolyline, setDynamicPolyline] = useState(null)

  useEffect(() => {
    if (!selectedRouteId || selectedRouteId === 'ALL') {
      setDynamicPolyline(null)
      return
    }
    const key = `route${selectedRouteId}`
    if (allPolylines && allPolylines[key] && allPolylines[key].length > 1) {
      setDynamicPolyline(allPolylines[key])
    } else {
      routeService.getPolyline(selectedRouteId)
        .then(res => {
          if (res.data?.coordinates && res.data.coordinates.length > 1) {
            setDynamicPolyline(res.data.coordinates)
          }
        })
        .catch(() => {})
    }
  }, [selectedRouteId])

  const routePoints = useMemo(() => stops.map(s => [s.latitude, s.longitude]), [stops])

  const roadPath = useMemo(() => {
    if (dynamicPolyline && dynamicPolyline.length > 1) return dynamicPolyline
    const key = `route${selectedRouteId}`
    if (allPolylines && allPolylines[key] && allPolylines[key].length > 1) {
      return allPolylines[key]
    }
    return routePoints
  }, [dynamicPolyline, selectedRouteId, routePoints])

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
      setTrackingError(err.response?.data?.message || 'Live tracking unavailable')
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

    const onVisibility = () => {
      clearTimeout(timer)
      if (!document.hidden) runPoll()
    }
    document.addEventListener('visibilitychange', onVisibility)

    runPoll()
    return () => {
      cancelled = true
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [isLive, selectedRouteId, fetchAllLocations, fetchSelectedLocation])

  const busPosition = liveLocation && liveLocation.latitude && liveLocation.latitude !== 0 ? [liveLocation.latitude, liveLocation.longitude] : null

  const lastPingAgeSec = liveLocation?.lastPingAt
    ? Math.max(0, Math.floor((Date.now() - new Date(liveLocation.lastPingAt).getTime()) / 1000))
    : null
  const isStale = liveLocation?.isStale === true || (lastPingAgeSec != null && lastPingAgeSec > STALE_AFTER_SEC)
  const isOffline = (liveLocation?.status === 'offline' && (!liveLocation?.latitude || liveLocation?.latitude === 0))

  const gpsStatus = trackingError
    ? 'ERROR'
    : !liveLocation
      ? 'LOADING'
      : liveLocation?.status === 'online' || (liveLocation?.speed && liveLocation.speed > 0)
        ? 'LIVE'
        : liveLocation?.status === 'ack' || (liveLocation?.latitude && liveLocation.latitude !== 0)
          ? 'STANDBY'
          : isOffline
            ? 'OFFLINE'
            : isStale
              ? 'STALE'
              : 'LIVE'

  const STATUS_UI = {
    LIVE: { label: 'LIVE GPS', badge: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
    STANDBY: { label: 'CONNECTED (STANDBY)', badge: 'bg-emerald-100 text-emerald-800', dot: 'bg-emerald-500' },
    ACK: { label: 'CONNECTED', badge: 'bg-emerald-100 text-emerald-800', dot: 'bg-emerald-500' },
    STALE: { label: lastPingAgeSec != null ? `STALE ${lastPingAgeSec}s` : 'STALE', badge: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-500' },
    OFFLINE: { label: 'OFFLINE', badge: 'bg-red-100 text-red-600', dot: 'bg-red-500' },
    ERROR: { label: 'GPS/API ERROR', badge: 'bg-red-100 text-red-600', dot: 'bg-red-500' },
    LOADING: { label: 'CONNECTING...', badge: 'bg-gray-100 text-gray-500', dot: 'bg-gray-400' },
  }
  const statusUi = STATUS_UI[gpsStatus]
  const gpsLabelText = { LIVE: 'Live', STANDBY: 'Active Standby', STALE: 'Stale', OFFLINE: 'Offline', ACK: 'Active', ERROR: 'Error', LOADING: 'Connecting...' }[gpsStatus]

  const tailPoints = useMemo(() => {
    const tail = liveLocation?.tail
    if (!Array.isArray(tail) || tail.length < 2) return []
    return tail
      .map(p => [Number(p?.latitude), Number(p?.longitude)])
      .filter(([lat, lng]) => Number.isFinite(lat) && Number.isFinite(lng))
  }, [liveLocation])

  const stopIdx = stops.length === 0 || !liveLocation ? 0 : stops.reduce((bestIdx, point, idx) => (
    haversineKm([point.latitude, point.longitude], busPosition) < haversineKm([stops[bestIdx].latitude, stops[bestIdx].longitude], busPosition) ? idx : bestIdx
  ), 0)

  const nextStop = stops[Math.min(stopIdx + 1, Math.max(stops.length - 1, 0))]
  const nextStopCoord = nextStop ? [nextStop.latitude, nextStop.longitude] : null
  const nextStopName = nextStop?.name || 'Destination'
  const nextStopTime = nextStop?.stopTime || ''

  const myPickupStop = stops.find(s => s.id === selectedPickupStopId) || stops.find(s => s.name?.toLowerCase().includes((user?.boardingPoint || '').toLowerCase()))
  const distToMyPickup = busPosition && myPickupStop ? haversineKm(busPosition, [myPickupStop.latitude, myPickupStop.longitude]).toFixed(1) : null
  const etaToMyPickupMins = distToMyPickup != null ? Math.max(1, Math.round(parseFloat(distToMyPickup) * 2.2)) : null

  const distToNext = busPosition && nextStopCoord ? haversineKm(busPosition, nextStopCoord).toFixed(1) : null
  const etaMins = distToNext != null ? Math.max(1, Math.round(parseFloat(distToNext) * 2.2)) : null
  const displaySpeed = liveLocation && liveLocation.speed > 0 ? Math.round(liveLocation.speed) : 0
  const etaTime = etaMins != null
    ? new Date(Date.now() + etaMins * 60000).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    : '--'

  const campusIcon = useMemo(() => createCampusDivIcon(), [])

  const getStopIcon = useCallback((idx, stop) => {
    const isPickup = myPickupStop && myPickupStop.id === stop.id
    if (isPickup) return createPickupPinDivIcon(true)

    const passed = idx < stopIdx
    const isNext = idx === stopIdx
    const isDest = idx === stops.length - 1
    const color = isDest ? '#EF4444' : isNext ? '#F59E0B' : passed ? '#10B981' : '#3B82F6'

    return L.divIcon({
      className: 'stop-marker-icon',
      html: `<div style="width:12px;height:12px;border-radius:9999px;background:${color};border:2px solid #ffffff;box-shadow:0 2px 8px rgba(0,0,0,0.2);"></div>`,
      iconSize: [12, 12],
      iconAnchor: [6, 6],
    })
  }, [stopIdx, stops.length, myPickupStop])

  const fleetOnlineCount = useMemo(() => {
    return allLiveLocations.filter(b => b.status === 'online' || b.status === 'ack' || (b.latitude && b.latitude !== 0)).length
  }, [allLiveLocations])

  const allBusPositions = useMemo(() => {
    return allLiveLocations.map(b => [b.latitude, b.longitude]).filter(p => p[0] && p[1] && p[0] !== 0)
  }, [allLiveLocations])

  const showOfflineScreen = !isAllBusesMode && gpsStatus === 'OFFLINE' && (!busPosition || (busPosition[0] === 0 && busPosition[1] === 0))

  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 max-w-5xl mx-auto pb-8">
      {/* TOP BUS SELECTION BAR ABOVE MAP */}
      <div className="bg-white rounded-2xl p-3.5 border border-gray-100 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setSelectedRouteId('ALL')
                setFollowBus(false)
              }}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm ${isAllBusesMode ? 'bg-[#40A047] text-white ring-2 ring-emerald-300' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              <Layers size={15} />
              All Buses (Fleet Map)
              <span className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] ${isAllBusesMode ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800'}`}>
                ${fullRoutesList.length} Buses
              </span>
            </button>

            <div className="relative">
              <select
                value={selectedRouteId}
                onChange={(e) => setSelectedRouteId(e.target.value)}
                className="text-xs font-bold px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#40A047]"
              >
                <option value="ALL">All Fleet Buses (${fullRoutesList.length})</option>
                {fullRoutesList.map(r => (
                  <option key={r.id} value={r.id}>
                    Route ${r.id} (${r.busNumber})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-xl px-2 py-1">
            <span className="text-[10px] font-bold text-gray-400">BUS ICON:</span>
            {iconOptions.map((opt, idx) => (
              <button
                key={opt.name}
                onClick={() => setSelectedIconIndex(idx)}
                title={opt.name}
                className={`p-1 rounded-lg transition-all ${selectedIconIndex === idx ? 'bg-green-100 ring-1 ring-[#40A047]' : 'hover:bg-gray-200 opacity-60 hover:opacity-100'}`}
              >
                <img src={opt.src} alt={opt.name} className="w-5 h-5 object-contain" />
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 scrollbar-thin">
          <button
            onClick={() => setSelectedRouteId('ALL')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all ${isAllBusesMode ? 'bg-[#40A047] text-white shadow' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            All Fleet
          </button>
          {fullRoutesList.map(r => {
            const isSel = selectedRouteId === r.id
            const loc = allLiveLocations.find(l => String(l.routeId) === String(r.id))
            const isOnline = loc?.status === 'online' || loc?.status === 'ack' || (loc?.latitude && loc.latitude !== 0)
            return (
              <button
                key={r.id}
                onClick={() => {
                  setSelectedRouteId(r.id)
                  setFollowBus(false)
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all border ${isSel ? 'bg-[#40A047] text-white border-[#40A047] shadow-md' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
              >
                <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-gray-300'}`} />
                Route ${r.id}
                <span className={`text-[10px] font-normal ${isSel ? 'text-green-100' : 'text-gray-400'}`}>
                  (${r.busNumber.split(' ').slice(-1)[0] || r.id})
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* MAIN CARD WITH MAP */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-5 flex items-center justify-between border-b border-gray-100">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-base font-bold text-gray-900">
                {isAllBusesMode ? 'HITAM Campus Fleet Tracking (All Buses)' : (route?.name || `Route ${selectedRouteId}`)}
              </h2>
              <span className={`flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full ${isAllBusesMode ? 'bg-emerald-100 text-emerald-800' : statusUi.badge}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isAllBusesMode ? 'bg-emerald-500 animate-pulse' : statusUi.dot}`} />
                {isAllBusesMode ? `${fleetOnlineCount} Active Buses` : statusUi.label}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              {isAllBusesMode
                ? 'Monitoring all 23 HITAM college transport routes across Hyderabad'
                : `${route?.busNumber || 'Fleet Bus'} • ${stops.length} Stops • Daily Transit`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600"
              title="Refresh Live Data"
            >
              <RefreshCw size={17} className={isRefreshing ? 'animate-spin text-[#40A047]' : ''} />
            </button>
            <button onClick={() => setIsLive(v => !v)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              {isLive ? <Pause size={18} className="text-[#40A047]" /> : <Play size={18} className="text-[#40A047]" />}
            </button>
          </div>
        </div>

        <div className="relative" style={{ height: 420 }}>
          {showOfflineScreen ? (
            <div className="absolute inset-0 bg-slate-900/95 flex flex-col items-center justify-center p-6 text-center text-white z-10">
              <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center mb-4 ring-1 ring-white/20 shadow-inner">
                <WifiOff size={32} className="text-red-400 animate-pulse" />
              </div>
              <h3 className="text-lg font-bold text-white mb-1">Route {selectedRouteId} is Currently Offline</h3>
              <p className="text-xs text-gray-300 max-w-sm mb-5 leading-relaxed">
                Vehicle GPS is not transmitting at this time. The driver has not started the trip yet or the GPS device is off.
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="flex items-center gap-2 px-4 py-2 bg-[#40A047] hover:bg-[#2d7a33] text-white rounded-xl text-xs font-bold shadow-lg transition"
                >
                  <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
                  Check Live Status
                </button>
                <button
                  onClick={() => setSelectedRouteId('ALL')}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold border border-white/20 transition"
                >
                  View All Active Buses
                </button>
              </div>
            </div>
          ) : (
            <MapContainer
              center={routePoints[0] || busPosition || DEFAULT_CENTER}
              zoom={12}
              scrollWheelZoom
              className="absolute inset-0 z-0"
              whenReady={(event) => { mapRef.current = event.target }}
              zoomControl={false}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <FitRouteBounds
                points={roadPath?.length > 0 ? roadPath : routePoints}
                followBus={followBus}
                busPosition={busPosition}
                isAllBusesView={isAllBusesMode}
                allBusPositions={allBusPositions}
              />

              {/* Single Route View: High-Fidelity Google Maps Navigation Road Path */}
              {!isAllBusesMode && roadPath && roadPath.length > 1 && (
                <>
                  {/* Google Maps Outer Casing / Road Shadow */}
                  <Polyline
                    positions={roadPath}
                    pathOptions={{
                      color: '#14532D',
                      weight: 8,
                      opacity: 0.35,
                      lineCap: 'round',
                      lineJoin: 'round',
                    }}
                  />
                  {/* Google Maps Primary Navigation Driving Path */}
                  <Polyline
                    positions={roadPath}
                    pathOptions={{
                      color: '#40A047',
                      weight: 5,
                      opacity: 0.95,
                      lineCap: 'round',
                      lineJoin: 'round',
                    }}
                  />
                </>
              )}

              {/* Fleet Mode: Render subtle road paths across Hyderabad */}
              {isAllBusesMode && (
                <>
                  {Object.entries(allPolylines).map(([routeKey, pts]) => {
                    if (!pts || pts.length < 2) return null
                    return (
                      <Polyline
                        key={`fleet-path-${routeKey}`}
                        positions={pts}
                        pathOptions={{
                          color: '#10B981',
                          weight: 3.5,
                          opacity: 0.35,
                          lineCap: 'round',
                          lineJoin: 'round',
                        }}
                      />
                    )
                  })}
                </>
              )}

              {!isAllBusesMode && tailPoints.length >= 2 && (
                <Polyline
                  positions={tailPoints}
                  pathOptions={{ color: '#3B82F6', weight: 3.5, opacity: 0.85, dashArray: '5 6', lineCap: 'round' }}
                />
              )}

              <Marker position={HITAM_CAMPUS_COORD} icon={campusIcon} zIndexOffset={500}>
                <Popup>
                  <div className="text-xs">
                    <p className="font-bold text-[#166534]">HITAM Campus</p>
                    <p className="text-gray-500">Central Destination Terminal</p>
                    <p className="text-[10px] text-gray-400 mt-1">Medchal / Gowdavally</p>
                  </div>
                </Popup>
              </Marker>

              {!isAllBusesMode && stops.map((stop, idx) => (
                <Marker
                  key={`${selectedRouteId}-${stop.id || idx}`}
                  position={[stop.latitude, stop.longitude]}
                  icon={getStopIcon(idx, stop)}
                  eventHandlers={{
                    click: () => setSelectedPickupStopId(stop.id),
                  }}
                >
                  <Popup>
                    <div className="text-xs space-y-1">
                      <p className="font-bold text-gray-900">{stop.name}</p>
                      {stop.stopTime && <p className="text-gray-500 font-semibold">Scheduled: {stop.stopTime}</p>}
                      <button
                        onClick={() => setSelectedPickupStopId(stop.id)}
                        className="mt-1 px-2 py-0.5 bg-[#40A047] text-white font-bold text-[10px] rounded"
                      >
                        Set as My Pickup
                      </button>
                    </div>
                  </Popup>
                </Marker>
              ))}

              {isAllBusesMode && allLiveLocations.map((bus) => {
                if (!bus.latitude || !bus.longitude || bus.latitude === 0) return null
                const isBusMoving = bus.speed && bus.speed > 0
                return (
                  <AnimatedBusMarker
                    key={`fleet-bus-${bus.routeId}`}
                    location={bus}
                    isAnimating={isBusMoving || bus.status === 'online'}
                    routeName={`R${bus.routeId}`}
                    iconSrc={activeIconSrc}
                    isSelected={false}
                    onClick={() => {
                      setSelectedRouteId(String(bus.routeId))
                      mapRef.current?.flyTo([bus.latitude, bus.longitude], 14, { duration: 0.6 })
                    }}
                  >
                    <Popup>
                      <div className="text-xs space-y-1.5 p-0.5">
                        <div className="flex items-center justify-between gap-2 border-b border-gray-100 pb-1">
                          <p className="font-bold text-gray-900">{bus.routeName || `Route ${bus.routeId}`}</p>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${bus.status === 'online' || bus.status === 'ack' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                            {bus.status === 'ack' ? 'Standby' : (bus.status || 'Offline')}
                          </span>
                        </div>
                        <p className="text-[#40A047] font-semibold">{bus.busNumber}</p>
                        <p className="text-gray-500">Speed: {Math.round(bus.speed || 0)} km/h • Heading: {Math.round(bus.heading || 0)}°</p>
                        <button
                          onClick={() => setSelectedRouteId(String(bus.routeId))}
                          className="w-full mt-1 px-2.5 py-1 bg-[#40A047] text-white font-bold text-[11px] rounded-lg shadow-sm hover:bg-[#2d7a33] transition"
                        >
                          Focus Route {bus.routeId}
                        </button>
                      </div>
                    </Popup>
                  </AnimatedBusMarker>
                )
              })}

              {!isAllBusesMode && liveLocation && busPosition && (
                <AnimatedBusMarker
                  location={liveLocation}
                  isAnimating={gpsStatus === 'LIVE'}
                  routeName={`Route ${selectedRouteId}`}
                  iconSrc={activeIconSrc}
                  isSelected={true}
                >
                  <Popup>
                    <div className="text-xs space-y-1">
                      <p className="font-bold text-gray-900">{route?.busNumber || 'Bus TS 09 AB 1234'}</p>
                      <p className="text-[#40A047] font-semibold">Route {selectedRouteId} • Speed: {displaySpeed} km/h</p>
                      <p className="text-gray-500">Heading: {Math.round(effectiveBusHeading(liveLocation))}°</p>
                    </div>
                  </Popup>
                </AnimatedBusMarker>
              )}
            </MapContainer>
          )}

          {!showOfflineScreen && (
            <div className="absolute top-3 left-3 z-[500] bg-white/90 backdrop-blur-md rounded-xl shadow-md border border-gray-100 px-3 py-2 text-[10px] font-semibold text-gray-700 space-y-1.5">
              {isAllBusesMode ? (
                <>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
                    Fleet Tracking: {fullRoutesList.length} Buses
                  </div>
                  <div className="flex items-center gap-2 text-gray-500 font-normal">
                    Tap any bus icon to view its route & stops
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <span className="w-3.5 h-[3px] rounded-full bg-[#40A047] inline-block" />
                    Scheduled Route
                  </div>
                  {tailPoints.length >= 2 && (
                    <div className="flex items-center gap-2">
                      <span className="w-3.5 border-t-2 border-dashed border-[#3B82F6] inline-block" />
                      Live GPS Trail
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B] border border-white inline-block shadow-sm" />
                    Your Pickup Stop
                  </div>
                </>
              )}
            </div>
          )}

          {!showOfflineScreen && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-[#0F172A]/92 backdrop-blur-md text-white px-4 py-2.5 rounded-2xl flex items-center gap-3 shadow-2xl border border-white/10 z-[500]">
              <div className="w-8 h-8 bg-[#40A047] rounded-xl flex items-center justify-center shrink-0 shadow-sm">
                <img src={activeIconSrc} alt="Bus" className="w-5 h-5 object-contain" />
              </div>
              {isAllBusesMode ? (
                <div>
                  <p className="text-xs font-bold text-white leading-tight">
                    {fullRoutesList.length} HITAM Fleet Buses Connected
                  </p>
                  <p className="text-[11px] text-gray-300">
                    Live GPS from HypeGPS • {fleetOnlineCount} Buses Active
                  </p>
                </div>
              ) : busPosition && distToNext != null ? (
                <div>
                  <p className="text-xs font-bold text-white leading-tight">
                    {distToNext} km to {nextStopName}
                  </p>
                  <p className="text-[11px] text-gray-300">
                    ETA ~{etaMins} mins • {displaySpeed} km/h
                    {myPickupStop && distToMyPickup && (
                      <span className="text-[#4ade80] font-semibold ml-1.5">({distToMyPickup} km to your stop)</span>
                    )}
                  </p>
                </div>
              ) : busPosition ? (
                <div>
                  <p className="text-xs font-bold text-white leading-tight">
                    Route {selectedRouteId} Connected (Standby)
                  </p>
                  <p className="text-[11px] text-gray-300">
                    Vehicle at Campus • Speed: 0 km/h
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-xs font-bold">Waiting for GPS Fix...</p>
                  <p className="text-[11px] text-gray-400">{gpsStatus === 'ERROR' ? 'GPS feed offline' : 'Connecting to vehicle'}</p>
                </div>
              )}
            </div>
          )}

          {!showOfflineScreen && (
            <div className="absolute bottom-4 right-4 flex flex-col gap-2 z-[500]">
              <button
                type="button"
                onClick={() => mapRef.current?.zoomIn()}
                className="w-9 h-9 bg-white/95 backdrop-blur rounded-xl shadow-md flex items-center justify-center hover:bg-gray-50 transition"
                title="Zoom In"
              >
                <ZoomIn size={16} className="text-[#40A047]" />
              </button>
              <button
                type="button"
                onClick={() => mapRef.current?.zoomOut()}
                className="w-9 h-9 bg-white/95 backdrop-blur rounded-xl shadow-md flex items-center justify-center hover:bg-gray-50 transition"
                title="Zoom Out"
              >
                <ZoomOut size={16} className="text-[#40A047]" />
              </button>
              {!isAllBusesMode && (
                <button
                  type="button"
                  onClick={() => setFollowBus(f => !f)}
                  className={`w-9 h-9 rounded-xl shadow-md flex items-center justify-center transition ${followBus ? 'bg-[#40A047] text-white ring-2 ring-emerald-300' : 'bg-white/95 text-gray-700 hover:bg-gray-50'}`}
                  title={followBus ? 'Follow Bus (Active)' : 'Follow Bus'}
                >
                  <Compass size={16} className={followBus ? 'text-white' : 'text-[#40A047]'} />
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  if (isAllBusesMode || !busPosition) {
                    mapRef.current?.flyTo(HITAM_CAMPUS_COORD, 12, { duration: 0.6 })
                  } else {
                    mapRef.current?.flyTo(busPosition, 14, { duration: 0.6 })
                  }
                }}
                className="w-9 h-9 bg-[#40A047] text-white rounded-xl shadow-md flex items-center justify-center hover:bg-[#2d7a33] transition"
                title={isAllBusesMode ? 'Center Campus' : 'Center on Bus'}
              >
                <Navigation size={15} />
              </button>
            </div>
          )}
        </div>

        <div className="p-5 border-t border-gray-100">
          <div className="flex items-center justify-between mb-3.5">
            <div>
              <p className="text-sm font-bold text-gray-900">
                {isAllBusesMode ? `HITAM Transport Fleet (${fullRoutesList.length} Buses)` : `Next Stop: ${nextStopName}${nextStopTime ? ` (${nextStopTime})` : ''}`}
              </p>
              <p className="text-xs text-[#40A047] font-semibold mt-0.5">
                {isAllBusesMode
                  ? 'Click any bus chip above or on the map to inspect individual route tracking'
                  : `Assigned Boarding: ${myPickupStop?.name || user?.boardingPoint || route?.pickupPoint || 'HITAM Corridor'}`}
              </p>
            </div>
            <div className={`px-3.5 py-1.5 bg-green-100 rounded-xl ${etaMins == null || showOfflineScreen ? 'opacity-50' : ''}`}>
              <p className="text-sm font-bold text-[#40A047]">
                {isAllBusesMode ? `${fullRoutesList.length} ROUTES` : `ETA: ${!showOfflineScreen && etaMins != null ? `${etaMins} MINS` : '--'}`}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-gray-500 mb-3.5">
            <span className="flex items-center gap-1.5">
              <Zap size={13} className="text-[#40A047]" />
              {isAllBusesMode ? `Active Fleet: ${fleetOnlineCount} Buses` : `Speed: ${showOfflineScreen ? 0 : displaySpeed} km/h`}
            </span>
            <span className="flex items-center gap-1.5">
              <Navigation size={13} className="text-[#40A047]" />
              GPS Feed: {isAllBusesMode ? 'HypeGPS Fleet' : gpsLabelText}
            </span>
          </div>

          {trackingError && (
            <p className="text-xs text-red-500 mb-3 break-words bg-red-50 p-2 rounded-lg">{trackingError}</p>
          )}

          {!isAllBusesMode && stops.length > 0 && (
            <>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold text-gray-500">Route Stops ({stops.length}):</p>
                <p className="text-[11px] text-gray-400">Tap a stop to preview and set pickup</p>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {stops.map((stop, idx) => {
                  const passed = idx < stopIdx
                  const isCur = idx === stopIdx
                  const isMyPickup = myPickupStop && myPickupStop.id === stop.id
                  return (
                    <button
                      key={stop.id || idx}
                      type="button"
                      onClick={() => {
                        setSelectedPickupStopId(stop.id)
                        mapRef.current?.flyTo([stop.latitude, stop.longitude], 14, { duration: 0.5 })
                      }}
                      className={`flex-1 min-w-[76px] py-1.5 px-1.5 rounded-xl text-center transition-all ${isMyPickup ? 'ring-2 ring-[#F59E0B] bg-amber-50' : isCur && !showOfflineScreen ? 'bg-[#40A047] text-white shadow-sm' : passed && !showOfflineScreen ? 'bg-green-100' : 'bg-gray-100 hover:bg-gray-200'}`}
                    >
                      <p className={`text-[10px] font-semibold truncate ${isCur && !showOfflineScreen ? 'text-white' : passed && !showOfflineScreen ? 'text-green-800' : isMyPickup ? 'text-amber-900 font-bold' : 'text-gray-600'}`}>
                        {stop.name}
                      </p>
                      <p className={`text-[9px] mt-0.5 ${isCur && !showOfflineScreen ? 'text-green-100' : isMyPickup ? 'text-amber-700' : 'text-gray-400'}`}>
                        {stop.stopTime || `${idx + 1}`}
                      </p>
                    </button>
                  )
                })}
              </div>
            </>
          )}

          {isAllBusesMode && (
            <div className="space-y-2 mt-2">
              <p className="text-xs font-bold text-gray-500">HITAM Fleet Buses ({fullRoutesList.length}):</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-48 overflow-y-auto pr-1">
                {fullRoutesList.map((r) => {
                  const loc = allLiveLocations.find(l => String(l.routeId) === String(r.id))
                  const isOnline = loc?.status === 'online' || loc?.status === 'ack' || (loc?.latitude && loc.latitude !== 0)
                  return (
                    <button
                      key={r.id}
                      onClick={() => {
                        setSelectedRouteId(r.id)
                        if (loc?.latitude && loc.latitude !== 0) {
                          mapRef.current?.flyTo([loc.latitude, loc.longitude], 14, { duration: 0.6 })
                        }
                      }}
                      className="p-2.5 rounded-xl border border-gray-100 bg-gray-50 hover:bg-green-50 hover:border-green-200 text-left transition-all group"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-gray-900 group-hover:text-[#40A047]">Route {r.id}</span>
                        <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-gray-300'}`} />
                      </div>
                      <p className="text-[10px] text-gray-500 truncate">{r.busNumber}</p>
                      <p className="text-[9px] text-[#40A047] font-semibold mt-0.5">
                        {isOnline ? (loc?.speed > 0 ? `${Math.round(loc.speed)} km/h • Live` : 'Connected • Standby') : 'Offline'}
                      </p>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {!isAllBusesMode && (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <p className="text-xs text-gray-500 mb-1">Next Scheduled Stop</p>
            <p className="text-sm font-bold text-gray-900">{nextStopName}</p>
            <p className="text-xs text-[#40A047] font-semibold mt-1">ETA: {!showOfflineScreen ? etaTime : 'Offline'}</p>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <p className="text-xs text-gray-500 mb-1">Your Pickup Point</p>
            <p className="text-sm font-bold text-gray-900">{myPickupStop?.name || 'Assigned Stop'}</p>
            <p className="text-xs text-[#40A047] font-semibold mt-1">
              {!showOfflineScreen && etaToMyPickupMins != null ? `ETA: ~${etaToMyPickupMins} mins (${distToMyPickup} km)` : 'Select on map'}
            </p>
          </div>
        </div>
      )}

      <p className="text-center text-xs text-gray-400 flex items-center justify-center gap-1.5">
        <RefreshCw size={11} /> Last GPS Update: {isAllBusesMode ? 'Live Fleet' : (liveLocation?.lastPingAt ? new Date(liveLocation.lastPingAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '--')}
      </p>
    </motion.div>
  )
}
