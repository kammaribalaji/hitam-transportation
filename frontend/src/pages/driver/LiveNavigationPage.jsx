import React, { useState, useRef, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../../hooks/useAuth.js'
import { liveLocationService, routeService } from '../../api/services.js'
import { haversineKm } from '../../utils/routeCoordinates.js'
import { Bus, Navigation, Zap, RefreshCw, Play, Pause, ZoomIn, ZoomOut } from 'lucide-react'
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const DEFAULT_CENTER = [17.6269, 78.08607]
// Poll the backend (which caches HypeGPS) — never call HypeGPS from the browser.
const POLL_INTERVAL_MS = 6000
// Belt-and-suspenders: never show LIVE when the GPS fix is older than this.
const STALE_AFTER_SEC = 120
// Duration of the smooth marker glide between two real GPS fixes.
const ANIM_MS = 2500
const easeInOutQuad = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2)
// Phone-GPS push is a DEV-ONLY fallback. Vite replaces this with `false` in
// production builds, so the code below never runs in production.
const IS_DEV = import.meta.env.DEV

function FitRouteBounds({ points }) {
  const map = useMap()

  useEffect(() => {
    if (!points?.length) return
    const bounds = L.latLngBounds(points)
    map.fitBounds(bounds, { padding: [28, 28] })
  }, [map, points])

  return null
}

/**
 * Bus marker that glides smoothly between REAL GPS fixes (same behavior as the
 * student page). Only interpolates between real coordinates; freezes when the
 * feed is stale/offline/error. Dev phone-GPS positions are placed directly.
 */
