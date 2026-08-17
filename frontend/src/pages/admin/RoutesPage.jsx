import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { routeService } from '../../api/services.js'
import PageHeader from '../../components/common/PageHeader.jsx'
import Modal from '../../components/common/Modal.jsx'
import { Bus, MapPin, Clock, Users, IndianRupee, Plus, Trash2, Settings2, Loader } from 'lucide-react'

const EMPTY_STOP = { name: '', latitude: '', longitude: '', stopTime: '' }
const EMPTY_ROUTE = { id: '', name: '', busNumber: '', pickupPoint: '', reportingTime: '', feeAmount: 42900, totalSeats: 50, distance: '' }

export default function RoutesPage() {
  const [routes, setRoutes] = useState([])
  const [loading, setLoading] = useState(true)

  // Stop manager
  const [stopRoute, setStopRoute] = useState(null)
  const [routeStops, setRouteStops] = useState([])
  const [stopsLoading, setStopsLoading] = useState(false)
  const [newStop, setNewStop] = useState(EMPTY_STOP)
  const [stopBusy, setStopBusy] = useState(false)

  // Add route
  const [addOpen, setAddOpen] = useState(false)
  const [newRoute, setNewRoute] = useState(EMPTY_ROUTE)
  const [adding, setAdding] = useState(false)

  const loadRoutes = () => {
    setLoading(true)
    routeService.getAll()
      .then(r => setRoutes(r.data || []))
      .catch(() => toast.error('Could not load routes'))
      .finally(() => setLoading(false))
  }

  useEffect(loadRoutes, [])

  // ---------------- Stop management ----------------
  const openStopManager = (route) => {
    setStopRoute(route)
    setRouteStops([])
    setNewStop(EMPTY_STOP)
    setStopsLoading(true)
    routeService.getStops(route.id)
      .then(r => setRouteStops(r.data?.stops || []))
      .catch(() => toast.error('Could not load stops'))
      .finally(() => setStopsLoading(false))
  }

  const closeStopManager = () => {
    setStopRoute(null)
    setRouteStops([])
  }

  // Silent route refresh (no page-level spinner) for background syncs
  const refreshRoutesSilently = () => {
    routeService.getAll().then(r => setRoutes(r.data || [])).catch(() => {})
  }

  const refreshStops = async () => {
    const r = await routeService.getStops(stopRoute.id)
    setRouteStops(r.data?.stops || [])
    refreshRoutesSilently() // keep the card's stop chips in sync
  }

  const addStop = async (e) => {
    e.preventDefault()
    const name = newStop.name.trim()
    const latStr = newStop.latitude.trim()
    const lngStr = newStop.longitude.trim()
    if (!name) return toast.error('Stop name is required')
    if (!latStr) return toast.error('Latitude is required')
    if (!lngStr) return toast.error('Longitude is required')
    const latitude = Number(latStr)
    const longitude = Number(lngStr)
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) return toast.error('Latitude must be between -90 and 90')
    if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) return toast.error('Longitude must be between -180 and 180')
    setStopBusy(true)
    try {
      await routeService.createStop(stopRoute.id, { name, latitude, longitude, stopTime: newStop.stopTime.trim() || '' })
      setNewStop(EMPTY_STOP)
      await refreshStops()
      toast.success(`Stop "${name}" added`)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not add stop')
    } finally {
      setStopBusy(false)
    }
  }

  const deleteStop = async (stop) => {
    if (!window.confirm(`Delete stop "${stop.name}"?`)) return
    setStopBusy(true)
    try {
      await routeService.deleteStop(stopRoute.id, stop.id)
      setRouteStops(prev => prev.filter(s => s.id !== stop.id))
      refreshRoutesSilently()
      toast.success(`Stop "${stop.name}" deleted`)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not delete stop')
    } finally {
      setStopBusy(false)
    }
  }

  // ---------------- Add route ----------------
  const addRoute = async (e) => {
    e.preventDefault()
    if (!newRoute.id.trim()) return toast.error('Route ID is required')
    if (!newRoute.name.trim()) return toast.error('Route name is required')
    setAdding(true)
    try {
      await routeService.create({
        ...newRoute,
        id: newRoute.id.trim(),
        feeAmount: Number(newRoute.feeAmount) || 42900,
        totalSeats: Number(newRoute.totalSeats) || 50,
      })
      toast.success(`Route ${newRoute.id} created — add its stops now`)
      setAddOpen(false)
      setNewRoute(EMPTY_ROUTE)
      loadRoutes()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not create route')
    } finally {
      setAdding(false)
    }
  }

  const field = 'w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#40A047]/30 focus:border-[#40A047]'
  const label = 'block text-xs font-semibold text-gray-600 mb-1'

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      <PageHeader title="Routes" subtitle={`${routes.length} active routes`}
        actions={
          <button onClick={() => setAddOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#40A047] text-white text-sm font-bold rounded-xl hover:bg-[#2d7a33] transition-colors shadow-sm">
            <Plus size={14} /> Add Route
          </button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {loading && (
          <div className="col-span-full flex justify-center py-10">
            <div className="w-10 h-10 border-3 border-[#40A047] border-t-transparent rounded-full animate-spin" style={{ borderWidth: 3 }} />
          </div>
        )}
        {!loading && routes.length === 0 && (
          <div className="bg-white rounded-2xl p-10 text-center border border-gray-100 shadow-sm col-span-full">
            <Bus size={36} className="mx-auto text-gray-200 mb-3" />
            <p className="text-gray-400 text-sm">No active routes yet</p>
          </div>
        )}
        {routes.map((r, i) => {
          const occupancyPct = r.totalSeats ? Math.round((r.bookedSeats / r.totalSeats) * 100) : 0
          return (
            <motion.div key={r.id || r._id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#40A047] rounded-xl flex items-center justify-center">
                    <Bus size={20} className="text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">{r.id || r.routeId}</p>
                    <p className="text-xs text-gray-500">{r.busNumber}</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">Active</span>
              </div>
              <p className="text-sm font-semibold text-gray-700 mb-4 truncate">{r.name}</p>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="flex items-center gap-2"><MapPin size={13} className="text-[#40A047]" /><div><p className="text-xs text-gray-500">Pickup</p><p className="text-xs font-semibold text-gray-700 truncate">{r.pickupPoint}</p></div></div>
                <div className="flex items-center gap-2"><Clock size={13} className="text-[#40A047]" /><div><p className="text-xs text-gray-500">Reporting</p><p className="text-xs font-semibold text-gray-700">{r.reportingTime}</p></div></div>
                <div className="flex items-center gap-2"><Users size={13} className="text-[#40A047]" /><div><p className="text-xs text-gray-500">Seats</p><p className="text-xs font-semibold text-gray-700">{r.bookedSeats}/{r.totalSeats}</p></div></div>
                <div className="flex items-center gap-2"><IndianRupee size={13} className="text-[#40A047]" /><div><p className="text-xs text-gray-500">Annual Fee</p><p className="text-xs font-semibold text-gray-700">₹{r.feeAmount?.toLocaleString()}</p></div></div>
              </div>
              {/* Occupancy bar */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-500">Occupancy</span>
                  <span className="font-bold text-[#40A047]">{occupancyPct}%</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-[#40A047] rounded-full" style={{ width: `${occupancyPct}%` }} />
                </div>
              </div>
              {/* Stops */}
              <div className="mt-3 flex-1">
                <p className="text-xs text-gray-500 mb-1.5">Stops ({r.stops?.length || 0}):</p>
                <div className="flex flex-wrap gap-1">
                  {(r.stops || []).slice(0, 6).map((s, j) => (
                    <span key={j} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-lg">{s}</span>
                  ))}
                  {(r.stops?.length || 0) > 6 && (
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-400 text-xs rounded-lg">+{r.stops.length - 6} more</span>
                  )}
                  {(r.stops?.length || 0) === 0 && (
                    <span className="text-xs text-gray-400 italic">No stops yet</span>
                  )}
                </div>
              </div>
              {/* Manage stops */}
              <button onClick={() => openStopManager(r)}
                className="mt-4 w-full py-2.5 border-2 border-[#40A047] text-[#40A047] text-sm font-bold rounded-xl hover:bg-green-50 transition-colors flex items-center justify-center gap-2">
                <Settings2 size={15} /> Manage Stops
              </button>
            </motion.div>
          )
        })}
      </div>

      {/* ---------------- Stop manager modal ---------------- */}
      <Modal open={!!stopRoute} onClose={closeStopManager} title={`Stops — Route ${stopRoute?.id}`} size="lg">
        {stopsLoading ? (
          <div className="flex justify-center py-10">
            <div className="w-8 h-8 border-3 border-[#40A047] border-t-transparent rounded-full animate-spin" style={{ borderWidth: 3 }} />
          </div>
        ) : (
          <div className="space-y-5">
            {/* Stop list */}
            {routeStops.length === 0 ? (
              <div className="p-6 bg-gray-50 rounded-xl text-center">
                <MapPin size={24} className="mx-auto text-gray-300 mb-2" />
                <p className="text-sm text-gray-500">No stops on this route yet — add the first one below.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {routeStops.map((s, i) => (
                  <div key={s.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <span className="w-7 h-7 bg-[#40A047] text-white text-xs font-bold rounded-lg flex items-center justify-center flex-shrink-0">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-800 truncate">{s.name}</p>
                      <p className="text-xs text-gray-500">{s.latitude?.toFixed?.(5) ?? s.latitude}, {s.longitude?.toFixed?.(5) ?? s.longitude}{s.stopTime ? ` · ${s.stopTime}` : ''}</p>
                    </div>
                    <button onClick={() => deleteStop(s)} disabled={stopBusy}
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-red-500 hover:bg-red-50 transition-colors flex-shrink-0 disabled:opacity-50">
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add stop form */}
            <form onSubmit={addStop} className="border-t border-gray-100 pt-4">
              <p className="text-sm font-bold text-gray-900 mb-3">Add Stop</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className={label}>Stop Name *</label>
                  <input value={newStop.name} onChange={e => setNewStop({ ...newStop, name: e.target.value })} placeholder="e.g. KPHB Colony"
                    className={field} />
                </div>
                <div>
                  <label className={label}>Latitude *</label>
                  <input value={newStop.latitude} onChange={e => setNewStop({ ...newStop, latitude: e.target.value })} placeholder="e.g. 17.4854"
                    className={field} />
                </div>
                <div>
                  <label className={label}>Longitude *</label>
                  <input value={newStop.longitude} onChange={e => setNewStop({ ...newStop, longitude: e.target.value })} placeholder="e.g. 78.4486"
                    className={field} />
                </div>
                <div className="sm:col-span-2">
                  <label className={label}>Stop Time (optional)</label>
                  <input value={newStop.stopTime} onChange={e => setNewStop({ ...newStop, stopTime: e.target.value })} placeholder="e.g. 08:00"
                    className={field} />
                </div>
              </div>
              <button type="submit" disabled={stopBusy}
                className="mt-4 w-full py-2.5 bg-[#40A047] text-white text-sm font-bold rounded-xl hover:bg-[#2d7a33] transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
                <Plus size={15} /> {stopBusy ? 'Adding…' : 'Add Stop'}
              </button>
            </form>
          </div>
        )}
      </Modal>

      {/* ---------------- Add route modal ---------------- */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add New Route" size="md">
        <form onSubmit={addRoute} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>Route ID *</label>
              <input value={newRoute.id} onChange={e => setNewRoute({ ...newRoute, id: e.target.value })} placeholder="e.g. 13"
                className={field} />
            </div>
            <div>
              <label className={label}>Bus Number</label>
              <input value={newRoute.busNumber} onChange={e => setNewRoute({ ...newRoute, busNumber: e.target.value })} placeholder="e.g. TS 09 AB 1235"
                className={field} />
            </div>
          </div>
          <div>
            <label className={label}>Route Name *</label>
            <input value={newRoute.name} onChange={e => setNewRoute({ ...newRoute, name: e.target.value })} placeholder="e.g. Route 13 - Patancheru to HITAM College"
              className={field} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>Pickup Point</label>
              <input value={newRoute.pickupPoint} onChange={e => setNewRoute({ ...newRoute, pickupPoint: e.target.value })} placeholder="e.g. Patancheru Bus Stop"
                className={field} />
            </div>
            <div>
              <label className={label}>Reporting Time</label>
              <input value={newRoute.reportingTime} onChange={e => setNewRoute({ ...newRoute, reportingTime: e.target.value })} placeholder="e.g. 07:00 AM"
                className={field} />
            </div>
            <div>
              <label className={label}>Annual Fee (₹)</label>
              <input type="number" value={newRoute.feeAmount} onChange={e => setNewRoute({ ...newRoute, feeAmount: e.target.value })} placeholder="42900"
                className={field} />
            </div>
            <div>
              <label className={label}>Total Seats</label>
              <input type="number" value={newRoute.totalSeats} onChange={e => setNewRoute({ ...newRoute, totalSeats: e.target.value })} placeholder="50"
                className={field} />
            </div>
            <div className="col-span-2">
              <label className={label}>Distance</label>
              <input value={newRoute.distance} onChange={e => setNewRoute({ ...newRoute, distance: e.target.value })} placeholder="e.g. 28 km"
                className={field} />
            </div>
          </div>
          <button type="submit" disabled={adding}
            className="w-full py-3 bg-[#40A047] text-white font-bold rounded-xl text-sm hover:bg-[#2d7a33] transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
            {adding ? <><Loader size={15} className="animate-spin" /> Creating…</> : <><Plus size={15} /> Create Route</>}
          </button>
        </form>
      </Modal>
    </motion.div>
  )
}
