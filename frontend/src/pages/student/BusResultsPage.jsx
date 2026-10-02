import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { ChevronLeft, MapPin, Users, Compass, AlertCircle, ArrowDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true
});

export default function BusResultsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  const [buses, setBuses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedBusDetails, setSelectedBusDetails] = useState(null);
  const [showStopsModal, setShowStopsModal] = useState(false);

  useEffect(() => {
    if (!from || !to) {
      setError('Invalid search parameters.');
      setIsLoading(false);
      return;
    }

    const fetchBuses = async () => {
      try {
        setIsLoading(true);
        const res = await api.get(/wimb/buses/between?from=&to=);
        setBuses(res.data);
      } catch (err) {
        console.error(err);
        setError('Unable to load buses. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchBuses();
  }, [from, to]);

  const handleViewStops = async (busId) => {
    try {
      const res = await api.get(/wimb/buses/);
      setSelectedBusDetails(res.data);
      setShowStopsModal(true);
    } catch (err) {
      console.error('Failed to load stops');
    }
  };

  const handleTrackLive = (busId) => {
    navigate(/student/live-tracking?tripId=);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-[#40A047] text-white p-4 flex items-center sticky top-0 z-30 shadow-md">
        <button onClick={() => navigate('/student/where-is-my-bus')} className="p-1 mr-3 hover:bg-white/10 rounded-full transition">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-bold">Buses Between Stops</h1>
      </div>

      <div className="bg-white p-5 shadow-sm border-b border-gray-100">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="font-bold text-gray-800">{from}</span>
          </div>
          <div className="ml-[5px] w-0.5 h-4 bg-gray-300"></div>
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span className="font-bold text-gray-800">{to}</span>
          </div>
        </div>
      </div>

      <div className="p-4">
        {isLoading ? (
          <div className="space-y-4">
            <p className="text-sm text-gray-500 font-medium animate-pulse">Finding available buses...</p>
            {[1, 2].map(i => (
              <div key={i} className="bg-white h-40 rounded-2xl animate-pulse shadow-sm border border-gray-100"></div>
            ))}
          </div>
        ) : error ? (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl flex flex-col items-center justify-center text-center gap-3 border border-red-100 mt-10">
            <AlertCircle className="w-8 h-8" />
            <p className="font-medium">{error}</p>
            <button onClick={() => window.location.reload()} className="mt-2 bg-red-100 text-red-700 px-4 py-2 rounded-lg font-bold hover:bg-red-200 transition">
              Try Again
            </button>
          </div>
        ) : buses.length === 0 ? (
          <div className="text-center mt-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <MapPin className="w-8 h-8 text-gray-400" />
            </div>
            <h2 className="text-lg font-bold text-gray-800 mb-2">No buses available</h2>
            <p className="text-gray-500 mb-6">There are no direct buses found between these stops.</p>
            <button onClick={() => navigate('/student/where-is-my-bus')} className="bg-[#40A047] text-white px-6 py-2 rounded-lg font-bold shadow-md hover:bg-[#328538] transition">
              Change Search
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-2">{buses.length} Buses Available</h3>
            
            {buses.map(bus => (
              <div key={bus.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition">
                <div className="p-4 border-b border-gray-50">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <span className="bg-[#40A047] text-white text-xs font-bold px-2 py-1 rounded-md">ROUTE {bus.routeId}</span>
                      <span className="text-sm font-bold text-gray-800">{bus.busNumber}</span>
                    </div>
                    <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full">{bus.status}</span>
                  </div>
                  <p className="text-xs text-gray-500 font-medium truncate mb-3">{bus.routeName}</p>
                  
                  <div className="grid grid-cols-2 gap-y-3 mt-3">
                    <div>
                      <p className="text-[10px] text-gray-400 font-bold uppercase">CURRENT STOP</p>
                      <p className="text-sm font-bold text-gray-800">--</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 font-bold uppercase">NEXT STOP</p>
                      <p className="text-sm font-bold text-gray-800">--</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 font-bold uppercase">ETA</p>
                      <p className="text-sm font-bold text-gray-800 text-blue-600">-- min</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 font-bold uppercase">AVAILABLE SEATS</p>
                      <div className="flex items-center gap-1">
                        <Users className="w-3 h-3 text-orange-500" />
                        <span className="text-sm font-bold text-gray-800">{Math.max(0, bus.capacity - (bus.bookedSeats||0))}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex divide-x divide-gray-100 bg-gray-50/50">
                  <button onClick={() => handleViewStops(bus.id)} className="flex-1 py-3 text-sm font-bold text-gray-600 hover:bg-gray-100 transition flex items-center justify-center gap-2">
                    <MapPin className="w-4 h-4" /> View Stops
                  </button>
                  <button onClick={() => handleTrackLive(bus.id)} className="flex-1 py-3 text-sm font-bold text-[#40A047] hover:bg-green-50 transition flex items-center justify-center gap-2">
                    <Compass className="w-4 h-4" /> Track Live Bus
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {showStopsModal && selectedBusDetails && (
          <motion.div initial={{opacity:0, y:100}} animate={{opacity:1, y:0}} exit={{opacity:0, y:100}} className="fixed inset-0 z-50 bg-white overflow-y-auto">
            <div className="bg-[#40A047] text-white p-4 flex items-center sticky top-0 z-10 shadow-md">
              <button onClick={() => setShowStopsModal(false)} className="p-1 mr-3 hover:bg-white/10 rounded-full transition">
                <ArrowDown className="w-6 h-6" />
              </button>
              <div>
                <h2 className="text-lg font-bold">Route {selectedBusDetails.bus.routeId} Stops</h2>
                <p className="text-xs text-green-100">{selectedBusDetails.bus.busNumber}</p>
              </div>
            </div>
            
            <div className="p-6">
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
                  <p className="text-sm text-gray-500">No stops defined for this route in the database.</p>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
