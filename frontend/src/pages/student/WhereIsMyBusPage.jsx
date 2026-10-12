import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import {
  Search, ArrowRightLeft, Bus, MapPin, Clock, Star, X, 
  ChevronRight, ChevronDown, ArrowRight, AlertCircle, Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../api/axios.js';

function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

export default function WhereIsMyBusPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const appStatus = String(user?.applicationStatus || 'NOT_SUBMITTED').toUpperCase();
  const isApproved = Boolean(user?.isApplicationApproved ?? (user?.transportFeePaid || appStatus === 'APPROVED'));

  useEffect(() => {
    if (user?.role === 'STUDENT' && !isApproved) {
      if (appStatus === 'NOT_SUBMITTED') {
        navigate('/student/apply', { replace: true });
      } else {
        navigate('/student/application-status', { replace: true });
      }
    }
  }, [user, isApproved, appStatus, navigate]);

  const [fromQuery, setFromQuery] = useState('');
  const [toQuery, setToQuery] = useState('');
  const [fromStop, setFromStop] = useState(null);
  const [toStop, setToStop] = useState(null);

  const [fromSuggestions, setFromSuggestions] = useState([]);
  const [toSuggestions, setToSuggestions] = useState([]);
  const [showFromDropdown, setShowFromDropdown] = useState(false);
  const [showToDropdown, setShowToDropdown] = useState(false);
  const [loadingFrom, setLoadingFrom] = useState(false);
  const [loadingTo, setLoadingTo] = useState(false);
  const [fromError, setFromError] = useState(null);
  const [toError, setToError] = useState(null);

  const [busSearchQuery, setBusSearchQuery] = useState('');
  const [busSearchResults, setBusSearchResults] = useState([]);
  const [showBusDropdown, setShowBusDropdown] = useState(false);
  const [loadingBus, setLoadingBus] = useState(false);

  const [stopSearchQuery, setStopSearchQuery] = useState('');
  const [stopSearchResults, setStopSearchResults] = useState([]);
  const [showStopSearchDropdown, setShowStopSearchDropdown] = useState(false);
  const [loadingStopSearch, setLoadingStopSearch] = useState(false);

  const [popularRoutes, setPopularRoutes] = useState([]);
  const [error, setError] = useState(null);

  const [searchHistory, setSearchHistory] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('hitam_bus_search_history') || '[]');
    } catch (_) {
      return [];
    }
  });

  const debouncedFrom = useDebounce(fromQuery, 200);
  const debouncedTo = useDebounce(toQuery, 200);
  const debouncedBus = useDebounce(busSearchQuery, 200);
  const debouncedStopSearch = useDebounce(stopSearchQuery, 200);

  const fromRef = useRef(null);
  const toRef = useRef(null);
  const busSearchRef = useRef(null);
  const stopSearchRef = useRef(null);

  // Close dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (fromRef.current && !fromRef.current.contains(e.target)) setShowFromDropdown(false);
      if (toRef.current && !toRef.current.contains(e.target)) setShowToDropdown(false);
      if (busSearchRef.current && !busSearchRef.current.contains(e.target)) setShowBusDropdown(false);
      if (stopSearchRef.current && !stopSearchRef.current.contains(e.target)) setShowStopSearchDropdown(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch dynamic popular routes from PostgreSQL on mount
  useEffect(() => {
    api.get('/wimb/routes/popular')
      .then((res) => {
        if (Array.isArray(res.data) && res.data.length > 0) {
          setPopularRoutes(res.data);
        } else {
          setPopularRoutes([
            { from: 'Sangareddy', to: 'HITAM College', route: 'R12', routeId: '12' },
            { from: 'Suchitra', to: 'HITAM College', route: 'R15', routeId: '15' },
            { from: 'KPHB', to: 'HITAM College', route: 'R5', routeId: '5' },
            { from: 'ECIL', to: 'HITAM College', route: 'R18', routeId: '18' },
            { from: 'Miyapur', to: 'HITAM College', route: 'R7', routeId: '7' },
            { from: 'Gachibowli', to: 'HITAM College', route: 'R20', routeId: '20' },
          ]);
        }
      })
      .catch(() => {
        setPopularRoutes([
          { from: 'Sangareddy', to: 'HITAM College', route: 'R12', routeId: '12' },
          { from: 'Suchitra', to: 'HITAM College', route: 'R15', routeId: '15' },
          { from: 'KPHB', to: 'HITAM College', route: 'R5', routeId: '5' },
          { from: 'ECIL', to: 'HITAM College', route: 'R18', routeId: '18' },
          { from: 'Miyapur', to: 'HITAM College', route: 'R7', routeId: '7' },
          { from: 'Gachibowli', to: 'HITAM College', route: 'R20', routeId: '20' },
        ]);
      });
  }, []);

  // Search origin stops in PostgreSQL
  useEffect(() => {
    const trimmed = debouncedFrom.trim();
    if (trimmed.length >= 1 && (!fromStop || fromStop.name !== trimmed)) {
      setLoadingFrom(true);
      setFromError(null);
      api.get(`/wimb/stops/search?q=${encodeURIComponent(trimmed)}`)
        .then((res) => {
          setFromSuggestions(Array.isArray(res.data) ? res.data : []);
        })
        .catch((err) => {
          console.error('Stop search failed:', err);
          setFromError('Failed to search stops. Click to retry.');
          setFromSuggestions([]);
        })
        .finally(() => setLoadingFrom(false));
    } else {
      setFromSuggestions([]);
      setLoadingFrom(false);
    }
  }, [debouncedFrom, fromStop]);

  // Search destination stops in PostgreSQL
  useEffect(() => {
    const trimmed = debouncedTo.trim();
    if (trimmed.length >= 1 && (!toStop || toStop.name !== trimmed)) {
      setLoadingTo(true);
      setToError(null);
      api.get(`/wimb/stops/search?q=${encodeURIComponent(trimmed)}`)
        .then((res) => {
          setToSuggestions(Array.isArray(res.data) ? res.data : []);
        })
        .catch((err) => {
          console.error('Destination search failed:', err);
          setToError('Failed to search stops. Click to retry.');
          setToSuggestions([]);
        })
        .finally(() => setLoadingTo(false));
    } else {
      setToSuggestions([]);
      setLoadingTo(false);
    }
  }, [debouncedTo, toStop]);

  // Bus / route search
  useEffect(() => {
    const trimmed = debouncedBus.trim();
    if (trimmed.length >= 1) {
      setLoadingBus(true);
      api.get(`/wimb/buses/search?q=${encodeURIComponent(trimmed)}`)
        .then((res) => setBusSearchResults(Array.isArray(res.data) ? res.data : []))
        .catch(() => setBusSearchResults([]))
        .finally(() => setLoadingBus(false));
    } else {
      setBusSearchResults([]);
      setLoadingBus(false);
    }
  }, [debouncedBus]);

  // Live stop position search
  useEffect(() => {
    const trimmed = debouncedStopSearch.trim();
    if (trimmed.length >= 1) {
      setLoadingStopSearch(true);
      api.get(`/wimb/stops/search?q=${encodeURIComponent(trimmed)}`)
        .then((res) => setStopSearchResults(Array.isArray(res.data) ? res.data : []))
        .catch(() => setStopSearchResults([]))
        .finally(() => setLoadingStopSearch(false));
    } else {
      setStopSearchResults([]);
      setLoadingStopSearch(false);
    }
  }, [debouncedStopSearch]);

  const handleSwap = () => {
    setError(null);
    const tempQ = fromQuery;
    const tempS = fromStop;
    setFromQuery(toQuery);
    setFromStop(toStop);
    setToQuery(tempQ);
    setToStop(tempS);
  };

  const handleFindBuses = () => {
    setError(null);

    // Resolve from input if user typed without clicking
    let effectiveFrom = fromStop;
    if (!effectiveFrom && fromQuery.trim()) {
      if (fromSuggestions.length > 0) {
        effectiveFrom = fromSuggestions[0];
        setFromStop(effectiveFrom);
      } else {
        effectiveFrom = { id: null, name: fromQuery.trim() };
      }
    }

    let effectiveTo = toStop;
    if (!effectiveTo && toQuery.trim()) {
      if (toSuggestions.length > 0) {
        effectiveTo = toSuggestions[0];
        setToStop(effectiveTo);
      } else {
        effectiveTo = { id: null, name: toQuery.trim() };
      }
    }

    if (!effectiveFrom || !effectiveTo || !effectiveFrom.name || !effectiveTo.name) {
      setError('Please select both Origin (FROM) and Destination (TO) stops to search.');
      return;
    }

    // Origin and destination cannot be identical
    if (
      (effectiveFrom.id && effectiveTo.id && effectiveFrom.id === effectiveTo.id) ||
      effectiveFrom.name.trim().toLowerCase() === effectiveTo.name.trim().toLowerCase()
    ) {
      setError('Origin and destination stops cannot be the same. Please choose distinct stops.');
      return;
    }

    // Record in search history
    const historyItem = {
      from: effectiveFrom.name,
      to: effectiveTo.name,
      fromId: effectiveFrom.id || null,
      toId: effectiveTo.id || null,
    };
    const newHistory = [
      historyItem,
      ...searchHistory.filter((h) => h.from !== effectiveFrom.name || h.to !== effectiveTo.name),
    ].slice(0, 5);
    setSearchHistory(newHistory);
    try {
      localStorage.setItem('hitam_bus_search_history', JSON.stringify(newHistory));
    } catch (_) {}

    // Navigate with consistent parameter contract
    const params = new URLSearchParams();
    if (effectiveFrom.id) params.set('fromStopId', effectiveFrom.id);
    if (effectiveTo.id) params.set('toStopId', effectiveTo.id);
    params.set('fromName', effectiveFrom.name);
    params.set('toName', effectiveTo.name);

    navigate(`/student/bus-results?${params.toString()}`);
  };

  const handleSelectBus = (bus) => {
    navigate(`/student/bus-results?busId=${bus.id}&busNumber=${encodeURIComponent(bus.busNumber)}&route=${bus.routeId}`);
  };

  const handleSelectStopSearch = (stop) => {
    const params = new URLSearchParams();
    if (stop.id) params.set('stopId', stop.id);
    params.set('stopName', stop.name);
    navigate(`/student/bus-results?${params.toString()}`);
  };

  const handleSelectPopularRoute = (route) => {
    setError(null);
    setFromQuery(route.from);
    setToQuery(route.to);
    setFromStop({ id: route.fromStopId || null, name: route.from });
    setToStop({ id: route.toStopId || null, name: route.to });

    const params = new URLSearchParams();
    if (route.fromStopId) params.set('fromStopId', route.fromStopId);
    if (route.toStopId) params.set('toStopId', route.toStopId);
    params.set('fromName', route.from);
    params.set('toName', route.to);

    navigate(`/student/bus-results?${params.toString()}`);
  };

  const clearHistory = () => {
    setSearchHistory([]);
    try {
      localStorage.removeItem('hitam_bus_search_history');
    } catch (_) {}
  };

  return (
    <div className="min-h-screen bg-[#f4f7f6]">
      <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
        {/* Main Search Card */}
        <div className="bg-white rounded-2xl md:rounded-3xl shadow-sm overflow-visible">
          {/* Hero Banner Area */}
          <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-green-900 rounded-t-2xl md:rounded-t-3xl p-6 sm:p-8 md:p-12 relative overflow-hidden flex items-center shadow-inner">
            <div className="relative z-10 w-full">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 mb-2 md:mb-3">
                <div className="p-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-lg">
                  <Bus className="w-8 h-8 sm:w-10 sm:h-10 text-green-400" />
                </div>
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight flex items-center flex-wrap gap-3">
                  Find My Bus
                  <span className="text-[10px] md:text-xs align-middle bg-green-500/20 text-green-300 border border-green-500/30 px-3 py-1.5 rounded-full uppercase tracking-widest font-bold backdrop-blur-sm">
                    Live Route Search
                  </span>
                </h1>
              </div>
              <p className="text-gray-300 font-medium text-sm sm:text-base md:text-lg sm:ml-[4.5rem] md:ml-[5.5rem]">
                Search college routes across 23 corridors in Greater Hyderabad.
              </p>
            </div>
          </div>

          <div className="p-4 sm:p-6 md:p-8">
            {/* FROM and TO Search row */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2 md:gap-4 relative">
              {/* FROM STOP */}
              <div className="flex-1 w-full relative" ref={fromRef}>
                <label className="text-[10px] md:text-xs font-bold text-gray-500 mb-1.5 md:mb-2 block uppercase tracking-wide">
                  FROM STOP (BOARDING POINT)
                </label>
                <div className="relative flex items-center bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl md:rounded-2xl p-2.5 md:p-3 focus-within:bg-white focus-within:border-green-500 focus-within:ring-4 focus-within:ring-green-500/10 transition-all duration-300 shadow-sm">
                  <MapPin className="w-4 h-4 md:w-5 md:h-5 text-green-600 mr-2 md:mr-3 shrink-0" />
                  <input
                    type="text"
                    placeholder="e.g. Sangareddy, KPHB, JNTU, Miyapur..."
                    className="bg-transparent outline-none w-full text-gray-800 font-semibold text-sm md:text-base placeholder-gray-400"
                    value={fromQuery}
                    onChange={(e) => {
                      setFromQuery(e.target.value);
                      setFromStop(null);
                      setShowFromDropdown(true);
                      setError(null);
                    }}
                    onFocus={() => setShowFromDropdown(true)}
                  />
                  <div className="flex items-center gap-2 shrink-0">
                    {loadingFrom && <Loader2 className="w-4 h-4 text-green-600 animate-spin" />}
                    {fromQuery && (
                      <button
                        onClick={() => {
                          setFromQuery('');
                          setFromStop(null);
                          setFromSuggestions([]);
                        }}
                        className="p-1 hover:bg-gray-100 rounded-full text-gray-400"
                      >
                        <X className="w-3 h-3 md:w-4 md:h-4" />
                      </button>
                    )}
                    <div className="w-px h-4 md:h-5 bg-gray-200" />
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  </div>
                </div>

                {/* FROM Suggestions Dropdown */}
                <AnimatePresence>
                  {showFromDropdown && debouncedFrom.trim().length >= 1 && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      className="absolute top-full left-0 right-0 md:w-[130%] mt-1 bg-white border border-gray-100 rounded-xl shadow-2xl z-50 max-h-64 overflow-y-auto"
                    >
                      {loadingFrom ? (
                        <div className="p-3.5 text-xs text-gray-500 flex items-center gap-2">
                          <Loader2 className="w-4 h-4 text-green-600 animate-spin" />
                          <span>Searching stops in database...</span>
                        </div>
                      ) : fromError ? (
                        <div className="p-3.5 text-xs text-red-600 flex items-center justify-between">
                          <span>{fromError}</span>
                          <button
                            onClick={() => setFromQuery(fromQuery + ' ')}
                            className="font-bold underline text-green-700"
                          >
                            Retry
                          </button>
                        </div>
                      ) : fromSuggestions.length === 0 ? (
                        <div className="p-4 text-xs text-gray-500 text-center">
                          <p className="font-semibold text-gray-700">No matching stops found</p>
                          <p className="text-[11px] text-gray-400 mt-0.5">Try a landmark or route point</p>
                        </div>
                      ) : (
                        fromSuggestions.map((stop) => (
                          <div
                            key={stop.id || stop.name}
                            onClick={() => {
                              setFromStop(stop);
                              setFromQuery(stop.name);
                              setShowFromDropdown(false);
                            }}
                            className="p-3 hover:bg-green-50 cursor-pointer border-b border-gray-50 flex items-center justify-between transition-colors"
                          >
                            <div className="flex flex-col">
                              <span className="font-bold text-gray-800 text-sm">{stop.name}</span>
                              {stop.routes && stop.routes.length > 0 && (
                                <span className="text-[11px] text-gray-500">
                                  Served by Route {stop.routes.slice(0, 3).join(', ')}
                                  {stop.routes.length > 3 ? ` +${stop.routes.length - 3} more` : ''}
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded-md border border-green-200">
                              Select
                            </span>
                          </div>
                        ))
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* SWAP BUTTON */}
              <div className="shrink-0 flex items-center justify-center my-1 md:my-0 md:mt-6 relative z-10">
                <button
                  type="button"
                  onClick={handleSwap}
                  className="bg-[#f0f9f3] border border-green-200 shadow-sm p-2 md:p-3 rounded-full hover:bg-green-100 active:scale-95 transition text-[#2f8836]"
                  title="Swap From and To stops"
                >
                  <ArrowRightLeft className="w-4 h-4 md:w-5 md:h-5 rotate-90 md:rotate-0" />
                </button>
              </div>

              {/* TO STOP */}
              <div className="flex-1 w-full relative" ref={toRef}>
                <label className="text-[10px] md:text-xs font-bold text-gray-500 mb-1.5 md:mb-2 block uppercase tracking-wide">
                  TO STOP (DESTINATION)
                </label>
                <div className="relative flex items-center bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl md:rounded-2xl p-2.5 md:p-3 focus-within:bg-white focus-within:border-green-500 focus-within:ring-4 focus-within:ring-green-500/10 transition-all duration-300 shadow-sm">
                  <MapPin className="w-4 h-4 md:w-5 md:h-5 text-green-600 mr-2 md:mr-3 shrink-0" />
                  <input
                    type="text"
                    placeholder="e.g. HITAM College, Campus Gate..."
                    className="bg-transparent outline-none w-full text-gray-800 font-semibold text-sm md:text-base placeholder-gray-400"
                    value={toQuery}
                    onChange={(e) => {
                      setToQuery(e.target.value);
                      setToStop(null);
                      setShowToDropdown(true);
                      setError(null);
                    }}
                    onFocus={() => setShowToDropdown(true)}
                  />
                  <div className="flex items-center gap-2 shrink-0">
                    {loadingTo && <Loader2 className="w-4 h-4 text-green-600 animate-spin" />}
                    {toQuery && (
                      <button
                        onClick={() => {
                          setToQuery('');
                          setToStop(null);
                          setToSuggestions([]);
                        }}
                        className="p-1 hover:bg-gray-100 rounded-full text-gray-400"
                      >
                        <X className="w-3 h-3 md:w-4 md:h-4" />
                      </button>
                    )}
                    <div className="w-px h-4 md:h-5 bg-gray-200" />
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  </div>
                </div>

                {/* TO Suggestions Dropdown */}
                <AnimatePresence>
                  {showToDropdown && debouncedTo.trim().length >= 1 && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      className="absolute top-full right-0 left-0 md:left-auto md:w-[130%] mt-1 bg-white border border-gray-100 rounded-xl shadow-2xl z-50 max-h-64 overflow-y-auto"
                    >
                      {loadingTo ? (
                        <div className="p-3.5 text-xs text-gray-500 flex items-center gap-2">
                          <Loader2 className="w-4 h-4 text-green-600 animate-spin" />
                          <span>Searching destinations in database...</span>
                        </div>
                      ) : toError ? (
                        <div className="p-3.5 text-xs text-red-600 flex items-center justify-between">
                          <span>{toError}</span>
                          <button
                            onClick={() => setToQuery(toQuery + ' ')}
                            className="font-bold underline text-green-700"
                          >
                            Retry
                          </button>
                        </div>
                      ) : toSuggestions.length === 0 ? (
                        <div className="p-4 text-xs text-gray-500 text-center">
                          <p className="font-semibold text-gray-700">No matching destinations found</p>
                          <p className="text-[11px] text-gray-400 mt-0.5">Try searching "HITAM College"</p>
                        </div>
                      ) : (
                        toSuggestions.map((stop) => (
                          <div
                            key={stop.id || stop.name}
                            onClick={() => {
                              setToStop(stop);
                              setToQuery(stop.name);
                              setShowToDropdown(false);
                            }}
                            className="p-3 hover:bg-green-50 cursor-pointer border-b border-gray-50 flex items-center justify-between transition-colors"
                          >
                            <div className="flex flex-col">
                              <span className="font-bold text-gray-800 text-sm">{stop.name}</span>
                              {stop.routes && stop.routes.length > 0 && (
                                <span className="text-[11px] text-gray-500">
                                  Served by Route {stop.routes.slice(0, 3).join(', ')}
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded-md border border-green-200">
                              Select
                            </span>
                          </div>
                        ))
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {error && (
              <div className="text-red-600 text-xs md:text-sm mt-3 font-semibold flex items-center gap-2 bg-red-50 p-3 rounded-xl border border-red-200">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{error}</span>
              </div>
            )}

            {/* FIND BUSES BUTTON */}
            <button
              onClick={handleFindBuses}
              className="w-full bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white font-black py-4 md:py-4.5 rounded-xl md:rounded-2xl shadow-lg hover:shadow-green-500/25 transition-all active:scale-[0.98] flex items-center justify-center gap-3 mt-6 text-base md:text-lg tracking-wide group"
            >
              <Search className="w-5 h-5 md:w-6 md:h-6 group-hover:scale-110 transition-transform" />
              <span>SEARCH BUSES ON THIS ROUTE</span>
              <ArrowRight className="w-5 h-5 md:w-6 md:h-6 ml-1 group-hover:translate-x-1 transition-transform" />
            </button>

            {/* OR DIVIDER */}
            <div className="flex items-center gap-3 md:gap-4 my-6 md:my-8">
              <div className="h-px bg-gray-200 flex-1" />
              <span className="text-xs md:text-sm font-bold text-gray-400 uppercase tracking-wider">OR</span>
              <div className="h-px bg-gray-200 flex-1" />
            </div>

            {/* QUICK SEARCH GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mt-4">
              {/* LIVE BUS STOP SEARCH */}
              <div className="relative w-full" ref={stopSearchRef}>
                <label className="text-[10px] md:text-xs font-bold text-gray-500 mb-1.5 md:mb-2 block uppercase tracking-wide">
                  FIND BUSES BY STOP
                </label>
                <div className="flex items-center bg-white border border-gray-300 rounded-xl md:rounded-2xl p-2.5 md:p-3 focus-within:border-[#2f8836] focus-within:ring-2 focus-within:ring-green-500/10 transition">
                  <MapPin className="w-4 h-4 md:w-5 md:h-5 text-gray-400 mr-2 md:mr-3 shrink-0" />
                  <input
                    type="text"
                    placeholder="e.g. JNTU, KPHB, Sangareddy..."
                    className="bg-transparent outline-none w-full font-medium text-gray-800 placeholder-gray-400 text-sm md:text-base"
                    value={stopSearchQuery}
                    onChange={(e) => {
                      setStopSearchQuery(e.target.value);
                      setShowStopSearchDropdown(true);
                    }}
                    onFocus={() => setShowStopSearchDropdown(true)}
                  />
                  {loadingStopSearch && <Loader2 className="w-4 h-4 text-green-600 animate-spin" />}
                </div>

                <AnimatePresence>
                  {showStopSearchDropdown && debouncedStopSearch.trim().length >= 1 && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-100 rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto"
                    >
                      {loadingStopSearch ? (
                        <div className="p-3 text-xs text-gray-500 flex items-center gap-2">
                          <Loader2 className="w-4 h-4 text-green-600 animate-spin" />
                          <span>Searching stops in PostgreSQL...</span>
                        </div>
                      ) : stopSearchResults.length === 0 ? (
                        <div className="p-3 text-xs text-gray-400 text-center">No matching stops found</div>
                      ) : (
                        stopSearchResults.map((stop) => (
                          <div
                            key={stop.id || stop.name}
                            onClick={() => {
                              setStopSearchQuery('');
                              setShowStopSearchDropdown(false);
                              handleSelectStopSearch(stop);
                            }}
                            className="p-3 md:p-4 hover:bg-green-50 cursor-pointer border-b border-gray-50 flex items-center gap-3 md:gap-4 transition-colors"
                          >
                            <div className="bg-green-100 p-2 rounded-lg shrink-0">
                              <MapPin className="w-4 h-4 md:w-5 md:h-5 text-[#2f8836]" />
                            </div>
                            <div className="flex flex-col">
                              <span className="font-bold text-gray-800 text-sm md:text-base">{stop.name}</span>
                              <span className="text-xs text-gray-500 font-medium">View buses passing through this stop</span>
                            </div>
                          </div>
                        ))
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* BUS ROUTE SEARCH */}
              <div className="relative w-full" ref={busSearchRef}>
                <label className="text-[10px] md:text-xs font-bold text-gray-500 mb-1.5 md:mb-2 block uppercase tracking-wide">
                  BUS NO. OR ROUTE NO.
                </label>
                <div className="flex items-center bg-white border border-gray-300 rounded-xl md:rounded-2xl p-2.5 md:p-3 focus-within:border-[#2f8836] focus-within:ring-2 focus-within:ring-green-500/10 transition">
                  <Bus className="w-4 h-4 md:w-5 md:h-5 text-gray-400 mr-2 md:mr-3 shrink-0" />
                  <input
                    type="text"
                    placeholder="e.g. 12, Route 12, TS 09 UB 1212..."
                    className="bg-transparent outline-none w-full font-medium text-gray-800 placeholder-gray-400 text-sm md:text-base"
                    value={busSearchQuery}
                    onChange={(e) => {
                      setBusSearchQuery(e.target.value);
                      setShowBusDropdown(true);
                    }}
                    onFocus={() => setShowBusDropdown(true)}
                  />
                  {loadingBus && <Loader2 className="w-4 h-4 text-green-600 animate-spin" />}
                </div>

                <AnimatePresence>
                  {showBusDropdown && debouncedBus.trim().length >= 1 && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-100 rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto"
                    >
                      {loadingBus ? (
                        <div className="p-3 text-xs text-gray-500 flex items-center gap-2">
                          <Loader2 className="w-4 h-4 text-green-600 animate-spin" />
                          <span>Searching buses...</span>
                        </div>
                      ) : busSearchResults.length === 0 ? (
                        <div className="p-3 text-xs text-gray-400 text-center">No matching buses found</div>
                      ) : (
                        busSearchResults.map((bus) => (
                          <div
                            key={bus.id}
                            onClick={() => {
                              setBusSearchQuery('');
                              setShowBusDropdown(false);
                              handleSelectBus(bus);
                            }}
                            className="p-3 md:p-4 hover:bg-green-50 cursor-pointer border-b border-gray-50 flex items-center gap-3 md:gap-4 transition-colors"
                          >
                            <div className="bg-green-100 p-2 rounded-lg shrink-0">
                              <Bus className="w-4 h-4 md:w-5 md:h-5 text-[#2f8836]" />
                            </div>
                            <div className="flex flex-col">
                              <span className="font-bold text-gray-800 text-sm md:text-base">{bus.busNumber}</span>
                              <span className="text-xs text-gray-500 font-medium">
                                Route {bus.routeId} • {bus.routeName}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM CARDS ROW */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 pb-8 md:pb-12">
          {/* RECENT SEARCHES */}
          <div className="bg-white p-5 md:p-6 rounded-2xl md:rounded-3xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4 md:mb-6">
              <div className="flex items-center gap-2">
                <div className="bg-green-700 text-white rounded-full p-1.5">
                  <Clock className="w-3 h-3 md:w-4 md:h-4" />
                </div>
                <h2 className="font-bold text-gray-900 text-base md:text-lg">Recent Searches</h2>
              </div>
              {searchHistory.length > 0 && (
                <button
                  type="button"
                  onClick={clearHistory}
                  className="text-green-700 font-bold text-xs md:text-sm hover:underline"
                >
                  Clear All
                </button>
              )}
            </div>

            <div className="space-y-1">
              {searchHistory.length === 0 ? (
                <div className="text-gray-400 text-xs md:text-sm py-4 text-center">No recent searches.</div>
              ) : (
                searchHistory.map((h, i) => (
                  <div
                    key={i}
                    onClick={() => {
                      setFromQuery(h.from);
                      setToQuery(h.to);
                      setFromStop({ id: h.fromId || null, name: h.from });
                      setToStop({ id: h.toId || null, name: h.to });
                      setError(null);
                    }}
                    className="group flex items-center justify-between py-3 md:py-3.5 border-b border-gray-50 cursor-pointer hover:bg-gray-50 px-2 rounded-lg transition-colors"
                  >
                    <div className="flex items-center gap-2 md:gap-3 overflow-hidden">
                      <Clock className="w-4 h-4 text-gray-400 shrink-0" />
                      <span className="text-xs md:text-sm font-medium text-gray-700 truncate">
                        {h.from} <span className="text-gray-300 mx-1">→</span> {h.to}
                      </span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-green-600 transition shrink-0 ml-2" />
                  </div>
                ))
              )}
            </div>
          </div>

          {/* POPULAR ROUTES */}
          <div className="bg-white p-5 md:p-6 rounded-2xl md:rounded-3xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4 md:mb-6">
              <div className="flex items-center gap-2">
                <div className="text-yellow-500">
                  <Star className="w-5 h-5 md:w-6 md:h-6 fill-current" />
                </div>
                <h2 className="font-bold text-gray-900 text-base md:text-lg">College Corridors</h2>
              </div>
              <span className="text-xs font-semibold text-gray-400">Direct Routes</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3">
              {popularRoutes.slice(0, 6).map((r, i) => (
                <div
                  key={r.route || i}
                  onClick={() => handleSelectPopularRoute(r)}
                  className="border border-gray-100 rounded-xl p-3 md:p-3.5 flex items-center justify-between cursor-pointer hover:border-green-300 hover:shadow-sm transition-all group"
                >
                  <div className="flex items-center gap-1.5 text-[11px] md:text-xs font-bold text-gray-700 truncate">
                    <span className="group-hover:text-green-700 transition truncate">{r.from}</span>
                    <span className="text-gray-300 shrink-0">→</span>
                    <span className="group-hover:text-green-700 transition truncate">{r.to}</span>
                  </div>
                  <div className="bg-[#e6f5ea] text-[#2f8836] text-[10px] font-black px-2 py-1 rounded-md shrink-0 ml-2">
                    {r.route || `R${r.routeId}`}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
