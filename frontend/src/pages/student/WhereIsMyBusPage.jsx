import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../hooks/useAuth.js';
import {
  Search, ArrowUpDown, Bus, MapPin, Clock, History, Navigation, X, 
  ChevronRight, Compass, Users, User, Phone, CheckCircle2, AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true
});

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

  const [fromQuery, setFromQuery] = useState('');
  const [toQuery, setToQuery] = useState('');
  const [fromStop, setFromStop] = useState(null);
  const [toStop, setToStop] = useState(null);
  
  const [fromSuggestions, setFromSuggestions] = useState([]);
  const [toSuggestions, setToSuggestions] = useState([]);
  const [showFromDropdown, setShowFromDropdown] = useState(false);
  const [showToDropdown, setShowToDropdown] = useState(false);
  
  const [busSearchQuery, setBusSearchQuery] = useState('');
  const [busSearchResults, setBusSearchResults] = useState([]);
  const [showBusDropdown, setShowBusDropdown] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const [selectedBus, setSelectedBus] = useState(null);
  const [selectedBusDetails, setSelectedBusDetails] = useState(null);

  const [searchHistory, setSearchHistory] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('hitam_bus_search_history') || '[]');
    } catch { return []; }
  });

  const debouncedFrom = useDebounce(fromQuery, 300);
  const debouncedTo = useDebounce(toQuery, 300);
  const debouncedBus = useDebounce(busSearchQuery, 300);

  const fromRef = useRef(null);
  const toRef = useRef(null);
  const busSearchRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (fromRef.current && !fromRef.current.contains(e.target)) setShowFromDropdown(false);
      if (toRef.current && !toRef.current.contains(e.target)) setShowToDropdown(false);
      if (busSearchRef.current && !busSearchRef.current.contains(e.target)) setShowBusDropdown(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (debouncedFrom.length >= 1 && !fromStop) {
      api.get(/wimb/stops/search?q=)
        .then(res => setFromSuggestions(res.data))
        .catch(console.error);
    } else {
      setFromSuggestions([]);
    }
  }, [debouncedFrom, fromStop]);

  useEffect(() => {
    if (debouncedTo.length >= 1 && !toStop) {
      api.get(/wimb/stops/search?q=)
        .then(res => setToSuggestions(res.data))
        .catch(console.error);
    } else {
      setToSuggestions([]);
    }
  }, [debouncedTo, toStop]);

  useEffect(() => {
    if (debouncedBus.length >= 1) {
      api.get(/wimb/buses/search?q=)
        .then(res => setBusSearchResults(res.data))
        .catch(console.error);
    } else {
      setBusSearchResults([]);
    }
  }, [debouncedBus]);

  const handleSwap = () => {
    const tempQ = fromQuery;
    const tempS = fromStop;
    setFromQuery(toQuery);
    setFromStop(toStop);
    setToQuery(tempQ);
    setToStop(tempS);
  };

  const handleFindBuses = () => {
    if (!fromQuery || !toQuery) {
      setError('Please select both From and To stops.');
      return;
    }
    setError(null);
    const newHistory = [{ from: fromQuery, to: toQuery }, ...searchHistory.filter(h => h.from !== fromQuery || h.to !== toQuery)].slice(0, 5);
    setSearchHistory(newHistory);
    localStorage.setItem('hitam_bus_search_history', JSON.stringify(newHistory));
    navigate(/student/bus-results?from=&to=);
  };

  const handleSelectBus = async (busId) => {
    setIsLoading(true);
    try {
      const res = await api.get(/wimb/buses/);
      setSelectedBusDetails(res.data);
      setSelectedBus(res.data.bus);
    } catch (err) {
      console.error(err);
      setError('Failed to load bus details.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenLiveTracking = (tripId) => {
    navigate(/student/live-tracking?tripId=);
  };

  return (
    <div className="max-w-md mx-auto bg-gray-50 min-h-screen pb-24 relative overflow-hidden">
      <div className="bg-[#40A047] text-white p-4 flex items-center justify-between sticky top-0 z-30 shadow-md">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/student')} className="p-1 hover:bg-white/10 rounded-full transition">
            <ChevronRight className="w-6 h-6 rotate-180" />
          </button>
          <h1 className="text-xl font-bold">Where is My Bus</h1>
        </div>
      </div>

      <div className="p-4 space-y-4 relative z-10">
        
        <div className="bg-white rounded-2xl shadow-sm p-4 relative border border-gray-100">
          
          <div className="relative mb-3" ref={fromRef}>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">FROM STOP</label>
            <div className="flex items-center bg-gray-50 border border-gray-200 rounded-lg p-2 focus-within:border-[#40A047] focus-within:ring-1 focus-within:ring-[#40A047] transition">
              <MapPin className="w-5 h-5 text-gray-400 mr-2" />
              <input 
                type="text"
                placeholder="Search stop..."
                className="bg-transparent outline-none w-full text-gray-800 font-medium"
                value={fromQuery}
                onChange={(e) => {
                  setFromQuery(e.target.value);
                  setFromStop(null);
                  setShowFromDropdown(true);
                }}
                onFocus={() => setShowFromDropdown(true)}
              />
              {fromQuery && (
                <button onClick={() => { setFromQuery(''); setFromStop(null); }}><X className="w-4 h-4 text-gray-400"/></button>
              )}
            </div>
            <AnimatePresence>
              {showFromDropdown && fromSuggestions.length > 0 && (
                <motion.div initial={{opacity:0, y:-5}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-5}} className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-100 rounded-lg shadow-xl z-50 max-h-60 overflow-y-auto">
                  {fromSuggestions.map(stop => (
                    <div key={stop.name} onClick={() => { setFromStop(stop); setFromQuery(stop.name); setShowFromDropdown(false); }} className="p-3 hover:bg-green-50 cursor-pointer border-b border-gray-50 flex flex-col">
                      <span className="font-medium text-gray-800">{stop.name}</span>
                      <span className="text-xs text-gray-500">Serves {stop.routes?.length || 1} route(s)</span>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="absolute right-6 top-[88px] -translate-y-1/2 z-20">
            <button onClick={handleSwap} className="bg-white border border-gray-200 shadow-sm p-2 rounded-full hover:bg-gray-50 active:scale-95 transition">
              <ArrowUpDown className="w-4 h-4 text-[#40A047]" />
            </button>
          </div>

          <div className="relative mb-4 mt-2" ref={toRef}>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">TO STOP</label>
            <div className="flex items-center bg-gray-50 border border-gray-200 rounded-lg p-2 focus-within:border-[#40A047] focus-within:ring-1 focus-within:ring-[#40A047] transition">
              <Navigation className="w-5 h-5 text-gray-400 mr-2" />
              <input 
                type="text"
                placeholder="Search destination..."
                className="bg-transparent outline-none w-full text-gray-800 font-medium"
                value={toQuery}
                onChange={(e) => {
                  setToQuery(e.target.value);
                  setToStop(null);
                  setShowToDropdown(true);
                }}
                onFocus={() => setShowToDropdown(true)}
              />
              {toQuery && (
                <button onClick={() => { setToQuery(''); setToStop(null); }}><X className="w-4 h-4 text-gray-400"/></button>
              )}
            </div>
            <AnimatePresence>
              {showToDropdown && toSuggestions.length > 0 && (
                <motion.div initial={{opacity:0, y:-5}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-5}} className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-100 rounded-lg shadow-xl z-50 max-h-60 overflow-y-auto">
                  {toSuggestions.map(stop => (
                    <div key={stop.name} onClick={() => { setToStop(stop); setToQuery(stop.name); setShowToDropdown(false); }} className="p-3 hover:bg-green-50 cursor-pointer border-b border-gray-50 flex flex-col">
                      <span className="font-medium text-gray-800">{stop.name}</span>
                      <span className="text-xs text-gray-500">Serves {stop.routes?.length || 1} route(s)</span>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button onClick={handleFindBuses} disabled={isLoading} className="w-full bg-[#40A047] hover:bg-[#328538] text-white font-bold py-3 rounded-lg shadow-md transition active:scale-[0.98] disabled:opacity-70 flex items-center justify-center mt-6">
            FIND BUSES
          </button>
        </div>

        <div className="flex items-center gap-3 my-2 opacity-50">
          <div className="h-px bg-gray-400 flex-1"></div>
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">OR</span>
          <div className="h-px bg-gray-400 flex-1"></div>
        </div>

        <div className="relative" ref={busSearchRef}>
          <div className="flex items-center bg-white border border-gray-200 rounded-xl p-3 shadow-sm focus-within:border-[#40A047] focus-within:ring-1 focus-within:ring-[#40A047] transition">
            <Search className="w-5 h-5 text-[#40A047] mr-3" />
            <input 
              type="text"
              placeholder="Search Bus No. or Route No."
              className="bg-transparent outline-none w-full font-medium text-gray-800 placeholder-gray-400"
              value={busSearchQuery}
              onChange={(e) => {
                setBusSearchQuery(e.target.value);
                setShowBusDropdown(true);
              }}
              onFocus={() => setShowBusDropdown(true)}
            />
          </div>
          <AnimatePresence>
            {showBusDropdown && busSearchResults.length > 0 && (
              <motion.div initial={{opacity:0, y:-5}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-5}} className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-100 rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto">
                {busSearchResults.map(bus => (
                  <div key={bus.id} onClick={() => { setBusSearchQuery(''); setShowBusDropdown(false); handleSelectBus(bus.id); }} className="p-4 hover:bg-green-50 cursor-pointer border-b border-gray-50 flex items-center gap-4">
                    <div className="bg-green-100 p-2 rounded-lg">
                      <Bus className="w-5 h-5 text-[#40A047]" />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-bold text-gray-800">{bus.busNumber}</span>
                      <span className="text-sm text-gray-500 font-medium">Route {bus.routeId} • {bus.routeName}</span>
                    </div>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-medium border border-red-100 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            {error}
          </div>
        )}

        {!selectedBus && searchHistory.length > 0 && (
          <div className="mt-8">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 px-1 flex items-center gap-2">
              <History className="w-4 h-4" /> Recent Searches
            </h3>
            <div className="space-y-2">
              {searchHistory.map((h, i) => (
                <div key={i} onClick={() => { setFromQuery(h.from); setToQuery(h.to); }} className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between cursor-pointer hover:border-green-300 transition">
                  <div className="flex items-center gap-3">
                    <div className="bg-gray-100 p-2 rounded-full"><Clock className="w-4 h-4 text-gray-500" /></div>
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-gray-800">{h.from} <span className="text-gray-400 mx-1">→</span> {h.to}</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      <AnimatePresence>
        {selectedBus && selectedBusDetails && (
          <motion.div initial={{opacity:0, y:100}} animate={{opacity:1, y:0}} exit={{opacity:0, y:100}} className="fixed inset-0 z-50 bg-gray-50 overflow-y-auto pb-24">
            <div className="bg-[#40A047] text-white p-4 flex items-center gap-3 sticky top-0 z-10 shadow-md">
              <button onClick={() => setSelectedBus(null)} className="p-1 hover:bg-white/10 rounded-full transition">
                <ChevronRight className="w-6 h-6 rotate-180" />
              </button>
              <div>
                <h2 className="text-lg font-bold leading-tight">{selectedBus.busNumber}</h2>
                <p className="text-sm text-green-100">Route {selectedBus.routeId} • {selectedBus.routeName}</p>
              </div>
            </div>

            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-3">
                  <div className="bg-blue-50 p-2 rounded-xl"><User className="w-5 h-5 text-blue-600"/></div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium uppercase">DRIVER</p>
                    <p className="text-sm font-bold text-gray-800">{selectedBus.driverName || 'Unassigned'}</p>
                  </div>
                </div>
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-3">
                  <div className="bg-orange-50 p-2 rounded-xl"><Users className="w-5 h-5 text-orange-600"/></div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium uppercase">SEATS</p>
                    <p className="text-sm font-bold text-gray-800">{selectedBus.capacity} Total</p>
                  </div>
                </div>
              </div>

              <button onClick={() => handleOpenLiveTracking(selectedBus.id)} className="w-full bg-black text-white font-bold py-4 rounded-2xl shadow-lg flex items-center justify-center gap-2 hover:bg-gray-800 transition active:scale-[0.98]">
                <Compass className="w-5 h-5" />
                OPEN LIVE TRACKING
              </button>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mt-4">
                <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-5 flex items-center gap-2">
                  <Navigation className="w-4 h-4 text-[#40A047]"/> COMPLETE ROUTE
                </h3>
                
                <div className="relative border-l-2 border-dashed border-green-200 ml-4 space-y-8 py-2">
                  {selectedBusDetails.route?.RouteStop?.map((stop, idx, arr) => (
                    <div key={stop.id} className="relative pl-6">
                      <div className={bsolute -left-[9px] top-1 w-4 h-4 rounded-full border-4 border-white shadow-sm }></div>
                      
                      <div className="flex flex-col -mt-1">
                        <span className="font-bold text-gray-800">{stop.name}</span>
                        <span className="text-xs font-medium text-gray-500 mt-0.5">Stop {stop.stopOrder}</span>
                      </div>
                    </div>
                  ))}
                  {!selectedBusDetails.route?.RouteStop?.length && (
                    <p className="text-sm text-gray-500 pl-4">No stops defined for this route in the database.</p>
                  )}
                </div>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
