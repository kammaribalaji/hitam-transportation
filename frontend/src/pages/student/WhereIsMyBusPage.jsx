import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import {
  Search, ArrowRightLeft, Bus, MapPin, Clock, Star, X, 
  ChevronRight, ChevronDown, ArrowRight, Bell, AlertCircle
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

  const [stopSearchQuery, setStopSearchQuery] = useState('');
  const [stopSearchResults, setStopSearchResults] = useState([]);
  const [showStopSearchDropdown, setShowStopSearchDropdown] = useState(false);

  const [error, setError] = useState(null);

  const [searchHistory, setSearchHistory] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('hitam_bus_search_history') || '[]');
    } catch (_) { return []; }
  });

  const debouncedFrom = useDebounce(fromQuery, 50);
  const debouncedTo = useDebounce(toQuery, 50);
  const debouncedBus = useDebounce(busSearchQuery, 50);
  const debouncedStopSearch = useDebounce(stopSearchQuery, 50);

  const fromRef = useRef(null);
  const toRef = useRef(null);
  const busSearchRef = useRef(null);
  const stopSearchRef = useRef(null);

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

  useEffect(() => {
    if (debouncedFrom.length >= 1 && !fromStop) {
      api.get(`/wimb/stops/search?q=${encodeURIComponent(debouncedFrom)}`)
        .then(res => setFromSuggestions(res.data))
        .catch(console.error);
    } else {
      setFromSuggestions([]);
    }
  }, [debouncedFrom, fromStop]);

  useEffect(() => {
    if (debouncedTo.length >= 1 && !toStop) {
      api.get(`/wimb/stops/search?q=${encodeURIComponent(debouncedTo)}`)
        .then(res => setToSuggestions(res.data))
        .catch(console.error);
    } else {
      setToSuggestions([]);
    }
  }, [debouncedTo, toStop]);

  useEffect(() => {
    if (debouncedBus.length >= 1) {
      api.get(`/wimb/buses/search?q=${encodeURIComponent(debouncedBus)}`)
        .then(res => setBusSearchResults(res.data))
        .catch(console.error);
    } else {
      setBusSearchResults([]);
    }
  }, [debouncedBus]);

  useEffect(() => {
    if (debouncedStopSearch.length >= 1) {
      api.get(`/wimb/stops/search?q=${encodeURIComponent(debouncedStopSearch)}`)
        .then(res => setStopSearchResults(res.data))
        .catch(console.error);
    } else {
      setStopSearchResults([]);
    }
  }, [debouncedStopSearch]);

  const handleSwap = () => {
    const tempQ = fromQuery;
    const tempS = fromStop;
    setFromQuery(toQuery);
    setFromStop(toStop);
    setToQuery(tempQ);
    setToStop(tempS);
  };

  const handleFindBuses = () => {
    if (!fromStop || !toStop) {
      setError('Please select both From and To stops from the dropdowns.');
      return;
    }
    setError(null);
    const newHistory = [{ from: fromStop.name, to: toStop.name, fromId: fromStop.id, toId: toStop.id }, ...searchHistory.filter(h => h.from !== fromStop.name || h.to !== toStop.name)].slice(0, 5);
    setSearchHistory(newHistory);
    localStorage.setItem('hitam_bus_search_history', JSON.stringify(newHistory));
    
    navigate(`/student/bus-results?fromStopId=${fromStop.id}&toStopId=${toStop.id}&fromName=${encodeURIComponent(fromStop.name)}&toName=${encodeURIComponent(toStop.name)}`);
  };

  const handleSelectBus = (busId) => {
    navigate(`/student/live-tracking?tripId=${busId}`); 
  };

  const handleSelectStopSearch = (stop) => {
    navigate(`/student/bus-results?stopId=${stop.id}&stopName=${encodeURIComponent(stop.name)}`);
  };

  const clearHistory = () => {
    setSearchHistory([]);
    localStorage.removeItem('hitam_bus_search_history');
  };

  const popularRoutes = [
    { from: 'Sangareddy', to: 'HITAM', route: 'R12' },
    { from: 'Suchitra', to: 'HITAM', route: 'R15' },
    { from: 'KPHB', to: 'HITAM', route: 'R5' },
    { from: 'ECIL', to: 'HITAM', route: 'R18' },
    { from: 'Miyapur', to: 'HITAM', route: 'R7' },
    { from: 'Gachibowli', to: 'HITAM', route: 'R20' }
  ];

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
                  <Bus className="w-8 h-8 sm:w-10 sm:h-10 md:w-10 md:h-10 text-green-400" />
                </div>
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight flex items-center flex-wrap gap-3">
                  Find My Bus
                  <span className="text-[10px] md:text-xs align-middle bg-green-500/20 text-green-300 border border-green-500/30 px-3 py-1.5 rounded-full uppercase tracking-widest font-bold backdrop-blur-sm">Precision Search</span>
                </h1>
              </div>
              <p className="text-gray-300 font-medium text-sm sm:text-base md:text-lg sm:ml-[4.5rem] md:ml-[5.5rem]">Discover the fastest route between college stops in real-time.</p>
            </div>
            
            {/* Background illustrations representation */}
            <div className="absolute right-0 bottom-0 opacity-20 pointer-events-none hidden sm:block w-1/3 md:w-auto h-full mix-blend-overlay">
               <svg className="h-full w-auto float-right" viewBox="0 0 400 150" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M50 150L150 50L250 150Z" fill="#4ade80"/>
                  <rect x="250" y="50" width="150" height="100" fill="#4ade80"/>
               </svg>
            </div>
          </div>

          <div className="p-4 sm:p-6 md:p-8">
            {/* FROM and TO Search row */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2 md:gap-4 relative">
              
              {/* FROM STOP */}
              <div className="flex-1 w-full" ref={fromRef}>
                <label className="text-[10px] md:text-xs font-bold text-gray-500 mb-1.5 md:mb-2 block uppercase tracking-wide">FROM STOP</label>
                <div className="relative flex items-center bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl md:rounded-2xl p-2.5 md:p-3 focus-within:bg-white focus-within:border-green-500 focus-within:ring-4 focus-within:ring-green-500/10 transition-all duration-300 shadow-sm">
                  <MapPin className="w-4 h-4 md:w-5 md:h-5 text-green-600 mr-2 md:mr-3 shrink-0" />
                  <input 
                    type="text"
                    placeholder="Where are you starting?"
                    className="bg-transparent outline-none w-full text-gray-800 font-semibold text-sm md:text-base placeholder-gray-400"
                    value={fromQuery}
                    onChange={(e) => {
                      setFromQuery(e.target.value);
                      setFromStop(null);
                      setShowFromDropdown(true);
                    }}
                    onFocus={() => setShowFromDropdown(true)}
                  />
                  <div className="flex items-center gap-2 shrink-0">
                    {fromQuery && (
                      <button onClick={() => { setFromQuery(''); setFromStop(null); }} className="p-1 hover:bg-gray-100 rounded-full text-gray-400">
                        <X className="w-3 h-3 md:w-4 md:h-4"/>
                      </button>
                    )}
                    <div className="w-px h-4 md:h-5 bg-gray-200"></div>
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  </div>
                </div>
                
                {/* FROM Suggestions */}
                <AnimatePresence>
                  {showFromDropdown && fromSuggestions.length > 0 && (
                    <motion.div initial={{opacity:0, y:-5}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-5}} className="absolute top-full left-0 right-0 md:right-auto md:w-[120%] mt-1 bg-white border border-gray-100 rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto">
                      {fromSuggestions.map(stop => (
                        <div key={stop.name} onClick={() => { setFromStop(stop); setFromQuery(stop.name); setShowFromDropdown(false); }} className="p-3 hover:bg-green-50 cursor-pointer border-b border-gray-50 flex flex-col transition-colors">
                          <span className="font-medium text-gray-800 text-sm md:text-base">{stop.name}</span>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* SWAP BUTTON */}
              <div className="shrink-0 flex items-center justify-center my-1 md:my-0 md:mt-6 relative z-10 -mx-4 md:mx-0">
                <div className="bg-[#f4f7f6] md:bg-white rounded-full p-1 md:p-0 absolute md:static z-20">
                  <button onClick={handleSwap} className="bg-[#f0f9f3] border border-green-100 shadow-sm p-2 md:p-3 rounded-full hover:bg-green-100 active:scale-95 transition text-[#2f8836]">
                    <ArrowRightLeft className="w-4 h-4 md:w-5 md:h-5 rotate-90 md:rotate-0" />
                  </button>
                </div>
              </div>

              {/* TO STOP */}
              <div className="flex-1 w-full" ref={toRef}>
                <label className="text-[10px] md:text-xs font-bold text-gray-500 mb-1.5 md:mb-2 block uppercase tracking-wide">TO STOP</label>
                <div className="relative flex items-center bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl md:rounded-2xl p-2.5 md:p-3 focus-within:bg-white focus-within:border-green-500 focus-within:ring-4 focus-within:ring-green-500/10 transition-all duration-300 shadow-sm">
                  <MapPin className="w-4 h-4 md:w-5 md:h-5 text-green-600 mr-2 md:mr-3 shrink-0" />
                  <input 
                    type="text"
                    placeholder="Where do you want to go?"
                    className="bg-transparent outline-none w-full text-gray-800 font-semibold text-sm md:text-base placeholder-gray-400"
                    value={toQuery}
                    onChange={(e) => {
                      setToQuery(e.target.value);
                      setToStop(null);
                      setShowToDropdown(true);
                    }}
                    onFocus={() => setShowToDropdown(true)}
                  />
                  <div className="flex items-center gap-2 shrink-0">
                    {toQuery && (
                      <button onClick={() => { setToQuery(''); setToStop(null); }} className="p-1 hover:bg-gray-100 rounded-full text-gray-400">
                        <X className="w-3 h-3 md:w-4 md:h-4"/>
                      </button>
                    )}
                    <div className="w-px h-4 md:h-5 bg-gray-200"></div>
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  </div>
                </div>
                
                {/* TO Suggestions */}
                <AnimatePresence>
                  {showToDropdown && toSuggestions.length > 0 && (
                    <motion.div initial={{opacity:0, y:-5}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-5}} className="absolute top-full right-0 left-0 md:left-auto md:w-[120%] mt-1 bg-white border border-gray-100 rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto">
                      {toSuggestions.map(stop => (
                        <div key={stop.name} onClick={() => { setToStop(stop); setToQuery(stop.name); setShowToDropdown(false); }} className="p-3 hover:bg-green-50 cursor-pointer border-b border-gray-50 flex flex-col transition-colors">
                          <span className="font-medium text-gray-800 text-sm md:text-base">{stop.name}</span>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

            </div>

            {error && (
              <div className="text-red-500 text-xs md:text-sm mt-3 font-medium flex items-center gap-1.5 md:gap-2 bg-red-50 p-2 md:p-3 rounded-lg border border-red-100">
                <AlertCircle className="w-4 h-4"/> {error}
              </div>
            )}

            {/* FIND BUSES BUTTON */}
            <button onClick={handleFindBuses} className="w-full bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white font-black py-4 md:py-5 rounded-xl md:rounded-2xl shadow-lg hover:shadow-green-500/25 transition-all active:scale-[0.98] flex items-center justify-center gap-3 mt-6 text-base md:text-lg tracking-wide group">
              <Search className="w-5 h-5 md:w-6 md:h-6 group-hover:scale-110 transition-transform" />
              SEARCH LIVE BUSES
              <ArrowRight className="w-5 h-5 md:w-6 md:h-6 ml-1 md:ml-2 group-hover:translate-x-1 transition-transform" />
            </button>

            {/* OR DIVIDER */}
            <div className="flex items-center gap-3 md:gap-4 my-6 md:my-8">
              <div className="h-px bg-gray-200 flex-1"></div>
              <span className="text-xs md:text-sm font-bold text-gray-400 uppercase tracking-wider">OR</span>
              <div className="h-px bg-gray-200 flex-1"></div>
            </div>

            {/* QUICK SEARCH GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mt-4">
              
              {/* LIVE BUS STOP SEARCH */}
              <div className="relative w-full" ref={stopSearchRef}>
                <label className="text-[10px] md:text-xs font-bold text-gray-500 mb-1.5 md:mb-2 block uppercase tracking-wide">LIVE BUS STOP POSITION</label>
                <div className="flex items-center bg-white border border-gray-300 rounded-xl md:rounded-2xl p-2.5 md:p-3 focus-within:border-[#2f8836] focus-within:ring-1 focus-within:ring-[#2f8836] transition">
                  <MapPin className="w-4 h-4 md:w-5 md:h-5 text-gray-400 mr-2 md:mr-3 shrink-0" />
                  <input 
                    type="text"
                    placeholder="e.g. JNTU, KPHB..."
                    className="bg-transparent outline-none w-full font-medium text-gray-800 placeholder-gray-400 text-sm md:text-base"
                    value={stopSearchQuery}
                    onChange={(e) => {
                      setStopSearchQuery(e.target.value);
                      setShowStopSearchDropdown(true);
                    }}
                    onFocus={() => setShowStopSearchDropdown(true)}
                  />
                </div>
                <AnimatePresence>
                  {showStopSearchDropdown && stopSearchResults.length > 0 && (
                    <motion.div initial={{opacity:0, y:-5}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-5}} className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-100 rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto">
                      {stopSearchResults.map(stop => (
                        <div key={stop.id || stop.name} onClick={() => { setStopSearchQuery(''); setShowStopSearchDropdown(false); handleSelectStopSearch(stop); }} className="p-3 md:p-4 hover:bg-green-50 cursor-pointer border-b border-gray-50 flex items-center gap-3 md:gap-4 transition-colors">
                          <div className="bg-green-100 p-2 rounded-lg shrink-0">
                            <MapPin className="w-4 h-4 md:w-5 md:h-5 text-[#2f8836]" />
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold text-gray-800 text-sm md:text-base">{stop.name}</span>
                            <span className="text-xs md:text-sm text-gray-500 font-medium">View live buses at this stop</span>
                          </div>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* BUS ROUTE SEARCH */}
              <div className="relative w-full" ref={busSearchRef}>
                <label className="text-[10px] md:text-xs font-bold text-gray-500 mb-1.5 md:mb-2 block uppercase tracking-wide">BUS NO. OR ROUTE NO.</label>
                <div className="flex items-center bg-white border border-gray-300 rounded-xl md:rounded-2xl p-2.5 md:p-3 focus-within:border-[#2f8836] focus-within:ring-1 focus-within:ring-[#2f8836] transition">
                  <Bus className="w-4 h-4 md:w-5 md:h-5 text-gray-400 mr-2 md:mr-3 shrink-0" />
                  <input 
                    type="text"
                    placeholder="e.g. 1215, Route 12, TS 09 UB 1212..."
                    className="bg-transparent outline-none w-full font-medium text-gray-800 placeholder-gray-400 text-sm md:text-base"
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
                        <div key={bus.id} onClick={() => { setBusSearchQuery(''); setShowBusDropdown(false); handleSelectBus(bus.id); }} className="p-3 md:p-4 hover:bg-green-50 cursor-pointer border-b border-gray-50 flex items-center gap-3 md:gap-4 transition-colors">
                          <div className="bg-green-100 p-2 rounded-lg shrink-0">
                            <Bus className="w-4 h-4 md:w-5 md:h-5 text-[#2f8836]" />
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold text-gray-800 text-sm md:text-base">{bus.busNumber}</span>
                            <span className="text-xs md:text-sm text-gray-500 font-medium">Route {bus.routeId} • {bus.routeName}</span>
                          </div>
                        </div>
                      ))}
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
                <button onClick={clearHistory} className="text-green-700 font-bold text-xs md:text-sm hover:underline">Clear All</button>
              )}
            </div>
            
            <div className="space-y-1">
              {searchHistory.length === 0 ? (
                <div className="text-gray-400 text-xs md:text-sm py-4 text-center">No recent searches.</div>
              ) : (
                searchHistory.map((h, i) => (
                  <div key={i} onClick={() => { 
                      setFromQuery(h.from); setToQuery(h.to); 
                      if(h.fromId) setFromStop({ id: h.fromId, name: h.from });
                      if(h.toId) setToStop({ id: h.toId, name: h.to });
                    }} className="group flex items-center justify-between py-3 md:py-4 border-b border-gray-50 cursor-pointer hover:bg-gray-50 px-2 rounded-lg transition-colors">
                    <div className="flex items-center gap-2 md:gap-3 overflow-hidden">
                      <Clock className="w-4 h-4 md:w-5 md:h-5 text-gray-400 shrink-0" />
                      <span className="text-xs md:text-sm font-medium text-gray-700 truncate">{h.from} <span className="text-gray-300 mx-0.5 md:mx-1">→</span> {h.to}</span>
                    </div>
                    <ChevronRight className="w-4 h-4 md:w-5 md:h-5 text-gray-300 group-hover:text-green-600 transition shrink-0 ml-2" />
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
                  <Star className="w-6 h-6 md:w-7 md:h-7 fill-current" />
                </div>
                <h2 className="font-bold text-gray-900 text-base md:text-lg">Popular Routes</h2>
              </div>
              <button className="text-green-700 font-bold text-xs md:text-sm hover:underline">View All</button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3">
              {popularRoutes.map((route, i) => (
                <div key={i} onClick={() => { 
                    setFromQuery(route.from); setToQuery(route.to); 
                    setFromStop({ id: null, name: route.from }); // Need actual ID mapping for quick routes if possible, or they need to select again
                  }} className="border border-gray-100 rounded-xl p-3 md:p-4 flex items-center justify-between cursor-pointer hover:border-green-300 hover:shadow-sm transition-all group">
                  <div className="flex items-center gap-1.5 md:gap-2 text-[11px] md:text-xs font-bold text-gray-700 truncate">
                    <span className="group-hover:text-green-700 transition truncate">{route.from}</span>
                    <span className="text-gray-300 shrink-0">→</span>
                    <span className="group-hover:text-green-700 transition truncate">{route.to}</span>
                  </div>
                  <div className="bg-[#e6f5ea] text-[#2f8836] text-[10px] font-black px-2 py-1 rounded-md shrink-0 ml-2">
                    {route.route}
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
