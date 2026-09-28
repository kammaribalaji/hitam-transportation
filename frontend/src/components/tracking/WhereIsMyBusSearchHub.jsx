import React, { useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
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
} from 'lucide-react'

const HITAM_CAMPUS_NAME = 'HITAM College Campus'

export default function WhereIsMyBusSearchHub({
  routes = [],
  allLiveLocations = [],
  onSelectRoute,
  userBoardingPoint,
}) {
  const [fromQuery, setFromQuery] = useState(userBoardingPoint || '')
  const [toQuery, setToQuery] = useState(HITAM_CAMPUS_NAME)
  const [busQuery, setBusQuery] = useState('')
  const [activeTab, setActiveTab] = useState('ALL') // 'ALL' | 'MORNING' | 'RETURN' | 'METRO'
  const [expandedRouteId, setExpandedRouteId] = useState(null)
  const [showFromSuggestions, setShowFromSuggestions] = useState(false)
  const [showToSuggestions, setShowToSuggestions] = useState(false)
  const [searchHistory, setSearchHistory] = useState(() => {
    try {
      const saved = localStorage.getItem('hitam_bus_search_history')
      return saved ? JSON.parse(saved) : [
        { from: 'Temple Bus Stop', to: HITAM_CAMPUS_NAME, routeId: '15' },
        { from: 'Sangareddy Old Bus Stand', to: HITAM_CAMPUS_NAME, routeId: '12' },
        { from: 'LB Nagar Metro', to: HITAM_CAMPUS_NAME, routeId: '1' },
        { from: 'Kukatpally', to: HITAM_CAMPUS_NAME, routeId: '2' },
      ]
    } catch {
      return []
    }
  })

  // Collect all unique stop names across all routes
  const allUniqueStops = useMemo(() => {
    const set = new Set([HITAM_CAMPUS_NAME])
    for (const r of routes) {
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
  }, [routes])

  const filteredFromSuggestions = useMemo(() => {
    if (!fromQuery.trim()) return allUniqueStops.slice(0, 8)
    const q = fromQuery.toLowerCase().trim()
    return allUniqueStops.filter(s => s.toLowerCase().includes(q)).slice(0, 8)
  }, [allUniqueStops, fromQuery])

  const filteredToSuggestions = useMemo(() => {
    if (!toQuery.trim()) return allUniqueStops.slice(0, 8)
    const q = toQuery.toLowerCase().trim()
    return allUniqueStops.filter(s => s.toLowerCase().includes(q)).slice(0, 8)
  }, [allUniqueStops, toQuery])

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
    const updated = [newEntry, ...searchHistory.filter(h => !(h.from === from && h.to === to))].slice(0, 6)
    setSearchHistory(updated)
    try {
      localStorage.setItem('hitam_bus_search_history', JSON.stringify(updated))
    } catch {}
  }

  // Matching Buses Algorithm
  const matchingBuses = useMemo(() => {
    const cleanFrom = fromQuery.trim().toLowerCase()
    const cleanTo = toQuery.trim().toLowerCase()
    const cleanBus = busQuery.trim().toLowerCase()

    return routes
      .map(r => {
        const routeId = String(r.id)
        const busNum = r.busNumber || `TS 09 UB ${1200 + parseInt(routeId || 1)}`
        const routeName = r.name || `Route ${routeId}`
        const rawStops = Array.isArray(r.stops) 
          ? r.stops.map(s => typeof s === 'string' ? s : s?.name).filter(Boolean)
          : []
        
        // Ensure starting point and campus end point are in stop list
        const fullStops = [
          r.startPoint || rawStops[0] || 'Origin',
          ...rawStops.filter(s => s !== r.startPoint && s !== HITAM_CAMPUS_NAME),
          HITAM_CAMPUS_NAME,
        ]

        // Check if matching busQuery
        if (cleanBus) {
          const matchBus = busNum.toLowerCase().includes(cleanBus) ||
            routeName.toLowerCase().includes(cleanBus) ||
            routeId === cleanBus ||
            fullStops.some(s => s.toLowerCase().includes(cleanBus))
          if (!matchBus) return null
        }

        // Check category filter
        if (activeTab === 'METRO') {
          const isMetro = fullStops.some(s => s.toLowerCase().includes('metro') || s.toLowerCase().includes('station'))
          if (!isMetro) return null
        }

        // Check From -> To stop match
        let fromStopIndex = -1
        let toStopIndex = -1

        if (cleanFrom) {
          fromStopIndex = fullStops.findIndex(s => s.toLowerCase().includes(cleanFrom) || cleanFrom.includes(s.toLowerCase()))
        }
        if (cleanTo) {
          toStopIndex = fullStops.findIndex(s => s.toLowerCase().includes(cleanTo) || cleanTo.includes(s.toLowerCase()))
        }

        // If both From and To specified, ensure route services both
        if (cleanFrom && cleanTo) {
          if (fromStopIndex === -1 || toStopIndex === -1) return null
        } else if (cleanFrom && fromStopIndex === -1) {
          return null
        } else if (cleanTo && toStopIndex === -1) {
          return null
        }

        // Calculate departure & arrival timings
        const reportingTime = r.reportingTime || '07:15 AM'
        const liveLoc = liveLocationMap.get(routeId)
        const isOnline = liveLoc && (liveLoc.status === 'online' || liveLoc.status === 'LIVE' || (liveLoc.speed && liveLoc.speed > 0)) && !liveLoc.isStale

        return {
          id: routeId,
          busNumber: busNum,
          name: routeName,
          startPoint: r.startPoint || fullStops[0],
          endPoint: r.endPoint || HITAM_CAMPUS_NAME,
          stops: fullStops,
          stopsCount: fullStops.length,
          reportingTime,
          feeAmount: r.feeAmount || 42900,
          totalSeats: r.totalSeats || 50,
          bookedSeats: r.bookedSeats || 40,
          fromStopIndex: fromStopIndex >= 0 ? fromStopIndex : 0,
          toStopIndex: toStopIndex >= 0 ? toStopIndex : fullStops.length - 1,
          liveLocation: liveLoc,
          isOnline,
          speed: liveLoc?.speed ? Math.round(liveLoc.speed) : (isOnline ? 38 : 0),
        }
      })
      .filter(Boolean)
  }, [routes, fromQuery, toQuery, busQuery, activeTab, liveLocationMap])

  return (
    <div className="w-full space-y-4 font-sans text-slate-800">
      {/* 1. TOP HERO CARD (Where Is My Train Style in HITAM Dark Slate & Emerald Theme) */}
      <div className="bg-gradient-to-b from-[#0F172A] via-[#1E293B] to-[#0F172A] text-white rounded-3xl p-4 sm:p-6 shadow-2xl border border-slate-700/50 relative overflow-hidden">
        {/* Glow ambient accent */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-[#16A34A]/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top Category Tabs */}
        <div className="flex items-center gap-1 sm:gap-2 pb-4 border-b border-slate-700/60 overflow-x-auto scrollbar-none text-xs font-bold">
          <button
            onClick={() => setActiveTab('ALL')}
            className={`px-3.5 py-1.5 rounded-full transition-all shrink-0 ${
              activeTab === 'ALL'
                ? 'bg-[#16A34A] text-white shadow-lg shadow-green-600/30 ring-2 ring-emerald-400'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            All 23 Routes
          </button>
          <button
            onClick={() => {
              setActiveTab('MORNING')
              setToQuery(HITAM_CAMPUS_NAME)
            }}
            className={`px-3.5 py-1.5 rounded-full transition-all shrink-0 ${
              activeTab === 'MORNING'
                ? 'bg-[#16A34A] text-white shadow-lg shadow-green-600/30 ring-2 ring-emerald-400'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            🌅 Morning (To Campus)
          </button>
          <button
            onClick={() => {
              setActiveTab('RETURN')
              setFromQuery(HITAM_CAMPUS_NAME)
            }}
            className={`px-3.5 py-1.5 rounded-full transition-all shrink-0 ${
              activeTab === 'RETURN'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 ring-2 ring-indigo-400'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            🌆 Return (From Campus)
          </button>
          <button
            onClick={() => setActiveTab('METRO')}
            className={`px-3.5 py-1.5 rounded-full transition-all shrink-0 ${
              activeTab === 'METRO'
                ? 'bg-[#16A34A] text-white shadow-lg shadow-green-600/30 ring-2 ring-emerald-400'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            ⚡ Metro Connectors
          </button>
        </div>

        {/* 2. MAIN FROM -> TO DUAL INPUT SEARCH CARD */}
        <div className="mt-4 bg-[#1E293B]/80 backdrop-blur-md rounded-2xl border border-slate-700 p-3 sm:p-4 relative">
          <div className="grid grid-cols-1 gap-3 relative">
            {/* FROM INPUT */}
            <div className="relative">
              <div className="flex items-center gap-3 bg-slate-900/90 border border-slate-700 rounded-xl px-3 py-2.5 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all">
                <span className="w-3.5 h-3.5 rounded-full border-2 border-emerald-400 bg-transparent shrink-0" />
                <div className="flex-1 min-w-0">
                  <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                    From Stop / Station
                  </label>
                  <input
                    type="text"
                    value={fromQuery}
                    onChange={(e) => {
                      setFromQuery(e.target.value)
                      setShowFromSuggestions(true)
                    }}
                    onFocus={() => setShowFromSuggestions(true)}
                    placeholder="Enter boarding point (e.g. KPHB, Temple Bus Stop, Miyapur...)"
                    className="w-full bg-transparent text-sm font-black text-white placeholder:text-slate-500 focus:outline-none truncate"
                  />
                </div>
                {fromQuery && (
                  <button
                    onClick={() => setFromQuery('')}
                    className="p-1 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* From Autocomplete Suggestions */}
              {showFromSuggestions && filteredFromSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden max-h-48 overflow-y-auto">
                  {filteredFromSuggestions.map(s => (
                    <button
                      key={s}
                      onClick={() => {
                        setFromQuery(s)
                        setShowFromSuggestions(false)
                      }}
                      className="w-full text-left px-3.5 py-2 text-xs font-bold text-slate-200 hover:bg-emerald-950/60 hover:text-emerald-300 flex items-center gap-2 border-b border-slate-800/60"
                    >
                      <MapPin size={13} className="text-emerald-400 shrink-0" />
                      <span className="truncate">{s}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* FLOATING SWAP BUTTON */}
            <div className="relative flex items-center justify-center -my-2.5 z-10">
              <button
                onClick={handleSwap}
                className="w-9 h-9 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg flex items-center justify-center border-2 border-[#1E293B] active:scale-95 transition-all"
                title="Swap From and To"
              >
                <ArrowUpDown size={15} />
              </button>
            </div>

            {/* TO INPUT */}
            <div className="relative">
              <div className="flex items-center gap-3 bg-slate-900/90 border border-slate-700 rounded-xl px-3 py-2.5 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all">
                <span className="w-3.5 h-3.5 rounded-full border-2 border-amber-400 bg-amber-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                    To Destination
                  </label>
                  <input
                    type="text"
                    value={toQuery}
                    onChange={(e) => {
                      setToQuery(e.target.value)
                      setShowToSuggestions(true)
                    }}
                    onFocus={() => setShowToSuggestions(true)}
                    placeholder="Enter destination (e.g. HITAM College Campus)"
                    className="w-full bg-transparent text-sm font-black text-white placeholder:text-slate-500 focus:outline-none truncate"
                  />
                </div>
                {toQuery && (
                  <button
                    onClick={() => setToQuery('')}
                    className="p-1 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* To Autocomplete Suggestions */}
              {showToSuggestions && filteredToSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden max-h-48 overflow-y-auto">
                  {filteredToSuggestions.map(s => (
                    <button
                      key={s}
                      onClick={() => {
                        setToQuery(s)
                        setShowToSuggestions(false)
                      }}
                      className="w-full text-left px-3.5 py-2 text-xs font-bold text-slate-200 hover:bg-emerald-950/60 hover:text-emerald-300 flex items-center gap-2 border-b border-slate-800/60"
                    >
                      <MapPin size={13} className="text-amber-400 shrink-0" />
                      <span className="truncate">{s}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* FIND BUSES ACTION BUTTON */}
          <button
            onClick={() => {
              setShowFromSuggestions(false)
              setShowToSuggestions(false)
              if (fromQuery && toQuery) {
                recordSearch(fromQuery, toQuery, matchingBuses[0]?.id || '15')
              }
            }}
            className="w-full mt-3.5 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-green-500 hover:from-emerald-500 hover:to-green-400 text-white font-black text-sm sm:text-base shadow-lg shadow-green-700/30 flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
          >
            <Search size={17} />
            <span>Find Buses ({matchingBuses.length} Available)</span>
          </button>
        </div>

        {/* 3. QUICK SEARCH BY BUS NO. OR ROUTE */}
        <div className="mt-3 flex items-center gap-2 bg-slate-900/80 border border-slate-700 rounded-xl px-3 py-2">
          <Bus size={16} className="text-emerald-400 shrink-0" />
          <input
            type="text"
            value={busQuery}
            onChange={(e) => setBusQuery(e.target.value)}
            placeholder="Search by Bus No (e.g. 1215) or Route (e.g. Route 15)..."
            className="w-full bg-transparent text-xs font-bold text-white placeholder:text-slate-500 focus:outline-none"
          />
          {busQuery && (
            <button onClick={() => setBusQuery('')} className="text-slate-400 hover:text-white">
              <X size={14} />
            </button>
          )}
        </div>

        {/* 4. RECENT SEARCHES / POPULAR CORRIDORS */}
        {searchHistory.length > 0 && (
          <div className="mt-3.5 pt-3 border-t border-slate-800">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1 mb-2">
              <History size={12} />
              Recent Searches & Popular Corridors
            </p>
            <div className="flex flex-wrap gap-1.5">
              {searchHistory.map((h, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setFromQuery(h.from)
                    setToQuery(h.to)
                    if (h.routeId && onSelectRoute) onSelectRoute(h.routeId, 'TIMELINE')
                  }}
                  className="px-2.5 py-1 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-bold border border-slate-700 flex items-center gap-1.5 transition-all"
                >
                  <span className="text-emerald-400 font-extrabold">{h.from}</span>
                  <span className="text-slate-500">➔</span>
                  <span className="text-amber-300">{h.to.split(' ')[0]}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 5. MATCHING BUS RESULTS FEED (Zero Overlap, Card-Based Responsive Grid) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Bus size={15} className="text-emerald-600" />
            Matching Buses on this Corridor ({matchingBuses.length})
          </h2>
          <span className="text-[11px] font-bold text-slate-500">
            {activeTab === 'RETURN' ? 'Evening Return Trips' : 'Morning Scheduled Trips'}
          </span>
        </div>

        {matchingBuses.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-2 shadow-sm">
            <Bus size={32} className="mx-auto text-slate-300" />
            <p className="text-sm font-black text-slate-700">No buses found for this search.</p>
            <p className="text-xs text-slate-400">Try clearing filters or search for another stop.</p>
            <button
              onClick={() => {
                setFromQuery('')
                setToQuery(HITAM_CAMPUS_NAME)
                setBusQuery('')
                setActiveTab('ALL')
              }}
              className="mt-2 px-4 py-1.5 rounded-xl bg-emerald-100 text-emerald-800 font-bold text-xs hover:bg-emerald-200 transition-all"
            >
              Reset Search
            </button>
          </div>
        ) : (
          matchingBuses.map((bus) => {
            const isExpanded = expandedRouteId === bus.id
            const isAssigned = userBoardingPoint && bus.stops.some(s => s.toLowerCase().includes(userBoardingPoint.toLowerCase()))

            return (
              <motion.div
                key={bus.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`bg-white rounded-2xl border transition-all shadow-sm hover:shadow-md overflow-hidden ${
                  isAssigned ? 'border-emerald-400 ring-2 ring-emerald-100' : 'border-slate-200'
                }`}
              >
                {/* CARD HEADER: Bus Plate, Route Badge, Live Status Pill */}
                <div className="p-3.5 sm:p-4 bg-slate-50/70 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0 ${
                      bus.isOnline ? 'bg-[#16A34A] shadow-md shadow-green-600/20' : 'bg-slate-900'
                    }`}>
                      <Bus size={18} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm sm:text-base font-black text-slate-900 truncate">
                          {bus.busNumber}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-[#16A34A] text-[10px] font-black shrink-0">
                          Route {bus.id}
                        </span>
                        {isAssigned && (
                          <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-black flex items-center gap-1 shrink-0">
                            <Sparkles size={10} /> Your Route
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 font-medium truncate mt-0.5">
                        {bus.name.split(' - ')[1] || bus.name}
                      </p>
                    </div>
                  </div>

                  {/* LIVE STATUS PILL */}
                  <div className="flex items-center gap-1.5">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                      bus.isOnline 
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-300 shadow-sm' 
                        : 'bg-slate-100 text-slate-600 border border-slate-300'
                    }`}>
                      <span className={`w-2 h-2 rounded-full ${bus.isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                      {bus.isOnline ? `LIVE • ${bus.speed} km/h` : 'Standby / Offline'}
                    </span>
                  </div>
                </div>

                {/* CARD BODY: Timings, Corridor Flow, Distance */}
                <div className="p-3.5 sm:p-4 space-y-3">
                  <div className="grid grid-cols-12 items-center gap-2">
                    {/* Origin Stop */}
                    <div className="col-span-4 text-left min-w-0">
                      <p className="text-[10px] font-bold text-slate-400 uppercase truncate">Origin / Boarding</p>
                      <p className="text-xs sm:text-sm font-black text-slate-900 truncate mt-0.5">{bus.startPoint}</p>
                      <p className="text-[11px] font-bold text-emerald-700 mt-0.5">{bus.reportingTime}</p>
                    </div>

                    {/* Arrow / Stops Indicator */}
                    <div className="col-span-4 flex flex-col items-center justify-center min-w-0 px-1 text-center">
                      <span className="text-[10px] font-extrabold text-slate-400 truncate">{bus.stopsCount} Stops</span>
                      <div className="w-full flex items-center justify-center my-0.5">
                        <span className="h-0.5 flex-1 bg-emerald-300" />
                        <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0 mx-0.5" />
                        <span className="h-0.5 flex-1 bg-emerald-300" />
                      </div>
                      <span className="text-[10px] font-bold text-slate-500 truncate">Direct Corridor</span>
                    </div>

                    {/* Destination Stop */}
                    <div className="col-span-4 text-right min-w-0">
                      <p className="text-[10px] font-bold text-slate-400 uppercase truncate">Destination Hub</p>
                      <p className="text-xs sm:text-sm font-black text-slate-900 truncate mt-0.5">{bus.endPoint.split(' ')[0] || 'HITAM'}</p>
                      <p className="text-[11px] font-bold text-emerald-700 mt-0.5">08:45 AM</p>
                    </div>
                  </div>

                  {/* ACTION BUTTONS (One-Tap Live Track, View Stops, Book) */}
                  <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                    <button
                      onClick={() => setExpandedRouteId(isExpanded ? null : bus.id)}
                      className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1"
                    >
                      <span>{isExpanded ? 'Hide All Stops' : `View All ${bus.stopsCount} Stops`}</span>
                      <ChevronDown size={14} className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onSelectRoute && onSelectRoute(bus.id, 'TIMELINE')}
                        className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs border border-emerald-200 flex items-center gap-1.5 transition-all"
                      >
                        <Compass size={13} className="text-emerald-600" />
                        <span>Station Timeline</span>
                      </button>

                      <button
                        onClick={() => onSelectRoute && onSelectRoute(bus.id, 'MAP')}
                        className="px-3.5 py-1.5 rounded-xl bg-[#16A34A] hover:bg-emerald-600 text-white font-black text-xs shadow-md shadow-green-600/20 flex items-center gap-1.5 transition-all"
                      >
                        <Navigation size={13} />
                        <span>Live Map</span>
                      </button>
                    </div>
                  </div>

                  {/* EXPANDABLE INLINE STOPS LIST */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="pt-2 border-t border-slate-100 overflow-hidden"
                      >
                        <p className="text-[10px] font-extrabold text-slate-400 uppercase mb-1.5">Route Stops Sequence:</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 bg-slate-50 p-2 rounded-xl text-xs">
                          {bus.stops.map((s, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-slate-700 py-0.5 px-1 truncate">
                              <span className="w-4 h-4 rounded-full bg-emerald-200 text-emerald-900 font-bold text-[9px] flex items-center justify-center shrink-0">
                                {idx + 1}
                              </span>
                              <span className="font-bold truncate">{s}</span>
                            </div>
                          ))}
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
  )
}
