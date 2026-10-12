import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Bus, MapPin, ArrowLeft, Clock, Navigation, X, CreditCard,
  AlertTriangle, RefreshCw, ChevronRight, CheckCircle2, Shield
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../api/axios.js';
import { useAuth } from '../../hooks/useAuth.js';
import { formatCurrency } from '../../utils/helpers.js';

export default function BusResultsPage({
  inlineFromId,
  inlineToId,
  inlineFromName,
  inlineToName,
  inlineStopId,
  inlineStopName,
  inlineBusId,
}) {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
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

  const fromStopId = inlineFromId || searchParams.get('fromStopId');
  const toStopId = inlineToId || searchParams.get('toStopId');
  const fromName = inlineFromName || searchParams.get('fromName') || searchParams.get('from');
  const toName = inlineToName || searchParams.get('toName') || searchParams.get('to');
  const stopId = inlineStopId || searchParams.get('stopId');
  const stopName = inlineStopName || searchParams.get('stopName') || searchParams.get('stop');
  const busId = inlineBusId || searchParams.get('busId');
  const busNumber = searchParams.get('busNumber');
  const routeParam = searchParams.get('route');

  const [buses, setBuses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedBusDetails, setSelectedBusDetails] = useState(null);
  const [showStopsModal, setShowStopsModal] = useState(false);

  const fetchBuses = useCallback(async () => {
    setError(null);
    setIsLoading(true);

    try {
      // Validate same stop selection early
      if (
        (fromStopId && toStopId && fromStopId === toStopId && fromStopId !== 'null') ||
        (fromName && toName && fromName.trim().toLowerCase() === toName.trim().toLowerCase() && fromName !== 'null')
      ) {
        setError('Origin and destination stops cannot be the same. Please select two distinct stops.');
        setBuses([]);
        setIsLoading(false);
        return;
      }

      let res = null;

      // 1. Origin and destination stop search
      if ((fromStopId && fromStopId !== 'null') || (fromName && fromName !== 'null')) {
        const params = new URLSearchParams();
        if (fromStopId && fromStopId !== 'null') params.set('fromStopId', fromStopId);
        if (toStopId && toStopId !== 'null') params.set('toStopId', toStopId);
        if (fromName && fromName !== 'null') params.set('fromName', fromName);
        if (toName && toName !== 'null') params.set('toName', toName);

        res = await api.get(`/wimb/buses/search-between?${params.toString()}`);
        setBuses(Array.isArray(res.data) ? res.data : []);
      }
      // 2. Stop-only search (Buses serving a stop)
      else if ((stopId && stopId !== 'null') || (stopName && stopName !== 'null')) {
        const params = new URLSearchParams();
        if (stopId && stopId !== 'null') params.set('stopId', stopId);
        if (stopName && stopName !== 'null') params.set('name', stopName);

        res = await api.get(`/wimb/buses/stop?${params.toString()}`);
        setBuses(Array.isArray(res.data) ? res.data : []);
      }
      // 3. Direct Bus lookup
      else if ((busId && busId !== 'null') || (busNumber && busNumber !== 'null')) {
        const idToSearch = busId || busNumber;
        res = await api.get(`/wimb/buses/${encodeURIComponent(idToSearch)}`);
        setBuses(res.data ? [res.data] : []);
      }
      // 4. Incomplete query
      else {
        setError('Please provide origin and destination stops or a bus number to view results.');
        setBuses([]);
      }
    } catch (err) {
      console.error('Error fetching bus results:', err);
      const apiMsg = err.response?.data?.message;
      if (apiMsg) {
        setError(apiMsg);
      } else if (err.code === 'ECONNABORTED' || err.message?.includes('Network Error')) {
        setError('Network connectivity issue. Please verify your connection and try again.');
      } else {
        setError('Server error occurred while loading bus schedules. Please try again.');
      }
      setBuses([]);
    } finally {
      setIsLoading(false);
    }
  }, [fromStopId, toStopId, fromName, toName, stopId, stopName, busId, busNumber, routeParam]);

  useEffect(() => {
    fetchBuses();
  }, [fetchBuses]);

  const handleTrackLive = (bus) => {
    navigate(`/student/tracking?route=${bus.routeId}&bus=${encodeURIComponent(bus.busNumber)}`);
  };

  const handleViewStops = async (bus) => {
    try {
      if (bus.routeDetails?.routeStops?.length) {
        setSelectedBusDetails(bus);
        setShowStopsModal(true);
      } else {
        const res = await api.get(`/wimb/buses/${bus.id}`);
        setSelectedBusDetails(res.data);
        setShowStopsModal(true);
      }
    } catch (err) {
      console.error(err);
      setSelectedBusDetails(bus);
      setShowStopsModal(true);
    }
  };

  const handleModifySearch = () => {
    navigate('/student/where-is-my-bus');
  };

  const handlePayFee = (bus) => {
    navigate('/student/payment', {
      state: {
        selectedRouteId: bus.routeId,
        busNumber: bus.busNumber,
        pickupPoint: bus.originStop?.name || fromName || '',
      },
    });
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center">
      {/* Top Header */}
      <div className="w-full bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <button
            onClick={handleModifySearch}
            className="p-2 -ml-2 hover:bg-gray-100 rounded-xl transition text-gray-700 flex items-center gap-1.5 text-xs font-bold"
            title="Back to Search"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="hidden sm:inline">Back to Search</span>
          </button>

          <div className="text-center truncate px-2">
            <h1 className="font-extrabold text-gray-900 text-base sm:text-lg">Bus Results</h1>
            {fromName && toName && (
              <div className="text-xs text-gray-500 font-semibold truncate flex items-center justify-center gap-1">
                <span>{fromName}</span>
                <span className="text-gray-400">→</span>
                <span>{toName}</span>
              </div>
            )}
            {stopName && !fromName && (
              <div className="text-xs text-gray-500 font-semibold">Buses passing via {stopName}</div>
            )}
            {busNumber && !fromName && (
              <div className="text-xs text-gray-500 font-semibold">Bus: {busNumber}</div>
            )}
          </div>

          <button
            onClick={fetchBuses}
            className="p-2 hover:bg-gray-100 rounded-xl transition text-gray-600"
            title="Refresh Results"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="max-w-4xl w-full p-4 sm:p-6 space-y-4">
        {/* Loading State */}
        {isLoading ? (
          <div className="bg-white rounded-3xl p-12 border border-gray-100 shadow-sm flex flex-col items-center justify-center my-6 text-center">
            <div className="w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full animate-spin mb-4" />
            <h3 className="text-base font-bold text-gray-800">Searching Available Buses</h3>
            <p className="text-xs text-gray-500 mt-1 max-w-sm">
              Checking active routes, stop sequences, and seat availability in PostgreSQL...
            </p>
          </div>
        ) : error ? (
          /* Error State (Distinct from empty results!) */
          <div className="bg-white rounded-3xl p-8 sm:p-10 border border-red-200 shadow-sm text-center max-w-lg mx-auto my-6">
            <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-red-200">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">Unable to Load Buses</h2>
            <p className="text-xs sm:text-sm text-gray-600 mb-6">{error}</p>
            <div className="flex flex-col sm:flex-row gap-2.5 justify-center">
              <button
                onClick={fetchBuses}
                className="px-6 py-2.5 bg-green-700 hover:bg-green-800 text-white text-xs font-bold rounded-xl transition shadow-sm flex items-center justify-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry Search</span>
              </button>
              <button
                onClick={handleModifySearch}
                className="px-6 py-2.5 border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs font-bold rounded-xl transition"
              >
                Modify Search
              </button>
            </div>
          </div>
        ) : buses.length === 0 ? (
          /* Legitimate Empty Results State */
          <div className="bg-white rounded-3xl p-8 sm:p-12 border border-gray-100 shadow-sm text-center max-w-lg mx-auto my-6">
            <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-gray-200">
              <Bus className="w-8 h-8 text-gray-400" />
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">No Buses Found</h2>
            <p className="text-xs sm:text-sm text-gray-500 leading-relaxed mb-6">
              There are currently no active buses operating on this specific route segment in this direction.
              Try selecting an adjacent boarding stop or verifying the route corridor.
            </p>
            <button
              onClick={handleModifySearch}
              className="px-7 py-3 bg-green-50 hover:bg-green-100 text-green-800 border border-green-200 font-bold rounded-xl text-xs sm:text-sm transition shadow-sm"
            >
              Try Another Route or Stop
            </button>
          </div>
        ) : (
          /* Success Results List */
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-extrabold text-gray-500 uppercase tracking-wider">
                FOUND {buses.length} {buses.length === 1 ? 'MATCHING BUS' : 'MATCHING BUSES'}
              </span>
              <span className="text-xs font-semibold text-green-700 bg-green-50 px-2.5 py-0.5 rounded-full border border-green-200">
                Active College Fleet
              </span>
            </div>

            {buses.map((bus) => (
              <div
                key={bus.id || bus.busNumber}
                className="bg-white rounded-2xl sm:rounded-3xl shadow-sm border border-gray-100 overflow-hidden hover:border-green-300 hover:shadow-md transition-all"
              >
                {/* Bus Header */}
                <div className="p-5 sm:p-6 flex items-start justify-between gap-4">
                  <div className="flex gap-3.5 sm:gap-4 min-w-0">
                    <div className="bg-green-50 w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center shrink-0 border border-green-100">
                      <Bus className="w-6 h-6 sm:w-7 sm:h-7 text-[#40A047]" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h2 className="text-lg sm:text-xl font-black text-gray-900 font-mono tracking-tight">
                          {bus.busNumber}
                        </h2>
                        <span className="bg-green-100 text-green-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                          {bus.status || 'ACTIVE'}
                        </span>
                        {bus.currentLocation?.status === 'MOVING' && (
                          <span className="bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                            <span className="w-1.5 h-1.5 bg-white rounded-full" />
                            LIVE ON ROAD
                          </span>
                        )}
                      </div>
                      <p className="text-xs sm:text-sm text-gray-600 font-medium truncate">
                        Route {bus.routeId} • {bus.routeName}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Annual Fee</div>
                    <div className="text-base sm:text-lg font-black text-[#40A047]">
                      {formatCurrency(bus.fare || 12000)}
                    </div>
                  </div>
                </div>

                {/* Journey segment stops */}
                {bus.originStop && bus.destinationStop && (
                  <div className="px-5 sm:px-6 py-2.5 bg-green-50/60 border-t border-green-100/60 flex items-center justify-between text-xs font-semibold text-gray-700">
                    <div className="flex items-center gap-1.5 truncate">
                      <MapPin size={13} className="text-green-700 shrink-0" />
                      <span className="font-bold text-gray-900 truncate">{bus.originStop.name}</span>
                      <span className="text-gray-400 mx-1">→</span>
                      <span className="font-bold text-gray-900 truncate">{bus.destinationStop.name}</span>
                    </div>
                    {bus.intermediateStopsCount > 0 && (
                      <span className="text-[11px] text-gray-500 shrink-0 hidden sm:inline">
                        {bus.intermediateStopsCount} intermediate stops
                      </span>
                    )}
                  </div>
                )}

                {/* Info strip */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-5 sm:px-6 py-3.5 bg-gray-50/60 border-y border-gray-100 text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide block">Fleet Capacity</span>
                    <span className="font-bold text-gray-800">{bus.capacity || 40} Seats</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide block">Route Stops</span>
                    <span className="font-bold text-gray-800">
                      {bus.routeDetails?.routeStops?.length || bus.routeDetails?.stops?.length || 0} Total Stops
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide block">Reporting Time</span>
                    <span className="font-bold text-gray-800">{bus.reportingTime || '07:30 AM'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide block">Live Tracking</span>
                    <span className="font-bold text-green-700 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                      Active Map
                    </span>
                  </div>
                </div>

                {/* Actions row */}
                <div className="px-5 sm:px-6 py-3.5 flex flex-wrap gap-2.5 sm:gap-3 items-center">
                  <button
                    onClick={() => handleViewStops(bus)}
                    className="flex-1 min-w-[90px] bg-gray-50 hover:bg-gray-100 text-gray-700 font-bold py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 text-xs border border-gray-200"
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    <span>View Stops</span>
                  </button>

                  <button
                    onClick={() => handleTrackLive(bus)}
                    className="flex-1 min-w-[100px] bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 text-xs shadow-sm"
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    <span>Track Live</span>
                  </button>

                  {!user?.transportFeePaid && (
                    <button
                      onClick={() => handlePayFee(bus)}
                      className="w-full sm:flex-1 min-w-[130px] bg-[#40A047] hover:bg-[#2d7a33] text-white font-bold py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 text-xs shadow-sm"
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>Pay Transport Fee</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Route Stops Modal */}
      <AnimatePresence>
        {showStopsModal && selectedBusDetails && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowStopsModal(false)}
              className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl w-full max-w-md max-h-[85vh] flex flex-col relative z-10 shadow-2xl overflow-hidden"
            >
              <div className="p-5 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-black text-gray-900">
                    {selectedBusDetails.busNumber} Stops
                  </h3>
                  <p className="text-xs text-gray-500 font-medium">
                    Route {selectedBusDetails.routeId} • {selectedBusDetails.routeName}
                  </p>
                </div>
                <button
                  onClick={() => setShowStopsModal(false)}
                  className="bg-white text-gray-500 hover:text-gray-800 p-1.5 rounded-full border border-gray-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto flex-1">
                <div className="relative border-l-2 border-gray-200 ml-3 space-y-6 py-2">
                  {(
                    selectedBusDetails.routeDetails?.routeStops ||
                    (selectedBusDetails.routeDetails?.stops || []).map((name, idx) => ({
                      id: String(idx),
                      name,
                      stopOrder: idx + 1,
                    }))
                  ).map((s, idx) => {
                    const isOrigin = s.name === fromName;
                    const isDest = s.name === toName;
                    const isKeyStop = isOrigin || isDest;
                    return (
                      <div key={s.id || idx} className="relative pl-6">
                        <div
                          className={`absolute -left-[9px] top-0.5 w-4 h-4 rounded-full border-4 border-white shadow-sm ${
                            isKeyStop ? 'bg-green-600' : 'bg-gray-300'
                          }`}
                        />
                        <div className="flex flex-col">
                          <span
                            className={`text-xs ${
                              isKeyStop ? 'font-black text-green-900 text-sm' : 'font-semibold text-gray-800'
                            }`}
                          >
                            {s.name}
                            {isOrigin && ' (Your Boarding Stop)'}
                            {isDest && ' (Your Destination)'}
                          </span>
                          {s.stopTime && (
                            <span className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5">
                              <Clock className="w-3 h-3 text-gray-400" /> {s.stopTime}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="p-4 border-t border-gray-100 bg-white flex gap-2">
                <button
                  onClick={() => {
                    setShowStopsModal(false);
                    handleTrackLive(selectedBusDetails);
                  }}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl transition flex items-center justify-center gap-2 text-xs"
                >
                  <Navigation className="w-4 h-4" />
                  <span>Open Live Map</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
