import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../../hooks/useAuth.js'
import { liveLocationService, routeService } from '../../api/services.js'
import {
  haversineKm,
  effectiveBusHeading,
  normalizeHeading,
  headingDelta,
} from '../../utils/routeCoordinates.js'
import { Bus, Navigation, Zap, RefreshCw, Play, Pause, ZoomIn, ZoomOut, Compass, WifiOff } from 'lucide-react'
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import allPolylines from '../../data/polylines/allPolylines.json'

const DEFAULT_CENTER = [17.5953257, 78.4530613]
const HITAM_CAMPUS_COORD = [17.5953257, 78.4530613]
const POLL_INTERVAL_MS = 6000
const STALE_AFTER_SEC = 120
const ANIM_MS = 3000
const IS_DEV = import.meta.env.DEV

const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

function FitRouteBounds({ points, followBus, busPosition }) {
  const map = useMap()

  useEffect(() => {
    if (followBus && busPosition) {
      map.flyTo(busPosition, Math.max(map.getZoom(), 14), { duration: 0.6 })
      return
    }
    if (points?.length) {
      const bounds = L.latLngBounds(points)
      map.fitBounds(bounds, { padding: [32, 32] })
    }
  }, [map, points, followBus, busPosition])

  return null
}

function createBusDivIcon(status, heading, routeName, iconSrc = '/assets/icons/bus-realistic-yellow.png') {
  const size = 48
  const imgSize = 40
  const rot = normalizeHeading(heading)
  const isMoving = status === 'LIVE' || status === 'moving'
  const isIdle = status === 'STALE' || status === 'ACK' || status === 'idle'

  const html = `
    <div class="bus-marker ${isMoving ? 'bus-marker--moving' : isIdle ? 'bus-marker--idle' : ''}" style="width:${size}px;height:${size}px;">
      ${isMoving ? '<span class="bus-marker__pulse-ring"></span>' : ''}
      <div class="bus-marker__body" style="width:${imgSize}px;height:${imgSize}px;">
        <div class="bus-marker__spin" style="transform:rotate(${rot.toFixed(1)}deg);">
          <img src="${iconSrc}" alt="Bus" style="width:${imgSize}px;height:${imgSize}px;object-fit:contain;" class="bus-marker__img" />
        </div>
      </div>
      <span class="bus-marker__route-label">${routeName || 'Driver'}</span>
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
  const size = 42
  const img = 34
  return L.divIcon({
    className: 'campus-marker-wrap',
    html: `
      <div class="campus-marker" style="width:${size}px;height:${size}px;">
        <img src="/assets/icons/clg-static.png" alt="HITAM" style="width:${img}px;height:${img}px;object-fit:contain;" class="campus-marker__img" />
        <span class="campus-marker__label">HITAM</span>
      </div>
    `,
    iconSize: [size, size + 12],
    iconAnchor: [size / 2, size / 2],
  })
}

function AnimatedBusMarker({ location, isAnimating, routeName, iconSrc, children }) {
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
    const status = isAnimating ? 'LIVE' : (location?.status || 'offline')
    return createBusDivIcon(status, displayHeading, routeName, iconSrc)
  }, [isAnimating, location?.status, displayHeading, routeName, iconSrc])

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

  if (!location || (location.latitude === 0 && location.longitude === 0)) return null

  return (
    <Marker ref={markerRef} position={displayPos.current} icon={icon}>
      {children}
    </Marker>
  )
}

export default function LiveNavigationPage() {
  const { user } = useAuth()
  const [routes, setRoutes] = useState([])
  const [stops, setStops] = useState([])
  const [selectedRouteId, setSelectedRouteId] = useState(user?.assignedRouteId || '12')
  const [isLive, setIsLive] = useState(true)
  const [followBus, setFollowBus] = useState(true)
  const [liveLocation, setLiveLocation] = useState(null)
  const [trackingError, setTrackingError] = useState(null)
  const [devPosition, setDevPosition] = useState(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const mapRef = useRef(null)

  const route = routes.find(r => r.id === selectedRouteId) || routes[0]

  useEffect(() => {
    routeService.getAll()
      .then(r => {
        const list = r.data || []
        setRoutes(list)
        if (list.length && !list.some(x => x.id === selectedRouteId)) {
          setSelectedRouteId(list[0].id)
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!selectedRouteId) return
    setStops([])
    routeService.getStops(selectedRouteId)
      .then(r => setStops(r.data?.stops || []))
      .catch(() => setStops([]))
  }, [selectedRouteId])

  const routePoints = useMemo(() => stops.map(s => [s.latitude, s.longitude]), [stops])

  const roadPath = useMemo(() => {
    const key = `route${selectedRouteId}`
    if (allPolylines && allPolylines[key] && allPolylines[key].length > 1) {
      return allPolylines[key]
    }
    return routePoints
  }, [selectedRouteId, routePoints])

  const fetchLiveLocation = useCallback(async () => {
    if (!selectedRouteId) return
    setIsRefreshing(true)
    try {
      const res = await liveLocationService.getByRoute(selectedRouteId)
      setLiveLocation(res.data)
      setTrackingError(null)
    } catch (err) {
      setTrackingError(err.response?.data?.message || 'Live tracking unavailable')
    } finally {
      setIsRefreshing(false)
    }
  }, [selectedRouteId])

  useEffect(() => {
    if (!isLive || !selectedRouteId) return

    let cancelled = false
    let timer = null

    const poll = async () => {
      if (cancelled) return
      try {
        const res = await liveLocationService.getByRoute(selectedRouteId)
        if (cancelled) return
        setLiveLocation(res.data)
        setTrackingError(null)
      } catch (err) {
        if (cancelled) return
        setTrackingError(err.response?.data?.message || 'Live tracking unavailable')
      } finally {
        if (!cancelled && !document.hidden) {
          timer = setTimeout(poll, POLL_INTERVAL_MS)
        }
      }
    }

    const onVisibility = () => {
      clearTimeout(timer)
      if (!document.hidden) poll()
    }
    document.addEventListener('visibilitychange', onVisibility)

    poll()
    return () => {
      cancelled = true
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [selectedRouteId, isLive])

  useEffect(() => {
    if (!IS_DEV || !isLive || !navigator.geolocation) return
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const payload = {
          routeId: selectedRouteId,
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          speed: pos.coords.speed ? pos.coords.speed * 3.6 : 0,
          heading: pos.coords.heading || 0,
        }
        setDevPosition(payload)
        liveLocationService.updateLocation(payload).catch(() => {})
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    )
    return () => navigator.geolocation.clearWatch(watchId)
  }, [isLive, selectedRouteId])

  const usingDevPosition = !liveLocation && devPosition
  const effectiveLocation = liveLocation || (usingDevPosition ? devPosition : null)
  const busPosition = effectiveLocation && effectiveLocation.latitude !== 0 ? [effectiveLocation.latitude, effectiveLocation.longitude] : null

  const lastPingAgeSec = liveLocation?.lastPingAt
    ? Math.max(0, Math.floor((Date.now() - new Date(liveLocation.lastPingAt).getTime()) / 1000))
    : null
  const isStale = liveLocation?.isStale === true || (lastPingAgeSec != null && lastPingAgeSec > STALE_AFTER_SEC)
  const isOffline = liveLocation?.status === 'offline'

  const gpsStatus = trackingError
    ? 'ERROR'
    : !liveLocation
      ? (usingDevPosition ? 'LIVE' : 'LOADING')
      : liveLocation?.status === 'ack'
        ? 'ACK'
        : isOffline
          ? 'OFFLINE'
          : isStale
            ? 'STALE'
            : 'LIVE'

  const STATUS_UI = {
    LIVE: { label: 'LIVE GPS', badge: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
    STALE: { label: lastPingAgeSec != null ? `STALE ${lastPingAgeSec}s` : 'STALE', badge: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-500' },
    OFFLINE: { label: 'OFFLINE', badge: 'bg-red-100 text-red-600', dot: 'bg-red-500' },
    ACK: { label: 'ACK', badge: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
    ERROR: { label: 'GPS/API ERROR', badge: 'bg-red-100 text-red-600', dot: 'bg-red-500' },
    LOADING: { label: 'CONNECTING...', badge: 'bg-gray-100 text-gray-500', dot: 'bg-gray-400' },
  }
  const statusUi = STATUS_UI[gpsStatus]
  const gpsLabelText = { LIVE: 'Live', STALE: 'Stale', OFFLINE: 'Offline', ACK: 'Ack', ERROR: 'Error', LOADING: 'Connecting...' }[gpsStatus]

  const tailPoints = useMemo(() => {
    const tail = liveLocation?.tail
    if (!Array.isArray(tail) || tail.length < 2) return []
    return tail
      .map(p => [Number(p?.latitude), Number(p?.longitude)])
      .filter(([lat, lng]) => Number.isFinite(lat) && Number.isFinite(lng))
  }, [liveLocation])

  const stopIdx = stops.length === 0 || !effectiveLocation ? 0 : stops.reduce((bestIdx, point, idx) => (
    haversineKm([point.latitude, point.longitude], busPosition) < haversineKm([stops[bestIdx].latitude, stops[bestIdx].longitude], busPosition) ? idx : bestIdx
  ), 0)

  const nextStop = stops[Math.min(stopIdx + 1, Math.max(stops.length - 1, 0))]
  const followStop = stops[Math.min(stopIdx + 2, Math.max(stops.length - 1, 0))]
  const nextStopCoord = nextStop ? [nextStop.latitude, nextStop.longitude] : null
  const nextStopName = nextStop?.name || 'Destination'

  const distToNext = busPosition && nextStopCoord ? haversineKm(busPosition, nextStopCoord).toFixed(1) : null
  const etaMins = distToNext != null ? Math.max(1, Math.round(parseFloat(distToNext) * 2.2)) : null
  const displaySpeed = effectiveLocation && effectiveLocation.speed > 0 ? Math.round(effectiveLocation.speed) : 0
  const etaTimeA = etaMins != null
    ? new Date(Date.now() + etaMins * 60000).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    : '--'
  const etaTimeB = etaMins != null
    ? new Date(Date.now() + (etaMins + 8) * 60000).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    : '--'

  const campusIcon = useMemo(() => createCampusDivIcon(), [])

  const getStopIcon = useCallback((idx) => {
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
  }, [stopIdx, stops.length])

  const showOfflineScreen = gpsStatus === 'OFFLINE'

  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 max-w-4xl mx-auto pb-6">
      {/* Route selector pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {routes.map(r => (
          <button
            key={r.id}
            onClick={() => setSelectedRouteId(r.id)}
            className={`px-4 py-2 rounded-xl text-xs font-bold shrink-0 transition-all ${selectedRouteId === r.id ? 'bg-[#40A047] text-white shadow-md' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
          >
            Route {r.id}
          </button>
        ))}
      </div>

      {/* Main card */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="p-5 flex items-center justify-between border-b border-gray-100">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-base font-bold text-gray-900">{route?.name || `Route ${selectedRouteId}`}</h2>
              <span className={`flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full ${statusUi.badge}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${statusUi.dot} animate-pulse`} />
                {statusUi.label}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">Driver Portal � {route?.busNumber || 'Fleet Vehicle'} � {stops.length} Stops</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchLiveLocation}
              disabled={isRefreshing}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600"
              title="Refresh GPS"
            >
              <RefreshCw size={17} className={isRefreshing ? 'animate-spin text-[#40A047]' : ''} />
            </button>
            <button onClick={() => setIsLive(v => !v)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              {isLive ? <Pause size={18} className="text-[#40A047]" /> : <Play size={18} className="text-[#40A047]" />}
            </button>
          </div>
        </div>

        {/* Map / Blank Screen */}
        <div className="relative" style={{ height: 380 }}>
          {showOfflineScreen ? (
            <div className="absolute inset-0 bg-slate-900/95 flex flex-col items-center justify-center p-6 text-center text-white z-10">
              <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center mb-4 ring-1 ring-white/20 shadow-inner">
                <WifiOff size={32} className="text-red-400 animate-pulse" />
              </div>
              <h3 className="text-lg font-bold text-white mb-1">Navigation Offline</h3>
              <p className="text-xs text-gray-300 max-w-sm mb-5 leading-relaxed">
                Vehicle GPS is currently offline. Start the trip or connect your GPS device to transmit live location.
              </p>
              <button
                onClick={fetchLiveLocation}
                disabled={isRefreshing}
                className="flex items-center gap-2 px-4 py-2 bg-[#40A047] hover:bg-[#2d7a33] text-white rounded-xl text-xs font-bold shadow-lg transition"
              >
                <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
                Check Status
              </button>
            </div>
          ) : (
            <MapContainer
              center={routePoints[0] || DEFAULT_CENTER}
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
              <FitRouteBounds points={roadPath?.length > 0 ? roadPath : routePoints} followBus={followBus} busPosition={busPosition} />

              {/* Scheduled Google Maps Driving Navigation Road Path */}
              {roadPath && roadPath.length > 1 && (
                <>
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

              {/* GPS trail breadcrumbs */}
              {tailPoints.length >= 2 && (
                <Polyline
                  positions={tailPoints}
                  pathOptions={{ color: '#3B82F6', weight: 3.5, opacity: 0.85, dashArray: '5 6', lineCap: 'round' }}
                />
              )}

              {/* Permanent Campus Marker */}
              <Marker position={HITAM_CAMPUS_COORD} icon={campusIcon}>
                <Popup>
                  <div className="text-xs">
                    <p className="font-bold text-[#166534]">HITAM Campus</p>
                    <p className="text-gray-500">Destination</p>
                  </div>
                </Popup>
              </Marker>

              {/* Route Stops */}
              {stops.map((stop, idx) => (
                <Marker key={`${selectedRouteId}-${stop.id || idx}`} position={[stop.latitude, stop.longitude]} icon={getStopIcon(idx)}>
                  <Popup>
                    <div className="text-xs space-y-1">
                      <p className="font-bold text-gray-900">{stop.name}</p>
                      {stop.stopTime && <p className="text-gray-500 font-semibold">Scheduled: {stop.stopTime}</p>}
                    </div>
                  </Popup>
                </Marker>
              ))}

              {/* Direction-Aware Live Vehicle */}
              {(liveLocation || usingDevPosition) && (
                <AnimatedBusMarker
                  location={liveLocation || devPosition}
                  isAnimating={gpsStatus === 'LIVE'}
                  routeName={`Route ${selectedRouteId}`}
                  iconSrc="/assets/icons/bus-realistic-yellow.png"
                >
                  <Popup>
                    <div className="text-xs space-y-1">
                      <p className="font-bold text-gray-900">{route?.busNumber || 'Bus'}</p>
                      <p className="text-[#40A047] font-semibold">Route {selectedRouteId} � Speed: {displaySpeed} km/h</p>
                    </div>
                  </Popup>
                </AnimatedBusMarker>
              )}
            </MapContainer>
          )}

          {/* Floating Distance Badge */}
          {!showOfflineScreen && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-[#0F172A]/92 backdrop-blur-md text-white px-4 py-2.5 rounded-2xl flex items-center gap-3 shadow-2xl border border-white/10 z-[500] whitespace-nowrap">
              <div className="w-8 h-8 bg-[#40A047] rounded-xl flex items-center justify-center shrink-0 shadow-sm">
                <img src="/assets/icons/bus-realistic-yellow.png" alt="Bus" className="w-5 h-5 object-contain" />
              </div>
              {busPosition && distToNext != null ? (
                <div>
                  <p className="text-xs font-bold">{distToNext} km to {nextStopName}</p>
                  <p className="text-[11px] text-gray-300">Arriving ~{etaMins} mins � {displaySpeed} km/h</p>
                </div>
              ) : (
                <div>
                  <p className="text-xs font-bold">Waiting for GPS fix...</p>
                  <p className="text-[11px] text-gray-400">{gpsStatus === 'ERROR' ? 'GPS offline' : 'Connecting'}</p>
                </div>
              )}
            </div>
          )}

          {/* Map Controls */}
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
              <button
                type="button"
                onClick={() => setFollowBus(f => !f)}
                className={`w-9 h-9 rounded-xl shadow-md flex items-center justify-center transition ${followBus ? 'bg-[#40A047] text-white ring-2 ring-emerald-300' : 'bg-white/95 text-gray-700 hover:bg-gray-50'}`}
                title={followBus ? 'Follow Vehicle (Active)' : 'Follow Vehicle'}
              >
                <Compass size={16} className={followBus ? 'text-white' : 'text-[#40A047]'} />
              </button>
              <button
                type="button"
                onClick={() => busPosition && mapRef.current?.flyTo(busPosition, 14, { duration: 0.6 })}
                className="w-9 h-9 bg-[#40A047] text-white rounded-xl shadow-md flex items-center justify-center hover:bg-[#2d7a33] transition"
                title="Center on Bus"
              >
                <Navigation size={15} />
              </button>
            </div>
          )}
        </div>

        {/* Timeline & Info */}
        <div className="p-5 border-t border-gray-100">
          <div className="flex items-center justify-between mb-3.5">
            <div>
              <p className="text-sm font-bold text-gray-900">Next Stop: {nextStopName}</p>
              <p className="text-xs text-[#40A047] font-semibold mt-0.5">Route: {route?.pickupPoint || 'HITAM Corridor'}</p>
            </div>
            <div className={`px-3.5 py-1.5 bg-green-100 rounded-xl ${etaMins == null || showOfflineScreen ? 'opacity-50' : ''}`}>
              <p className="text-sm font-bold text-[#40A047]">ETA: {!showOfflineScreen && etaMins != null ? `${etaMins} MINS` : '--'}</p>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-gray-500 mb-3.5">
            <span className="flex items-center gap-1.5"><Zap size={13} className="text-[#40A047]" /> Speed: {showOfflineScreen ? 0 : displaySpeed} km/h</span>
            <span className="flex items-center gap-1.5"><Navigation size={13} className="text-[#40A047]" /> GPS Feed: {gpsLabelText}</span>
          </div>

          {trackingError && (
            <p className="text-xs text-red-500 mb-3 break-words bg-red-50 p-2 rounded-lg">{trackingError}</p>
          )}

          <p className="text-xs font-bold text-gray-500 mb-2">Route Stops ({stops.length}):</p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {stops.map((stop, idx) => {
              const passed = idx < stopIdx
              const isCur = idx === stopIdx
              return (
                <div
                  key={stop.id || idx}
                  className={`flex-1 min-w-[76px] py-1.5 px-1.5 rounded-xl text-center ${isCur && !showOfflineScreen ? 'bg-[#40A047] text-white shadow-sm' : passed && !showOfflineScreen ? 'bg-green-100' : 'bg-gray-100'}`}
                >
                  <p className={`text-[10px] font-semibold truncate ${isCur && !showOfflineScreen ? 'text-white' : passed && !showOfflineScreen ? 'text-green-800' : 'text-gray-600'}`}>
                    {stop.name}
                  </p>
                  <p className={`text-[9px] mt-0.5 ${isCur && !showOfflineScreen ? 'text-green-100' : 'text-gray-400'}`}>
                    {stop.stopTime || `${idx + 1}`}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Stop ETA Summary */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <p className="text-xs text-gray-500 mb-1">Next Stop</p>
          <p className="text-sm font-bold text-gray-900">{nextStopName}</p>
          <p className="text-xs text-[#40A047] font-semibold mt-1">ETA: {!showOfflineScreen ? etaTimeA : 'Offline'}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <p className="text-xs text-gray-500 mb-1">Following Stop</p>
          <p className="text-sm font-bold text-gray-900">{followStop?.name || 'Destination'}</p>
          <p className="text-xs text-gray-500 font-semibold mt-1">ETA: {!showOfflineScreen ? etaTimeB : 'Offline'}</p>
        </div>
      </div>

      <p className="text-center text-xs text-gray-400 flex items-center justify-center gap-1.5">
        <RefreshCw size={11} /> Last GPS Update: {effectiveLocation?.lastPingAt ? new Date(effectiveLocation.lastPingAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '--'}
      </p>
    </motion.div>
  )
}

