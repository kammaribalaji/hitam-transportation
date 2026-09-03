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
} from 'lucide-react'
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import allPolylines from '../../data/polylines/allPolylines.json'
import WhereIsMyBusTimeline from '../../components/tracking/WhereIsMyBusTimeline.jsx'

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
  const initialRouteId = useMemo(() => {
    if (user?.assignedRouteId && String(user.assignedRouteId) !== '0') {
      return String(user.assignedRouteId)
    }
    return '19'
  }, [user])

  const [routes, setRoutes] = useState([])
  const [stops, setStops] = useState([])
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

    runPoll()
    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [isLive, selectedRouteId, fetchAllLocations, fetchSelectedLocation])

  const busPosition = useMemo(() => {
    if (liveLocation && Number.isFinite(liveLocation.latitude) && Number.isFinite(liveLocation.longitude) && (liveLocation.latitude !== 0 || liveLocation.longitude !== 0)) {
      return [liveLocation.latitude, liveLocation.longitude]
    }
    if (stops.length > 0) {
      return [stops[0].latitude, stops[0].longitude]
    }
    return null
  }, [liveLocation, stops])

  const allBusPositions = useMemo(() => {
    return allLiveLocations.map(b => [b.latitude, b.longitude]).filter(p => p[0] && p[1] && p[0] !== 0)
  }, [allLiveLocations])

  const fleetOnlineCount = useMemo(() => {
    return allLiveLocations.filter(b => b.status === 'online' || b.status === 'ack' || (b.latitude && b.latitude !== 0)).length
  }, [allLiveLocations])

  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 max-w-5xl mx-auto pb-8">
      {/* 1. TOP VIEW MODE SWITCHER TABS */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-emerald-100 shadow-sm">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('TIMELINE')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${
              viewMode === 'TIMELINE'
                ? 'bg-[#40A047] text-white shadow-md shadow-green-600/20 ring-2 ring-emerald-300'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <ListOrdered size={16} />
            <span>Station Timeline (Where Is My Train)</span>
          </button>

          <button
            onClick={() => setViewMode('MAP')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${
              viewMode === 'MAP'
                ? 'bg-[#40A047] text-white shadow-md shadow-green-600/20 ring-2 ring-emerald-300'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Navigation size={16} />
            <span>Interactive Live Map</span>
          </button>

          <button
            onClick={() => setViewMode('SPLIT')}
            className={`hidden lg:flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${
              viewMode === 'SPLIT'
                ? 'bg-[#40A047] text-white shadow-md shadow-green-600/20 ring-2 ring-emerald-300'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <LayoutGrid size={16} />
            <span>Split View</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500">Live Stream:</span>
          <button
            onClick={() => setIsLive(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
              isLive ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-slate-100 text-slate-600 border-slate-300'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
            {isLive ? 'Live Tracking ON' : 'Paused'}
          </button>
        </div>
      </div>

      {/* 2. MAIN VIEW CONTENT: TIMELINE / MAP / SPLIT */}
      <div className={`grid gap-4 ${viewMode === 'SPLIT' ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
        {/* TIMELINE COMPONENT (Where is my train style) */}
        {(viewMode === 'TIMELINE' || viewMode === 'SPLIT') && (
          <WhereIsMyBusTimeline
            route={route || { id: selectedRouteId, name: `Route ${selectedRouteId}`, busNumber: `TS 09 UB ${1200 + parseInt(selectedRouteId || 1)}` }}
            stops={stops}
            liveLocation={liveLocation}
            userBoardingPoint={user?.boardingPoint}
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
            <div className="p-4 bg-emerald-900 text-white flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-white">
                  {isAllBusesMode ? 'HITAM Fleet Overview' : (route?.name || `Route ${selectedRouteId}`)}
                </h3>
                <p className="text-[11px] text-emerald-200">
                  {isAllBusesMode ? `${fleetOnlineCount} Active Fleet Buses` : `${route?.busNumber || 'Fleet Vehicle'} • GPS Navigation`}
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

            <div className="relative" style={{ height: viewMode === 'SPLIT' ? '560px' : '480px' }}>
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

                {/* Road Polyline */}
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
                      <p className="text-gray-500 text-[10px]">Destination Hub</p>
                    </div>
                  </Popup>
                </Marker>

                {/* Intermediate Stops */}
                {stops.map((s, idx) => (
                  <Marker
                    key={s.id || s.name + idx}
                    position={[s.latitude, s.longitude]}
                    icon={createPickupPinDivIcon(s.id === selectedPickupStopId || s.name?.toLowerCase().includes(user?.boardingPoint?.toLowerCase()))}
                  >
                    <Popup>
                      <div className="p-1 text-xs">
                        <p className="font-extrabold text-slate-900">{s.name}</p>
                        <p className="text-emerald-700 font-bold text-[11px]">Reporting: {s.stopTime || '07:00 AM'}</p>
                        <p className="text-gray-400 text-[10px]">Stop #{s.stopOrder || idx + 1}</p>
                      </div>
                    </Popup>
                  </Marker>
                ))}

                {/* Live Bus Marker */}
                {!isAllBusesMode && liveLocation && (
                  <AnimatedBusMarker
                    location={liveLocation}
                    isAnimating={isLive}
                    routeName={route?.busNumber || `Bus ${selectedRouteId}`}
                    iconSrc={activeIconSrc}
                    isSelected={true}
                  >
                    <Popup>
                      <div className="p-2 text-xs font-sans">
                        <p className="font-extrabold text-emerald-800">{route?.busNumber || 'Fleet Bus'}</p>
                        <p className="text-gray-700 font-medium">{route?.name}</p>
                        <div className="mt-1 text-[11px] text-gray-500 space-y-0.5">
                          <p>Speed: <span className="font-bold text-gray-800">{Math.round(liveLocation.speed || 0)} km/h</span></p>
                          <p>Status: <span className="font-bold text-green-600">LIVE GPS</span></p>
                        </div>
                      </div>
                    </Popup>
                  </AnimatedBusMarker>
                )}

                {/* Fleet markers */}
                {isAllBusesMode && allLiveLocations.map(loc => (
                  <AnimatedBusMarker
                    key={loc.deviceId || loc.routeId}
                    location={loc}
                    isAnimating={isLive}
                    routeName={`R${loc.routeId}`}
                    iconSrc={activeIconSrc}
                    isSelected={false}
                    onClick={() => {
                      setSelectedRouteId(String(loc.routeId))
                      setViewMode('TIMELINE')
                    }}
                  />
                ))}
              </MapContainer>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  )
}
