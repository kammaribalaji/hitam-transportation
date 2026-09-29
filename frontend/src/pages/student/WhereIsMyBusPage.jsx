import React, { useState, useMemo, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../../hooks/useAuth.js'
import { routeService, liveLocationService } from '../../api/services.js'
import {
  Search,
  ArrowUpDown,
  Bus,
  MapPin,
  Clock,
  Navigation,
  Sparkles,
  ChevronRight,
  ChevronDown,
  History,
  X,
  Compass,
  CheckCircle2,
  Calendar,
  Layers,
  Zap,
  QrCode,
  Armchair,
  Gauge,
  Sun,
  Sunset,
  ArrowRight,
  AlertCircle,
} from 'lucide-react'

const HITAM_CAMPUS_NAME = 'HITAM College Campus'

export default function WhereIsMyBusPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [topTab, setTopTab] = useState('SPOT') // 'SPOT' | 'PASS' | 'SEATS'
  const [routes, setRoutes] = useState([])
  const [allLiveLocations, setAllLiveLocations] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  const [fromQuery, setFromQuery] = useState(user?.boardingPoint || '')
  const [toQuery, setToQuery] = useState(HITAM_CAMPUS_NAME)
  const [busSearchQuery, setBusSearchQuery] = useState('')
  const [liveStopQuery, setLiveStopQuery] = useState('')
  const [corridorFilter, setCorridorFilter] = useState('ALL') // 'ALL' | 'MORNING' | 'RETURN' | 'METRO'
  const [expandedRouteId, setExpandedRouteId] = useState(null)

  const [showFromSuggestions, setShowFromSuggestions] = useState(false)
  const [showToSuggestions, setShowToSuggestions] = useState(false)
  const [showLiveStopSuggestions, setShowLiveStopSuggestions] = useState(false)

  const [searchHistory, setSearchHistory] = useState(() => {
    try {
      const saved = localStorage.getItem('hitam_bus_search_history')
      return saved
        ? JSON.parse(saved)
        : [
            { from: 'Temple Bus Stop', to: HITAM_CAMPUS_NAME, routeId: '15' },
            { from: 'Sangareddy Old Bus Stand', to: HITAM_CAMPUS_NAME, routeId: '12' },
            { from: 'KPHB Metro', to: HITAM_CAMPUS_NAME, routeId: '5' },
            { from: 'Miyapur X Road', to: HITAM_CAMPUS_NAME, routeId: '7' },
          ]
    } catch {
      return []
    }
  })

  // Load routes and live positions
  useEffect(() => {
    setIsLoading(true)
    Promise.all([
      routeService.getAll().catch(() => ({ data: [] })),
      liveLocationService.getAll().catch(() => ({ data: [] })),
    ]).then(([routesRes, liveRes]) => {
      setRoutes(routesRes.data || [])
      setAllLiveLocations(liveRes.data || [])
      setIsLoading(false)
    })
  }, [])

  // Complete list of 23 full routes
  const fullRoutesList = useMemo(() => {
    const existingMap = new Map(routes.map((r) => [String(r.id), r]))
    return Array.from({ length: 23 }, (_, i) => {
      const id = String(i + 1)
      if (existingMap.has(id)) return existingMap.get(id)
      return {
        id,
        name: `Route ${id} - City Corridor to HITAM Campus`,
        busNumber: `TS 09 UB ${1200 + parseInt(id)}`,
        startPoint: `Terminal ${id}`,
        endPoint: 'HITAM College',
        pickupPoint: 'Campus Gate',
        stops: [`Terminal ${id}`, `Junction ${id}`, 'HITAM College'],
        reportingTime: '07:30 AM',
        totalSeats: 40,
        bookedSeats: 30,
        distance: '35 km',
      }
    })
  }, [routes])

  // Collect all unique stop names across all routes
  const allUniqueStops = useMemo(() => {
    const set = new Set([HITAM_CAMPUS_NAME, 'HITAM Campus Gate'])
    for (const r of fullRoutesList) {
      if (Array.isArray(r.stops)) {
        for (const s of r.stops) {
          const name = typeof s === 'string' ? s : s?.name
          if (name) set.add(name.trim())
        }
      }
      if (r.startPoint) set.add(r.startPoint.trim())
      if (r.pickupPoint) set.add(r.pickupPoint.trim())
    }
    return Array.from(set).sort()
  }, [fullRoutesList])

  const filteredFromSuggestions = useMemo(() => {
    if (!fromQuery.trim()) return allUniqueStops.slice(0, 10)
    const q = fromQuery.toLowerCase().trim()
    return allUniqueStops.filter((s) => s.toLowerCase().includes(q)).slice(0, 10)
  }, [allUniqueStops, fromQuery])

  const filteredToSuggestions = useMemo(() => {
    if (!toQuery.trim()) return allUniqueStops.slice(0, 10)
    const q = toQuery.toLowerCase().trim()
    return allUniqueStops.filter((s) => s.toLowerCase().includes(q)).slice(0, 10)
  }, [allUniqueStops, toQuery])

  const filteredLiveStopSuggestions = useMemo(() => {
    if (!liveStopQuery.trim()) return allUniqueStops.slice(0, 10)
    const q = liveStopQuery.toLowerCase().trim()
    return allUniqueStops.filter((s) => s.toLowerCase().includes(q)).slice(0, 10)
  }, [allUniqueStops, liveStopQuery])

  // Live Location Map by Route ID
  const liveLocationMap = useMemo(() => {
    const map = new Map()
    for (const loc of allLiveLocations) {
      if (loc.routeId) map.set(String(loc.routeId), loc)
    }
    return map
  }, [allLiveLocations])

  // Swap From and To stops
  const handleSwap = () => {
    const temp = fromQuery
    setFromQuery(toQuery)
    setToQuery(temp)
  }

  // Save to search history
  const recordSearch = (from, to, routeId) => {
    const newEntry = { from, to, routeId, timestamp: Date.now() }
    const updated = [newEntry, ...searchHistory.filter((h) => !(h.from === from && h.to === to))].slice(0, 6)
    setSearchHistory(updated)
    try {
      localStorage.setItem('hitam_bus_search_history', JSON.stringify(updated))
    } catch {}
  }

  // Filter matching routes based on from/to queries and category tab
  const matchingBuses = useMemo(() => {
    const cleanFrom = fromQuery.toLowerCase().trim()
    const cleanTo = toQuery.toLowerCase().trim()
    const cleanBus = busSearchQuery.toLowerCase().trim()
    const cleanLiveStop = liveStopQuery.toLowerCase().trim()

    return fullRoutesList.filter((route) => {
      // 1. Bus Number / Route Name direct filter
      if (cleanBus) {
        const matchesBusNumber = route.busNumber?.toLowerCase().includes(cleanBus)
        const matchesRouteName = route.name?.toLowerCase().includes(cleanBus)
        const matchesRouteId = String(route.id) === cleanBus.replace(/\D/g, '')
        if (!matchesBusNumber && !matchesRouteName && !matchesRouteId) return false
      }

      // 2. Live Stop Board filter
      if (cleanLiveStop) {
        const stopsList = Array.isArray(route.stops) ? route.stops : []
        const hasStop = stopsList.some((s) => {
          const name = typeof s === 'string' ? s : s?.name
          return name?.toLowerCase().includes(cleanLiveStop)
        })
        const hasStart = route.startPoint?.toLowerCase().includes(cleanLiveStop)
        if (!hasStop && !hasStart) return false
      }

      // 3. Category Filter
      if (corridorFilter === 'METRO') {
        const isMetroRoute =
          route.name?.toLowerCase().includes('metro') ||
          route.startPoint?.toLowerCase().includes('metro') ||
          (Array.isArray(route.stops) &&
            route.stops.some((s) => (typeof s === 'string' ? s : s?.name)?.toLowerCase().includes('metro')))
        if (!isMetroRoute) return false
      }

      // 4. From / To Stop corridor matching
      if (!cleanFrom && !cleanTo) return true

      const stopsList = Array.isArray(route.stops) ? route.stops : []
      const stopNames = stopsList.map((s) => (typeof s === 'string' ? s : s?.name || '').toLowerCase())
      if (route.startPoint) stopNames.unshift(route.startPoint.toLowerCase())
      if (route.endPoint) stopNames.push(route.endPoint.toLowerCase())

      let matchesFrom = true
      let matchesTo = true
      let fromIdx = -1
      let toIdx = -1

      if (cleanFrom) {
        fromIdx = stopNames.findIndex((s) => s.includes(cleanFrom) || cleanFrom.includes(s))
        matchesFrom = fromIdx !== -1
      }

      if (cleanTo) {
        toIdx = stopNames.findIndex((s) => s.includes(cleanTo) || cleanTo.includes(s))
        matchesTo = toIdx !== -1
      }

      // If both From and To are provided, verify sequential direction!
      if (cleanFrom && cleanTo && matchesFrom && matchesTo) {
        if (corridorFilter === 'RETURN') {
          return toIdx <= fromIdx || cleanTo.includes('hitam') || cleanFrom.includes('hitam')
        }
        return fromIdx <= toIdx || cleanFrom.includes('hitam') || cleanTo.includes('hitam')
      }

      return matchesFrom && matchesTo
    })
  }, [fullRoutesList, fromQuery, toQuery, busSearchQuery, liveStopQuery, corridorFilter])

  const popularCorridors = [
    { from: 'Sangareddy Old Bus Stand', to: HITAM_CAMPUS_NAME, routeId: '12', tag: 'Direct Corridor' },
    { from: 'KPHB Colony', to: HITAM_CAMPUS_NAME, routeId: '5', tag: 'Metro Connector' },
    { from: 'Miyapur X Road', to: HITAM_CAMPUS_NAME, routeId: '7', tag: 'Fast Corridor' },
    { from: 'JNTU Main Gate', to: HITAM_CAMPUS_NAME, routeId: '8', tag: 'High Frequency' },
    { from: 'Suchitra Junction', to: HITAM_CAMPUS_NAME, routeId: '15', tag: 'Highway Route' },
    { from: 'ECIL X Road', to: HITAM_CAMPUS_NAME, routeId: '18', tag: 'City Express' },
    { from: 'Secunderabad Station', to: HITAM_CAMPUS_NAME, routeId: '11', tag: 'Central Line' },
    { from: 'Medchal Checkpost', to: HITAM_CAMPUS_NAME, routeId: '19', tag: 'North Corridor' },
  ]

  const handleTrackBus = (routeId) => {
    recordSearch(fromQuery || 'Selected Corridor', toQuery || HITAM_CAMPUS_NAME, routeId)
    navigate(`/student/tracking?route=${routeId}`)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-5xl mx-auto space-y-4 pb-12 px-2 sm:px-4 w-full"
    >
      {/* 1. TOP APP HEADER (Where Is My Train Authentic Design) */}
      <div className="bg-[#1a2e1a] rounded-3xl p-4 sm:p-5 text-white shadow-xl border border-emerald-900/60 overflow-hidden relative">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-[#40A047] rounded-2xl flex items-center justify-center shadow-lg shadow-green-950/40 shrink-0">
              <Bus size={24} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-black tracking-wide text-white uppercase">Where Is My Bus</h1>
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-extrabold text-[10px] uppercase tracking-wider border border-emerald-500/30">
                  HITAM Edition
                </span>
              </div>
              <p className="text-xs text-emerald-200/80 mt-0.5">
                Real-time college bus discovery, stop schedules & live GPS tracking
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/student/tracking')}
              className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-1.5 transition-all"
            >
              <Navigation size={14} className="text-emerald-400" />
              <span>Full Live Map</span>
            </button>
          </div>
        </div>

        {/* Top 3 Tabs: SPOT | PNR/PASS | SEATS */}
        <div className="grid grid-cols-3 gap-2 mt-4 max-w-md mx-auto sm:mx-0">
          <button
            onClick={() => setTopTab('SPOT')}
            className={`py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
              topTab === 'SPOT'
                ? 'bg-[#40A047] text-white shadow-md shadow-green-900/40 ring-2 ring-emerald-400/40'
                : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
            }`}
          >
            <Compass size={14} />
            <span>SPOT BUS</span>
          </button>

          <button
            onClick={() => setTopTab('PASS')}
            className={`py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
              topTab === 'PASS'
                ? 'bg-[#40A047] text-white shadow-md shadow-green-900/40 ring-2 ring-emerald-400/40'
                : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
            }`}
          >
            <QrCode size={14} />
            <span>MY PASS</span>
          </button>

          <button
            onClick={() => setTopTab('SEATS')}
            className={`py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
              topTab === 'SEATS'
                ? 'bg-[#40A047] text-white shadow-md shadow-green-900/40 ring-2 ring-emerald-400/40'
                : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
            }`}
          >
            <Armchair size={14} />
            <span>SEATS & FARE</span>
          </button>
        </div>
      </div>

      {/* 2. SPOT TAB CONTENT */}
      {topTab === 'SPOT' && (
        <div className="space-y-4">
          {/* A. DUAL STATION / STOP SEARCH CARD (Exact Where Is My Train Layout) */}
          <div className="bg-white rounded-3xl p-4 sm:p-5 border border-emerald-100 shadow-xl relative">
            <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2.5">
              <span className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <MapPin size={15} className="text-[#40A047]" />
                Find Buses Between Stops
              </span>
              <span className="text-[11px] font-bold text-slate-400">All 23 College Routes</span>
            </div>

            <div className="relative space-y-2.5">
              {/* FROM STOP INPUT */}
              <div className="relative">
                <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-slate-50 border border-slate-200 focus-within:border-[#40A047] focus-within:bg-white focus-within:ring-2 focus-within:ring-green-100 transition-all">
                  <div className="w-3.5 h-3.5 rounded-full border-2 border-emerald-600 bg-emerald-100 flex items-center justify-center shrink-0">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                      From Station / Stop
                    </label>
                    <input
                      type="text"
                      value={fromQuery}
                      onChange={(e) => {
                        setFromQuery(e.target.value)
                        setShowFromSuggestions(true)
                      }}
                      onFocus={() => setShowFromSuggestions(true)}
                      placeholder="Enter Boarding Stop (e.g. Sangareddy, KPHB, Miyapur)..."
                      className="w-full bg-transparent text-sm font-bold text-slate-900 placeholder:text-slate-400 outline-none"
                    />
                  </div>
                  {fromQuery && (
                    <button
                      onClick={() => setFromQuery('')}
                      className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* From Suggestions Dropdown */}
                <AnimatePresence>
                  {showFromSuggestions && filteredFromSuggestions.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 5 }}
                      className="absolute left-0 right-0 top-full mt-1.5 z-30 bg-white rounded-2xl shadow-2xl border border-slate-200 max-h-56 overflow-y-auto divide-y divide-slate-100"
                    >
                      {filteredFromSuggestions.map((stop) => (
                        <button
                          key={stop}
                          type="button"
                          onClick={() => {
                            setFromQuery(stop)
                            setShowFromSuggestions(false)
                          }}
                          className="w-full text-left px-4 py-2.5 hover:bg-emerald-50 text-xs font-bold text-slate-700 flex items-center justify-between transition-all"
                        >
                          <span className="flex items-center gap-2 truncate">
                            <MapPin size={13} className="text-emerald-600 shrink-0" />
                            {stop}
                          </span>
                          <span className="text-[10px] text-slate-400 font-semibold shrink-0">Select</span>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* FLOATING SWAP BUTTON */}
              <div className="flex justify-end pr-6 -my-2 relative z-10">
                <motion.button
                  whileTap={{ rotate: 180, scale: 0.9 }}
                  type="button"
                  onClick={handleSwap}
                  className="w-9 h-9 rounded-full bg-slate-900 hover:bg-slate-800 text-white shadow-lg border-2 border-white flex items-center justify-center transition-all"
                  title="Swap Origin and Destination"
                >
                  <ArrowUpDown size={15} className="text-emerald-400" />
                </motion.button>
              </div>

              {/* TO STOP INPUT */}
              <div className="relative">
                <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-slate-50 border border-slate-200 focus-within:border-[#40A047] focus-within:bg-white focus-within:ring-2 focus-within:ring-green-100 transition-all">
                  <div className="w-3.5 h-3.5 rounded-sm bg-red-600 flex items-center justify-center shrink-0">
                    <div className="w-1.5 h-1.5 rounded-sm bg-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                      To Station / Destination
                    </label>
                    <input
                      type="text"
                      value={toQuery}
                      onChange={(e) => {
                        setToQuery(e.target.value)
                        setShowToSuggestions(true)
                      }}
                      onFocus={() => setShowToSuggestions(true)}
                      placeholder="Enter Destination (e.g. HITAM Campus)..."
                      className="w-full bg-transparent text-sm font-bold text-slate-900 placeholder:text-slate-400 outline-none"
                    />
                  </div>
                  {toQuery && (
                    <button
                      onClick={() => setToQuery('')}
                      className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* To Suggestions Dropdown */}
                <AnimatePresence>
                  {showToSuggestions && filteredToSuggestions.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 5 }}
                      className="absolute left-0 right-0 top-full mt-1.5 z-30 bg-white rounded-2xl shadow-2xl border border-slate-200 max-h-56 overflow-y-auto divide-y divide-slate-100"
                    >
                      {filteredToSuggestions.map((stop) => (
                        <button
                          key={stop}
                          type="button"
                          onClick={() => {
                            setToQuery(stop)
                            setShowToSuggestions(false)
                          }}
                          className="w-full text-left px-4 py-2.5 hover:bg-emerald-50 text-xs font-bold text-slate-700 flex items-center justify-between transition-all"
                        >
                          <span className="flex items-center gap-2 truncate">
                            <MapPin size={13} className="text-red-500 shrink-0" />
                            {stop}
                          </span>
                          <span className="text-[10px] text-slate-400 font-semibold shrink-0">Select</span>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* BIG "FIND BUSES" ACTION BUTTON */}
            <div className="mt-4">
              <button
                type="button"
                onClick={() => {
                  setShowFromSuggestions(false)
                  setShowToSuggestions(false)
                }}
                className="w-full py-3.5 px-6 rounded-2xl bg-[#40A047] hover:bg-[#34883a] active:scale-[0.99] text-white font-black text-sm uppercase tracking-wider shadow-lg shadow-green-700/25 flex items-center justify-center gap-2 transition-all"
              >
                <Search size={18} />
                <span>FIND BUSES</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>

          {/* B. DUAL QUICK SEARCH CARDS (Spot Bus & Live Station Board) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Spot Bus by Number / Name */}
            <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-slate-200 shadow-sm">
              <span className="block text-[11px] font-black text-slate-700 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <Bus size={14} className="text-[#40A047]" />
                Spot Bus by Number / Code
              </span>
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200 focus-within:border-[#40A047] focus-within:bg-white">
                <Search size={14} className="text-slate-400 shrink-0" />
                <input
                  type="text"
                  value={busSearchQuery}
                  onChange={(e) => setBusSearchQuery(e.target.value)}
                  placeholder="e.g. 1215, Route 12, TS 09 UB..."
                  className="w-full bg-transparent text-xs font-bold text-slate-900 placeholder:text-slate-400 outline-none"
                />
                {busSearchQuery && (
                  <button onClick={() => setBusSearchQuery('')} className="text-slate-400 hover:text-slate-600">
                    <X size={13} />
                  </button>
                )}
              </div>
            </div>

            {/* Live Station / Stop Board */}
            <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-slate-200 shadow-sm relative">
              <span className="block text-[11px] font-black text-slate-700 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <Clock size={14} className="text-[#40A047]" />
                Live Stop Board (Departures)
              </span>
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200 focus-within:border-[#40A047] focus-within:bg-white">
                <MapPin size={14} className="text-slate-400 shrink-0" />
                <input
                  type="text"
                  value={liveStopQuery}
                  onChange={(e) => {
                    setLiveStopQuery(e.target.value)
                    setShowLiveStopSuggestions(true)
                  }}
                  onFocus={() => setShowLiveStopSuggestions(true)}
                  placeholder="e.g. KPHB, Miyapur, Suchitra..."
                  className="w-full bg-transparent text-xs font-bold text-slate-900 placeholder:text-slate-400 outline-none"
                />
                {liveStopQuery && (
                  <button onClick={() => setLiveStopQuery('')} className="text-slate-400 hover:text-slate-600">
                    <X size={13} />
                  </button>
                )}
              </div>

              {/* Live Stop Suggestions */}
              <AnimatePresence>
                {showLiveStopSuggestions && filteredLiveStopSuggestions.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 5 }}
                    className="absolute left-3.5 right-3.5 top-full mt-1.5 z-30 bg-white rounded-2xl shadow-2xl border border-slate-200 max-h-48 overflow-y-auto divide-y divide-slate-100"
                  >
                    {filteredLiveStopSuggestions.map((stop) => (
                      <button
                        key={stop}
                        type="button"
                        onClick={() => {
                          setLiveStopQuery(stop)
                          setShowLiveStopSuggestions(false)
                        }}
                        className="w-full text-left px-3.5 py-2 hover:bg-emerald-50 text-xs font-bold text-slate-700 flex items-center justify-between"
                      >
                        <span className="truncate">{stop}</span>
                        <span className="text-[10px] text-emerald-600 font-extrabold">Filter</span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* C. POPULAR & RECENT CORRIDOR CHIPS */}
          <div className="space-y-2">
            <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5 px-1">
              <Sparkles size={13} className="text-amber-500" />
              Popular HITAM Corridors & Recent Searches
            </span>
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {popularCorridors.map((c) => (
                <button
                  key={c.from}
                  type="button"
                  onClick={() => {
                    setFromQuery(c.from)
                    setToQuery(c.to)
                  }}
                  className="px-3 py-1.5 rounded-xl bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 text-slate-700 text-xs font-bold shrink-0 shadow-sm flex items-center gap-1.5 transition-all"
                >
                  <span className="text-emerald-700 font-black">{c.from.split(' ')[0]}</span>
                  <span className="text-slate-400">➔</span>
                  <span>HITAM</span>
                  <span className="px-1.5 py-0.2 text-[9px] rounded bg-emerald-100 text-emerald-800 font-extrabold">
                    R{c.routeId}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* D. CORRIDOR CATEGORY TABS */}
          <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-2">
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
              <button
                onClick={() => setCorridorFilter('ALL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                  corridorFilter === 'ALL'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All 23 Routes
              </button>
              <button
                onClick={() => setCorridorFilter('MORNING')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1 ${
                  corridorFilter === 'MORNING'
                    ? 'bg-amber-500 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Sun size={12} />
                <span>Morning (To Campus)</span>
              </button>
              <button
                onClick={() => setCorridorFilter('RETURN')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1 ${
                  corridorFilter === 'RETURN'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Sunset size={12} />
                <span>Return (From Campus)</span>
              </button>
              <button
                onClick={() => setCorridorFilter('METRO')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1 ${
                  corridorFilter === 'METRO'
                    ? 'bg-emerald-700 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Zap size={12} />
                <span>Metro Connectors</span>
              </button>
            </div>

            <span className="text-xs font-extrabold text-slate-500 shrink-0">
              {matchingBuses.length} {matchingBuses.length === 1 ? 'Bus' : 'Buses'} Available
            </span>
          </div>

          {/* E. RESULTS FEED (Train List Style) */}
          <div className="space-y-3">
            {matchingBuses.length === 0 ? (
              <div className="bg-white rounded-3xl p-8 text-center border border-slate-200 shadow-sm space-y-3">
                <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
                  <Bus size={28} />
                </div>
                <h3 className="text-base font-black text-slate-800">No Direct Buses Found on this Corridor</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Try clearing your search query or selecting a popular junction like KPHB, Miyapur, Sangareddy, or
                  JNTU.
                </p>
                <button
                  onClick={() => {
                    setFromQuery('')
                    setToQuery(HITAM_CAMPUS_NAME)
                    setBusSearchQuery('')
                    setLiveStopQuery('')
                  }}
                  className="px-4 py-2 rounded-xl bg-[#40A047] text-white text-xs font-bold shadow-md hover:bg-emerald-600"
                >
                  Reset Search & View All Buses
                </button>
              </div>
            ) : (
              matchingBuses.map((route) => {
                const live = liveLocationMap.get(String(route.id))
                const isOnline =
                  live &&
                  (live.status === 'online' || live.status === 'LIVE' || (live.speed && live.speed > 0)) &&
                  !live.isStale &&
                  live.latitude !== 0

                const speed = live?.speed ? Math.round(live.speed) : 0
                const isExpanded = expandedRouteId === route.id
                const stopsCount = Array.isArray(route.stops) ? route.stops.length : 12

                return (
                  <motion.div
                    key={route.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-md hover:shadow-lg transition-all overflow-hidden"
                  >
                    {/* Top Bar: Route Code, Name & Runs */}
                    <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 p-3 sm:p-4 text-white flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <span className="px-2.5 py-1 rounded-xl bg-[#40A047] text-white font-black text-xs sm:text-sm tracking-wider shadow-sm">
                          ROUTE {route.id}
                        </span>
                        <div>
                          <h3 className="text-xs sm:text-sm font-black text-white leading-tight">{route.name}</h3>
                          <p className="text-[11px] text-emerald-300 font-semibold mt-0.5">
                            Bus {route.busNumber || `TS 09 UB ${1200 + parseInt(route.id)}`}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-extrabold text-slate-300 uppercase tracking-wider bg-white/10 px-2 py-0.5 rounded-md">
                          Runs: Mon - Sat
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase flex items-center gap-1 ${
                            isOnline
                              ? 'bg-emerald-500 text-white animate-pulse'
                              : 'bg-slate-800 text-slate-300 border border-slate-700'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-white' : 'bg-slate-400'}`}
                          />
                          {isOnline ? 'Live GPS' : 'Standby / Offline'}
                        </span>
                      </div>
                    </div>

                    {/* Middle Row: Journey Timing & Distance Line */}
                    <div className="p-4 sm:p-5">
                      <div className="grid grid-cols-3 items-center gap-2 sm:gap-4 border-b border-slate-100 pb-4">
                        {/* Origin Stop */}
                        <div>
                          <span className="text-base sm:text-lg font-black text-slate-900 block leading-tight">
                            {route.reportingTime || '07:15 AM'}
                          </span>
                          <span className="text-xs font-bold text-slate-600 block mt-0.5 line-clamp-1">
                            {route.startPoint || 'Terminal Origin'}
                          </span>
                          <span className="text-[10px] font-extrabold text-emerald-700 uppercase">Departure</span>
                        </div>

                        {/* Middle Line / Stops Count */}
                        <div className="text-center px-1">
                          <span className="text-[11px] font-extrabold text-slate-400 block mb-1">
                            ~ 45m duration
                          </span>
                          <div className="relative flex items-center justify-center">
                            <div className="h-1 w-full bg-emerald-200 rounded-full" />
                            <div className="absolute w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-md">
                              <Bus size={12} />
                            </div>
                          </div>
                          <span className="text-[10px] font-extrabold text-slate-500 block mt-1">
                            {stopsCount} Stop Points
                          </span>
                        </div>

                        {/* Destination Stop */}
                        <div className="text-right">
                          <span className="text-base sm:text-lg font-black text-slate-900 block leading-tight">
                            08:45 AM
                          </span>
                          <span className="text-xs font-bold text-slate-600 block mt-0.5 line-clamp-1">
                            {route.endPoint || 'HITAM Campus'}
                          </span>
                          <span className="text-[10px] font-extrabold text-red-600 uppercase">Arrival</span>
                        </div>
                      </div>

                      {/* Live Location / Status Strip */}
                      <div className="mt-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                              isOnline ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            <Gauge size={16} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-black text-slate-800 truncate">
                              {isOnline
                                ? `Active Live Speed: ${speed} km/h`
                                : `Parked at ${route.startPoint || 'Origin Station'}`}
                            </p>
                            <p className="text-[11px] text-slate-500 font-semibold truncate">
                              {isOnline ? 'Moving smoothly towards campus' : 'Scheduled morning & return service'}
                            </p>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setExpandedRouteId(isExpanded ? null : route.id)}
                            className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1 transition-all"
                          >
                            <span>{isExpanded ? 'Hide Stops' : 'View Stops'}</span>
                            <ChevronDown
                              size={14}
                              className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                            />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleTrackBus(route.id)}
                            className="px-4 py-2 rounded-xl bg-[#40A047] hover:bg-[#34883a] text-white font-black text-xs shadow-md shadow-green-700/20 flex items-center gap-1.5 transition-all active:scale-95"
                          >
                            <Navigation size={13} />
                            <span>Track Live Bus</span>
                            <ChevronRight size={14} />
                          </button>
                        </div>
                      </div>

                      {/* Expandable Stops Sequence */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mt-4 pt-4 border-t border-slate-100 space-y-2 overflow-hidden"
                          >
                            <span className="text-[11px] font-black text-slate-600 uppercase tracking-wider block">
                              Sequential Stop Schedule ({stopsCount} Stops)
                            </span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                              {(Array.isArray(route.stops) ? route.stops : []).map((stop, idx) => {
                                const stopName = typeof stop === 'string' ? stop : stop?.name || `Stop ${idx + 1}`
                                const isCampus = stopName.toLowerCase().includes('hitam')
                                return (
                                  <div
                                    key={idx}
                                    className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 text-xs ${
                                      isCampus
                                        ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-black'
                                        : 'bg-slate-50 border-slate-200 text-slate-700 font-bold'
                                    }`}
                                  >
                                    <span className="flex items-center gap-1.5 truncate">
                                      <span className="w-5 h-5 rounded-full bg-white border border-slate-300 text-[10px] font-black flex items-center justify-center shrink-0">
                                        {idx + 1}
                                      </span>
                                      <span className="truncate">{stopName}</span>
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-extrabold shrink-0">
                                      {typeof stop === 'object' && stop?.time ? stop.time : '—'}
                                    </span>
                                  </div>
                                )
                              })}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                )
              })
            )}
          </div>
        </div>
      )}

      {/* 3. PNR / PASS TAB */}
      {topTab === 'PASS' && (
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-emerald-100 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-black text-slate-900">Student Transport Pass</h2>
              <p className="text-xs text-slate-500">Official digital transport pass and payment status</p>
            </div>
            <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 font-black text-xs">
              {user?.paymentStatus || 'ACTIVE'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Student Name</span>
              <p className="text-sm font-black text-slate-800">{user?.name || 'Student'}</p>
              <p className="text-xs text-slate-500 font-semibold">{user?.rollNumber} · {user?.department}</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Assigned Route & Stop</span>
              <p className="text-sm font-black text-slate-800">Route {user?.assignedRouteId || '12'}</p>
              <p className="text-xs text-emerald-700 font-bold truncate">{user?.boardingPoint || 'Campus Gate'}</p>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => navigate('/student/my-pass')}
              className="px-5 py-2.5 rounded-xl bg-[#40A047] text-white font-black text-xs flex items-center gap-1.5 shadow-md shadow-green-700/20"
            >
              <QrCode size={14} />
              <span>Open Digital QR Pass</span>
            </button>
          </div>
        </div>
      )}

      {/* 4. SEATS & FARE TAB */}
      {topTab === 'SEATS' && (
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-emerald-100 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-black text-slate-900">Seat Availability Matrix</h2>
              <p className="text-xs text-slate-500">Seat status across all 23 active fleet buses</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {fullRoutesList.map((r) => (
              <div key={r.id} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded bg-emerald-600 text-white font-black text-xs">
                    Route {r.id}
                  </span>
                  <span className="text-xs font-black text-slate-700">
                    {r.bookedSeats || 30} / {r.totalSeats || 40} Seats
                  </span>
                </div>
                <p className="text-xs font-bold text-slate-800 truncate">{r.name}</p>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-[#40A047] h-full rounded-full"
                    style={{ width: `${((r.bookedSeats || 30) / (r.totalSeats || 40)) * 100}%` }}
                  />
                </div>
                <div className="flex justify-between items-center text-[10px] font-bold text-slate-500">
                  <span>{(r.totalSeats || 40) - (r.bookedSeats || 30)} Seats Available</span>
                  <button
                    onClick={() => navigate('/student/book-seat')}
                    className="text-emerald-700 font-extrabold hover:underline"
                  >
                    Book Seat ➔
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  )
}
