import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Bus, MapPin, ArrowLeft, Clock, Navigation } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true
});

export default function BusResultsPage({ inlineFrom, inlineTo, inlineStop, inlineBusId }) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const from = inlineFrom || searchParams.get('from');
  const to = inlineTo || searchParams.get('to');
  const stop = inlineStop || searchParams.get('stop');
  const busId = inlineBusId || searchParams.get('busId');

  const [buses, setBuses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedBusDetails, setSelectedBusDetails] = useState(null);
  const [showStopsModal, setShowStopsModal] = useState(false);

  useEffect(() => {
    const fetchBuses = async () => {
      try {
        setIsLoading(true);
        if (from && to) {
          const res = await api.get(`/wimb/buses/between?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
          setBuses(res.data);
        } else if (stop) {
          const res = await api.get(`/wimb/buses/stop?name=${encodeURIComponent(stop)}`);
          setBuses(res.data);
        } else if (busId) {
          const res = await api.get(`/wimb/buses/${busId}`);
          setBuses(res.data ? [res.data] : []);
        } else {
          setError('No search parameters provided.');
        }
      } catch (err) {
        console.error('Error fetching buses:', err);
        setError('Failed to load buses. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchBuses();
  }, [from, to, stop, busId]);

  const handleTrackLive = (busId) => {
    navigate(`/student/live-tracking?tripId=${busId}`);
  };

  const handleViewStops = async (busId) => {
    try {
      const res = await api.get(`/wimb/buses/${busId}`);
      setSelectedBusDetails(res.data);
      setShowStopsModal(true);
    } catch (err) {
      console.error(err);
      alert("Failed to load bus details.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center">
      
      {/* Header - Only show if not inline */}
      {!inlineFrom && !inlineStop && !inlineBusId && (
        <div className="w-full bg-white border-b border-gray-200 sticky top-0 z-40">
          <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
            <button onClick={() => navigate('/student/where-is-my-bus')} className="p-2 hover:bg-gray-100 rounded-full transition text-gray-700">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div className="text-center">
              <h1 className="font-bold text-gray-800 text-lg">Bus Results</h1>
              {(from && to) && (
                <div className="text-xs text-gray-500 font-medium">
                  {from} <span className="mx-1">→</span> {to}
                </div>
              )}
              {stop && (
                <div className="text-xs text-gray-500 font-medium">Buses at {stop}</div>
              )}
              {busId && (
                <div className="text-xs text-gray-500 font-medium">Direct Bus View</div>
              )}
            </div>
            <div className="w-10"></div>
          </div>
        </div>
      )}

      <div className="max-w-3xl w-full p-4 space-y-4">
        
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-700"></div>
            <p className="mt-4 text-gray-500 font-medium animate-pulse">Finding available buses...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 text-red-700 p-4 rounded-xl text-center font-medium border border-red-100">
            {error}
          </div>
        ) : buses.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl shadow-sm text-center border border-gray-100 flex flex-col items-center">
            <div className="bg-gray-50 w-20 h-20 rounded-full flex items-center justify-center mb-4">
              <Bus className="w-10 h-10 text-gray-300" />
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">No Buses Found</h2>
            <p className="text-gray-500 max-w-sm mx-auto">
              There are currently no active buses operating on this specific route segment. 
            </p>
            <button onClick={() => navigate('/student/where-is-my-bus')} className="mt-6 bg-green-50 text-green-700 font-bold px-6 py-2 rounded-full hover:bg-green-100 transition">
              Try Another Route
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-sm font-bold text-gray-500 px-2">
              FOUND {buses.length} {buses.length === 1 ? 'BUS' : 'BUSES'}
            </div>
            
            {buses.map(bus => (
              <div key={bus.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:border-green-300 transition-colors">
                
                {/* Bus Header info */}
                <div className="p-5 flex items-start justify-between">
                  <div className="flex gap-4">
                    <div className="bg-green-50 w-14 h-14 rounded-xl flex items-center justify-center shrink-0">
                      <Bus className="w-7 h-7 text-green-700" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h2 className="text-xl font-black text-gray-900">{bus.busNumber}</h2>
                        <span className="bg-green-700 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                          Active
                        </span>
                      </div>
                      <div className="text-sm text-gray-500 font-medium">
                        Route {bus.routeId} • {bus.routeName}
                      </div>
                    </div>
                  </div>
                  
                  {bus.capacity && (
                    <div className="text-right">
                      <div className="text-xs font-bold text-gray-400 uppercase tracking-wide">Capacity</div>
                      <div className="text-gray-800 font-medium text-sm">{bus.capacity} Seats</div>
                    </div>
                  )}
                </div>

                <div className="px-5 pb-5 flex gap-3">
                  <button onClick={() => handleViewStops(bus.id)} className="flex-1 bg-gray-50 hover:bg-gray-100 text-gray-700 font-bold py-3 rounded-xl transition flex items-center justify-center gap-2 border border-gray-200">
                    <MapPin className="w-5 h-5" /> Stops
                  </button>
                  <button onClick={() => handleTrackLive(bus.id)} className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl transition flex items-center justify-center gap-2 shadow-sm">
                    <Navigation className="w-5 h-5" /> Track Live
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>

      {/* STOPS MODAL */}
      <AnimatePresence>
        {showStopsModal && selectedBusDetails && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={() => setShowStopsModal(false)} className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"></motion.div>
            <motion.div initial={{opacity:0, scale:0.95, y:20}} animate={{opacity:1, scale:1, y:0}} exit={{opacity:0, scale:0.95, y:20}} className="bg-white rounded-3xl w-full max-w-md max-h-[85vh] flex flex-col relative z-10 shadow-2xl overflow-hidden">
              
              <div className="p-6 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{selectedBusDetails.busNumber} Stops</h3>
                  <p className="text-sm text-gray-500 font-medium">Route {selectedBusDetails.routeId}</p>
                </div>
                <button onClick={() => setShowStopsModal(false)} className="bg-white text-gray-500 hover:text-gray-800 p-2 rounded-full shadow-sm">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto flex-1">
                <div className="relative border-l-2 border-gray-200 ml-4 space-y-8 py-2">
                  {selectedBusDetails.route?.RouteStop?.map((s, idx, arr) => (
                    <div key={s.id} className="relative pl-6">
                      <div className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-4 border-white shadow-sm ${s.name === from || s.name === to || s.name === stop ? 'bg-green-600' : 'bg-gray-300'}`}></div>
                      <div className="flex flex-col -mt-1">
                        <span className="font-bold text-gray-800">{s.name}</span>
                        {s.pickupTime && (
                          <span className="text-xs font-medium text-gray-500 flex items-center gap-1 mt-1">
                            <Clock className="w-3 h-3"/> {s.pickupTime}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 border-t border-gray-100 bg-white">
                <button onClick={() => { setShowStopsModal(false); handleTrackLive(selectedBusDetails.id); }} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3.5 rounded-xl transition flex items-center justify-center gap-2">
                  <Navigation className="w-5 h-5" /> Track Live Bus
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
