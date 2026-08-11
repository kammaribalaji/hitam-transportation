import React, { useState, useEffect, useRef, useMemo } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../../hooks/useAuth.js'
import { ROUTES_DATA } from '../../utils/helpers.js'
import { liveLocationService } from '../../api/services.js'
import { ROUTE_COORDINATES, haversineKm, getPointOnRoute } from '../../utils/routeCoordinates.js'
import { Bus, Navigation, Zap, RefreshCw, Play, Pause, ZoomIn, ZoomOut } from 'lucide-react'
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

function FitRouteBounds({ points }) {
  const map = useMap()

  useEffect(() => {
    if (!points?.length) return
    const bounds = L.latLngBounds(points)
    map.fitBounds(bounds, { padding: [28, 28] })
  }, [map, points])

  return null
}

function useAnimatedBus(isRunning) {
  const [progress, setProgress] = useState(0.35)
  const [speed, setSpeed] = useState(38)
  const rafRef = useRef(null)
  const lastRef = useRef(null)

  useEffect(() => {
    if (!isRunning) return
    const tick = (now) => {
      if (lastRef.current == null) lastRef.current = now
      const delta = (now - lastRef.current) / 1000
      lastRef.current = now
      setProgress(p => {
        const next = p + delta * 0.012
        if (next >= 0.95) { lastRef.current = null; return 0.1 }
        return next
      })
      setSpeed(32 + Math.floor(Math.random() * 15))
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [isRunning])

  return { progress, speed }
}

export default function LiveTrackingPage() {
  const { user } = useAuth()
  const [selectedRouteId, setSelectedRouteId] = useState(user?.assignedRouteId || 'R1')
  const [isLive, setIsLive] = useState(true)
  const [liveLocation, setLiveLocation] = useState(null)
  const mapRef = useRef(null)

  const route = ROUTES_DATA.find(r => r.id === selectedRouteId) || ROUTES_DATA[0]
  const routePoints = ROUTE_COORDINATES[selectedRouteId] || ROUTE_COORDINATES.R1
  const { progress, speed } = useAnimatedBus(isLive)
  const simulatedBusPosition = useMemo(() => getPointOnRoute(routePoints, progress), [routePoints, progress])

  useEffect(() => {
    if (!isLive) return

    let isMounted = true
    const fetchLiveLocation = async () => {
      try {
        const res = await liveLocationService.getByBus(route.busNumber)
        if (isMounted) setLiveLocation(res.data)
      } catch {
        // Keep the last known location on transient API errors.
      }
    }

    fetchLiveLocation()
    const interval = setInterval(fetchLiveLocation, 8000)
    return () => {
      isMounted = false
      clearInterval(interval)
    }
  }, [selectedRouteId, route.busNumber, isLive])

  const busPosition = liveLocation
    ? [liveLocation.latitude, liveLocation.longitude]
    : simulatedBusPosition

  const stopIdx = liveLocation
    ? routePoints.reduce((bestIdx, point, idx) => (
      haversineKm(point, busPosition) < haversineKm(routePoints[bestIdx], busPosition) ? idx : bestIdx
    ), 0)
    : Math.min(Math.floor(progress * Math.max(routePoints.length - 1, 1)), Math.max(routePoints.length - 1, 0))

  const nextStopCoord = routePoints[Math.min(stopIdx + 1, routePoints.length - 1)] || routePoints[routePoints.length - 1]

  const totalStops = Math.min(route.stops.length, routePoints.length)
  const nextStopName = route.stops[Math.min(stopIdx + 1, totalStops - 1)] || 'HITAM Campus'
  const distToNext = haversineKm(busPosition, nextStopCoord).toFixed(1)
  const etaMins = Math.max(1, Math.round(parseFloat(distToNext) * 2.2))
  const displaySpeed = liveLocation?.speed > 0 ? Math.round(liveLocation.speed) : speed
  const lastPingAgeSec = liveLocation?.lastPingAt ? Math.max(0, Math.floor((Date.now() - new Date(liveLocation.lastPingAt).getTime()) / 1000)) : null
  const isStale = lastPingAgeSec != null && lastPingAgeSec > 30
  const gpsLabel = liveLocation ? `${isStale ? 'Stale' : 'Live'} ${liveLocation.source} Feed` : 'Fallback Simulation'
  const etaTime = new Date(Date.now() + etaMins * 60000).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })

  const busIcon = useMemo(() => L.divIcon({
    className: 'live-bus-icon',
    html: '<div style="width:16px;height:16px;border-radius:9999px;background:#40A047;border:2px solid #ffffff;box-shadow:0 4px 10px rgba(0,0,0,0.25);"></div>',
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  }), [])

  const getStopIcon = (idx) => {
    const passed = idx < stopIdx
    const isNext = idx === stopIdx
    const isDest = idx === routePoints.length - 1
    const color = isDest ? '#EF4444' : isNext ? '#F59E0B' : passed ? '#10B981' : '#3B82F6'

    return L.divIcon({
      className: 'stop-marker-icon',
      html: `<div style="width:12px;height:12px;border-radius:9999px;background:${color};border:2px solid #ffffff;box-shadow:0 2px 8px rgba(0,0,0,0.2);"></div>`,
      iconSize: [12, 12],
      iconAnchor: [6, 6],
    })
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Live Tracking</h1>
        <button onClick={() => setIsLive(v => !v)}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors">
          {isLive ? <Pause size={15} className="text-[#40A047]" /> : <Play size={15} className="text-[#40A047]" />}
          {isLive ? 'Pause' : 'Resume'}
        </button>
      </div>

      {/* Route tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {ROUTES_DATA.map(r => (
          <button key={r.id} onClick={() => setSelectedRouteId(r.id)}
            className={`shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border-2 transition-all ${selectedRouteId === r.id ? 'bg-[#40A047] text-white border-[#40A047]' : 'bg-white text-gray-600 border-gray-200 hover:border-green-400'}`}>
            <Bus size={14} />
            {r.id}
          </button>
        ))}
      </div>

      {/* Map card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Map header overlay */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-gray-900">{route.busNumber}</span>
              <span className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${isLive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isLive ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
                {isLive ? 'LIVE STREAM' : 'PAUSED'}
              </span>
              {liveLocation && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${isStale ? 'bg-yellow-100 text-yellow-700' : 'bg-emerald-100 text-emerald-700'}`}>
                  {isStale ? `STALE ${lastPingAgeSec}s` : 'LIVE GPS'}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-0.5">{route.name}</p>
          </div>
          <button onClick={() => setIsLive(v => !v)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            {isLive ? <Pause size={18} className="text-[#40A047]" /> : <Play size={18} className="text-[#40A047]" />}
          </button>
        </div>

        <div className="relative" style={{ height: 320 }}>
          <MapContainer
            center={routePoints[0]}
            zoom={12}
            scrollWheelZoom
            className="absolute inset-0 z-0"
            whenReady={(event) => { mapRef.current = event.target }}
            zoomControl={false}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <FitRouteBounds points={routePoints} />
            <Polyline positions={routePoints} pathOptions={{ color: '#1f2937', weight: 7, opacity: 0.35, lineCap: 'round' }} />
            <Polyline positions={routePoints} pathOptions={{ color: '#40A047', weight: 4, opacity: 0.95, lineCap: 'round' }} />
            {routePoints.map((point, idx) => (
              <Marker key={`${selectedRouteId}-${idx}`} position={point} icon={getStopIcon(idx)}>
                <Popup>{route.stops[idx] || `Stop ${idx + 1}`}</Popup>
              </Marker>
            ))}
            <Marker position={busPosition} icon={busIcon}>
              <Popup>{route.busNumber} - Live Location</Popup>
            </Marker>
          </MapContainer>

          {/* Distance card overlay */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-[#0F172A]/90 text-white px-4 py-2.5 rounded-xl flex items-center gap-3 shadow-xl">
            <div className="w-7 h-7 bg-[#40A047] rounded-lg flex items-center justify-center shrink-0">
              <Bus size={14} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-bold">{distToNext} km to {nextStopName}</p>
              <p className="text-xs text-gray-400">Arriving in ~{etaMins} mins · {displaySpeed} km/h</p>
            </div>
          </div>

          {/* Zoom controls */}
          <div className="absolute bottom-4 right-4 flex flex-col gap-2">
            <button onClick={() => mapRef.current?.zoomIn()} className="w-8 h-8 bg-white rounded-lg shadow flex items-center justify-center hover:bg-gray-50 transition-colors">
              <ZoomIn size={14} className="text-[#40A047]" />
            </button>
            <button onClick={() => mapRef.current?.zoomOut()} className="w-8 h-8 bg-white rounded-lg shadow flex items-center justify-center hover:bg-gray-50 transition-colors">
              <ZoomOut size={14} className="text-[#40A047]" />
            </button>
            <button onClick={() => mapRef.current?.flyTo(busPosition, 13)} className="w-8 h-8 bg-[#40A047] rounded-lg shadow flex items-center justify-center hover:bg-[#2d7a33] transition-colors">
              <Navigation size={13} className="text-white" />
            </button>
          </div>
        </div>

        {/* Info bar */}
        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-bold text-gray-900">Next Stop: {nextStopName}</p>
              <p className="text-xs text-[#40A047] font-semibold">Boarding: {route.pickupPoint}</p>
            </div>
            <div className="px-3 py-1.5 bg-green-100 rounded-xl">
              <p className="text-sm font-bold text-[#40A047]">ETA: {etaMins} MINS</p>
            </div>
          </div>
          <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
            <span className="flex items-center gap-1.5"><Zap size={12} className="text-[#40A047]" /> Speed: {displaySpeed} km/h</span>
            <span className="flex items-center gap-1.5"><Navigation size={12} className="text-[#40A047]" /> GPS: {gpsLabel}</span>
          </div>
          {/* Stop timeline */}
          <p className="text-xs font-bold text-gray-500 mb-2">Route Stops:</p>
          <div className="flex gap-1.5">
            {route.stops.slice(0, totalStops).map((stop, idx) => {
              const passed = idx < stopIdx
              const isCur = idx === stopIdx
              return (
                <div key={idx} className={`flex-1 py-1 px-1 rounded-lg text-center ${isCur ? 'bg-[#40A047]' : passed ? 'bg-green-100' : 'bg-gray-100'}`}>
                  <p className={`text-xs font-semibold truncate ${isCur ? 'text-white' : passed ? 'text-green-700' : 'text-gray-500'}`}
                    style={{ fontSize: 9 }}>{stop}</p>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Next/Following stop cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <p className="text-xs text-gray-500 mb-1">Next Stop</p>
          <p className="text-sm font-bold text-gray-900">{nextStopName}</p>
          <p className="text-xs text-[#40A047] font-semibold mt-1">ETA: {etaTime}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <p className="text-xs text-gray-500 mb-1">Following Stop</p>
          <p className="text-sm font-bold text-gray-900">{route.stops[Math.min(stopIdx + 2, totalStops - 1)] || 'HITAM Campus'}</p>
          <p className="text-xs text-gray-500 font-semibold mt-1">ETA: ~{etaMins + 8} mins</p>
        </div>
      </div>
      <p className="text-center text-xs text-gray-400 flex items-center justify-center gap-1.5">
        <RefreshCw size={11} /> Last Updated: {new Date(liveLocation?.lastPingAt || Date.now()).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
      </p>
    </motion.div>
  )
}