function AnimatedBusMarker({ location, isAnimating, icon, children }) {
  const markerRef = useRef(null)
  const prevFixRef = useRef(null)
  const rafRef = useRef(null)

  useEffect(() => {
    const marker = markerRef.current
    if (!marker || !location) return

    const target = [location.latitude, location.longitude]

    if (!isAnimating) {
      cancelAnimationFrame(rafRef.current)
      marker.setLatLng(target)
      prevFixRef.current = target
      return
    }

    const from = prevFixRef.current
    if (!from || (from[0] === target[0] && from[1] === target[1])) {
      cancelAnimationFrame(rafRef.current)
      marker.setLatLng(target)
      prevFixRef.current = target
      return
    }

    cancelAnimationFrame(rafRef.current)
    const start = performance.now()
    const tick = (now) => {
      const t = Math.min((now - start) / ANIM_MS, 1)
      const e = easeInOutQuad(t)
      marker.setLatLng([
        from[0] + (target[0] - from[0]) * e,
        from[1] + (target[1] - from[1]) * e,
      ])
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        prevFixRef.current = target
      }
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [location, isAnimating])

  if (!location) return null
  return (
    <Marker ref={markerRef} position={[location.latitude, location.longitude]} icon={icon}>
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
  const [liveLocation, setLiveLocation] = useState(null)
  const [trackingError, setTrackingError] = useState(null)
  // Dev-only: the driver's own phone position (never shown in production).
  const [devPosition, setDevPosition] = useState(null)
  const mapRef = useRef(null)

  const route = routes.find(r => r.id === selectedRouteId) || routes[0]

  useEffect(() => {
    routeService.getAll()
      .then(r => {
        const list = r.data || []
        setRoutes(list)
        if (list.length && !list.some(x => x.id === selectedRouteId)) setSelectedRouteId(list[0].id)
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

  // Real feed: poll the backend's HypeGPS-backed location for this route.
  // Requests NEVER overlap; polling pauses while the tab is hidden and refreshes
  // immediately when the user returns.
  useEffect(() => {
    if (!isLive || !selectedRouteId) return
    let cancelled = false
    let timer = null
    const fetchLiveLocation = async () => {
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
          timer = setTimeout(fetchLiveLocation, POLL_INTERVAL_MS)
        }
      }
    }
    const onVisibility = () => {
      clearTimeout(timer)
      if (!document.hidden) fetchLiveLocation()
    }
    document.addEventListener('visibilitychange', onVisibility)
    fetchLiveLocation()
    return () => {
      cancelled = true
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [selectedRouteId, isLive])

  // DEV ONLY: report the driver's phone position to the backend. This code is
  // compiled out of production builds (IS_DEV === false). It never drives the
  // marker unless the real HypeGPS feed is unavailable AND we are in a dev build.
  useEffect(() => {
    if (!IS_DEV || !isLive || !selectedRouteId) return
    if (!navigator.geolocation) return

    let mounted = true
    const pushDevLocation = async () => {
      try {
        const position = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 5000, maximumAge: 2000 })
        })
        const payload = {
          routeId: selectedRouteId,
          busNumber: route?.busNumber || user?.assignedBusNumber || 'TS 09 AB 1234',
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          speed: Number.isFinite(position.coords.speed) ? Math.max(0, position.coords.speed * 3.6) : 0,
          heading: Number.isFinite(position.coords.heading) ? position.coords.heading : null,
          source: 'GPS',
        }
        const res = await liveLocationService.upsertMy(payload)
        if (mounted) setDevPosition(res.data)
      } catch { /* no permission / no fix — dev push skipped */ }
    }

    pushDevLocation()
    const interval = setInterval(pushDevLocation, POLL_INTERVAL_MS)
    return () => { mounted = false; clearInterval(interval) }
  }, [selectedRouteId, route?.busNumber, user?.assignedBusNumber, isLive])

  // --- GPS status: ERROR > OFFLINE > STALE > LIVE (never LIVE if stale) ---
  const lastPingAgeSec = liveLocation?.lastPingAt
    ? Math.max(0, Math.floor((Date.now() - new Date(liveLocation.lastPingAt).getTime()) / 1000))
    : null
  const isStale = liveLocation?.isStale === true || (lastPingAgeSec != null && lastPingAgeSec > STALE_AFTER_SEC)
  const isOffline = liveLocation?.status === 'offline'

  const gpsStatusRaw = trackingError
    ? 'ERROR'
    : !liveLocation
      ? 'LOADING'
      : liveLocation?.status === 'ack'
        ? 'ACK'
        : isOffline
          ? 'OFFLINE'
          : isStale
            ? 'STALE'
            : 'LIVE'

  // Dev builds only: when the real HypeGPS feed is unavailable, surface the
  // driver's own phone position with an explicit DEV label (never LIVE).
  const usingDevPosition = IS_DEV && gpsStatusRaw === 'ERROR' && devPosition
  const gpsStatus = usingDevPosition ? 'DEV' : gpsStatusRaw

  const STATUS_UI = {
    LIVE: { label: 'LIVE GPS', badge: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
    STALE: { label: lastPingAgeSec != null ? `STALE ${lastPingAgeSec}s` : 'STALE', badge: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-500' },
    OFFLINE: { label: 'OFFLINE', badge: 'bg-red-100 text-red-600', dot: 'bg-red-500' },
    ERROR: { label: 'GPS/API ERROR', badge: 'bg-red-100 text-red-600', dot: 'bg-red-500' },
    ACK: { label: 'ACK', badge: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
    LOADING: { label: 'CONNECTING…', badge: 'bg-gray-100 text-gray-500', dot: 'bg-gray-400' },
    DEV: { label: 'DEV PHONE GPS', badge: 'bg-sky-100 text-sky-700', dot: 'bg-sky-500' },
  }
  const statusUi = STATUS_UI[gpsStatus]
  const gpsLabelText = { LIVE: 'Live', STALE: 'Stale', OFFLINE: 'Offline', ACK: 'Ack', ERROR: 'Error', LOADING: 'Connecting…', DEV: 'Dev GPS' }[gpsStatus]

  // Actual GPS trail — real recent coordinates from the backend (hidden when the
  // provider gives no tail; never generated).
  const tailPoints = useMemo(() => {
    const tail = liveLocation?.tail
    if (!Array.isArray(tail) || tail.length < 2) return []
    return tail
      .map(p => [Number(p?.latitude), Number(p?.longitude)])
      .filter(([lat, lng]) => Number.isFinite(lat) && Number.isFinite(lng))
  }, [liveLocation])

  // The bus marker uses ONLY real coordinates: the backend HypeGPS feed, or
  // (dev builds, feed unavailable) the driver's own phone position. No simulation.
  const busPosition = liveLocation
    ? [liveLocation.latitude, liveLocation.longitude]
    : usingDevPosition
      ? [devPosition.latitude, devPosition.longitude]
      : null

  const stopIdx = stops.length === 0 || !busPosition ? 0 : stops.reduce((bestIdx, point, idx) => (
    haversineKm([point.latitude, point.longitude], busPosition) < haversineKm([stops[bestIdx].latitude, stops[bestIdx].longitude], busPosition) ? idx : bestIdx
  ), 0)

  const nextStop = stops[Math.min(stopIdx + 1, Math.max(stops.length - 1, 0))]
  const followStop = stops[Math.min(stopIdx + 2, Math.max(stops.length - 1, 0))]
  const nextStopCoord = nextStop ? [nextStop.latitude, nextStop.longitude] : null
  const nextStopName = nextStop?.name || 'Destination'

  const distToNext = busPosition && nextStopCoord ? haversineKm(busPosition, nextStopCoord).toFixed(1) : null
  const etaMins = distToNext != null ? Math.max(1, Math.round(parseFloat(distToNext) * 2.2)) : null
  const displaySpeed = liveLocation && liveLocation.speed > 0
    ? Math.round(liveLocation.speed)
    : usingDevPosition && devPosition?.speed > 0
      ? Math.round(devPosition.speed)
      : 0
  const etaTimeA = etaMins != null ? new Date(Date.now() + etaMins * 60000).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'
  const etaTimeB = etaMins != null ? new Date(Date.now() + (etaMins + 8) * 60000).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'

  const busIcon = useMemo(() => L.divIcon({
    className: 'live-bus-icon',
    html: '<div style="width:16px;height:16px;border-radius:9999px;background:#40A047;border:2px solid #ffffff;box-shadow:0 4px 10px rgba(0,0,0,0.25);"></div>',
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  }), [])

  const getStopIcon = (idx) => {
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
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Live Route Navigation</h1>
          <p className="text-sm text-gray-500 mt-0.5">{route?.busNumber || '—'} · {route?.name || 'Loading…'}</p>
        </div>
        <span className="px-3 py-1.5 bg-green-100 text-green-700 text-xs font-bold rounded-xl border border-green-200">On Route</span>
      </div>

      {/* Route tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {routes.length === 0 && <p className="text-sm text-gray-400">Loading routes…</p>}
        {routes.map(r => (
          <button key={r.id} onClick={() => setSelectedRouteId(r.id)}
            className={`shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border-2 transition-all ${selectedRouteId === r.id ? 'bg-[#40A047] text-white border-[#40A047]' : 'bg-white text-gray-600 border-gray-200 hover:border-green-400'}`}>
            <Bus size={14} /> {r.id}
          </button>
        ))}
      </div>

      {/* Map */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-gray-900">{route?.busNumber || '—'}</span>
              <span className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${isLive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isLive ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
                {isLive ? 'LIVE STREAM' : 'PAUSED'}
              </span>
              <span className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${statusUi.badge}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${statusUi.dot}`} />
                {statusUi.label}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">{route?.name || 'Loading route…'}</p>
          </div>
          <button onClick={() => setIsLive(v => !v)} className="p-2 hover:bg-gray-100 rounded-lg">
            {isLive ? <Pause size={18} className="text-[#40A047]" /> : <Play size={18} className="text-[#40A047]" />}
          </button>
        </div>

        <div className="relative" style={{ height: 300 }}>
          <MapContainer
            center={routePoints[0] || DEFAULT_CENTER}
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
            {routePoints.length > 1 && (
              <>
                <Polyline positions={routePoints} pathOptions={{ color: '#1f2937', weight: 7, opacity: 0.35, lineCap: 'round' }} />
                <Polyline positions={routePoints} pathOptions={{ color: '#40A047', weight: 4, opacity: 0.95, lineCap: 'round' }} />
              </>
            )}
            {tailPoints.length >= 2 && (
              <Polyline
                positions={tailPoints}
                pathOptions={{ color: '#3B82F6', weight: 3, opacity: 0.9, dashArray: '6 6', lineCap: 'round' }}
              />
            )}
            {routePoints.map((point, idx) => (
              <Marker key={`${selectedRouteId}-${idx}`} position={point} icon={getStopIcon(idx)}>
                <Popup>{stops[idx]?.name || `Stop ${idx + 1}`} {stops[idx]?.stopTime ? `· ${stops[idx].stopTime}` : ''}</Popup>
              </Marker>
            ))}
            {(liveLocation || usingDevPosition) && (
              <AnimatedBusMarker location={liveLocation || devPosition} isAnimating={gpsStatus === 'LIVE'} icon={busIcon}>
                <Popup>{route?.busNumber || 'Bus'} - Live Location</Popup>
              </AnimatedBusMarker>
            )}
          </MapContainer>

          {/* Legend: scheduled route vs actual GPS trail vs bus position */}
          <div className="absolute top-2 left-2 z-[500] bg-white/90 backdrop-blur rounded-lg shadow px-2.5 py-2 text-[10px] font-semibold text-gray-600 space-y-1.5">
            <div className="flex items-center gap-1.5">
              <span className="w-4 h-[3px] rounded-full bg-[#40A047] inline-block" />
              Scheduled Route
            </div>
            {tailPoints.length >= 2 && (
              <div className="flex items-center gap-1.5">
                <span className="w-4 border-t-2 border-dashed border-[#3B82F6] inline-block" />
                Actual GPS Trail
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#40A047] border border-white shadow inline-block" />
              Bus Position
            </div>
          </div>

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-[#0F172A]/90 text-white px-4 py-2.5 rounded-xl flex items-center gap-3 shadow-xl whitespace-nowrap">
            <div className="w-7 h-7 bg-[#40A047] rounded-lg flex items-center justify-center shrink-0">
              <Bus size={14} className="text-white" />
            </div>
            {busPosition && distToNext != null ? (
              <div>
                <p className="text-sm font-bold">{distToNext} km to {nextStopName}</p>
                <p className="text-xs text-gray-400">Arriving ~{etaMins} mins · {displaySpeed} km/h</p>
              </div>
            ) : (
              <div>
                <p className="text-sm font-bold">Waiting for GPS…</p>
                <p className="text-xs text-gray-400">{gpsStatus === 'ERROR' ? 'GPS/API error' : 'Connecting to live feed'}</p>
              </div>
            )}
          </div>

          <div className="absolute bottom-4 right-4 flex flex-col gap-2">
            <button onClick={() => mapRef.current?.zoomIn()} className="w-8 h-8 bg-white rounded-lg shadow flex items-center justify-center hover:bg-gray-50"><ZoomIn size={14} className="text-[#40A047]" /></button>
            <button onClick={() => mapRef.current?.zoomOut()} className="w-8 h-8 bg-white rounded-lg shadow flex items-center justify-center hover:bg-gray-50"><ZoomOut size={14} className="text-[#40A047]" /></button>
            <button onClick={() => busPosition && mapRef.current?.flyTo(busPosition, 13)} className="w-8 h-8 bg-[#40A047] rounded-lg shadow flex items-center justify-center"><Navigation size={13} className="text-white" /></button>
          </div>
        </div>

        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-bold text-gray-900">Next Stop: {nextStopName}</p>
              <p className="text-xs text-[#40A047] font-semibold">Boarding: {route?.pickupPoint || '—'}</p>
            </div>
            <div className={`px-3 py-1.5 bg-green-100 rounded-xl ${etaMins == null ? 'opacity-50' : ''}`}>
              <p className="text-sm font-bold text-[#40A047]">ETA: {etaMins != null ? `${etaMins} MINS` : '—'}</p>
            </div>
          </div>
          <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
            <span className="flex items-center gap-1.5"><Zap size={12} className="text-[#40A047]" /> Speed: {displaySpeed} km/h</span>
            <span className="flex items-center gap-1.5"><Navigation size={12} className="text-[#40A047]" /> GPS: {gpsLabelText}</span>
          </div>
          {trackingError && (
            <p className="text-xs text-red-500 mb-3 break-words">{trackingError}</p>
          )}
          {usingDevPosition && (
            <p className="text-xs text-sky-600 mb-3">Showing developer phone GPS (dev build only) — production uses the HypeGPS tracker.</p>
          )}
          <p className="text-xs font-bold text-gray-500 mb-2">Route Stops ({stops.length}):</p>
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {stops.map((stop, idx) => {
              const passed = idx < stopIdx
              const isCur = idx === stopIdx
              return (
                <div key={stop.id || idx} className={`flex-1 min-w-[72px] py-1 px-1 rounded-lg text-center ${isCur ? 'bg-[#40A047]' : passed ? 'bg-green-100' : 'bg-gray-100'}`}>
                  <p className="font-semibold truncate" style={{ fontSize: 9, color: isCur ? 'white' : passed ? '#166534' : '#6b7280' }}>{stop.name}</p>
                  <p className={`text-[9px] ${isCur ? 'text-green-200' : 'text-gray-400'}`}>{stop.stopTime}</p>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <p className="text-xs text-gray-500 mb-1">Next Stop</p>
          <p className="text-sm font-bold text-gray-900">{nextStopName}</p>
          <p className="text-xs text-[#40A047] font-semibold mt-1">ETA: {etaTimeA}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <p className="text-xs text-gray-500 mb-1">Following Stop</p>
          <p className="text-sm font-bold text-gray-900">{followStop?.name || 'Destination'}</p>
          <p className="text-xs text-gray-500 font-semibold mt-1">ETA: {etaTimeB}</p>
        </div>
      </div>
      <p className="text-center text-xs text-gray-400 flex items-center justify-center gap-1.5">
        <RefreshCw size={11} /> Last Updated: {liveLocation?.lastPingAt ? new Date(liveLocation.lastPingAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'}
      </p>
    </motion.div>
  )
}
