import React, { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { hypegpsService, routeService } from '../../api/services.js'
import PageHeader from '../../components/common/PageHeader.jsx'
import { RefreshCw, Satellite, AlertTriangle, Route as RouteIcon, Plus, Pencil, Trash2, X } from 'lucide-react'

const fmtTime = (iso) => (iso ? new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—')
const fmtNum = (n) => (n === null || n === undefined ? '—' : Number(n).toFixed(6))
const fmtSpeed = (n) => (n > 0 ? `${Math.round(n)} km/h` : '0 km/h')

function StatusChip({ status, isStale }) {
  if (isStale) return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-yellow-100 text-yellow-700">STALE</span>
  if (status === 'online') return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">ONLINE</span>
  if (status === 'offline') return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-600">OFFLINE</span>
  return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-500">{String(status || '—').toUpperCase()}</span>
}

const EMPTY_FORM = { routeId: '', deviceId: '', busNumber: '' }

export default function HypegpsDevicesPage() {
  const [data, setData] = useState(null)
  const [mappings, setMappings] = useState([])
  const [routes, setRoutes] = useState([])
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(EMPTY_FORM)
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    // Mappings + routes load independently — usable even before HypeGPS is configured.
    try {
      const [mapRes, routeRes] = await Promise.all([
        hypegpsService.getMappings().catch(() => ({ data: [] })),
        routeService.getAll().catch(() => ({ data: [] })),
      ])
      setMappings(mapRes.data || [])
      setRoutes(routeRes.data || [])
    } catch { /* ignore */ }
    try {
      const res = await hypegpsService.getDevices()
      setData(res.data)
      setError(null)
    } catch (err) {
      setData(null)
      setError(err.response?.data?.message || 'Failed to load HypeGPS status')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // Auto-refresh every 10s (backend cache TTL is 5s).
  useEffect(() => {
    const interval = setInterval(() => load(true), 10000)
    return () => clearInterval(interval)
  }, [load])

  const submitMapping = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (editingId) await hypegpsService.updateMapping(editingId, form)
      else await hypegpsService.createMapping(form)
      toast.success(editingId ? 'Mapping updated' : 'Mapping created')
      setForm(EMPTY_FORM)
      setEditingId(null)
      await load(true)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save mapping')
    } finally {
      setSaving(false)
    }
  }

  const startEdit = (m) => {
    setEditingId(m._id || m.id)
    setForm({ routeId: m.routeId, deviceId: m.deviceId, busNumber: m.busNumber })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setForm(EMPTY_FORM)
  }

  const removeMapping = async (m) => {
    if (!window.confirm(`Delete mapping Route ${m.routeId} → Device ${m.deviceId}?`)) return
    try {
      await hypegpsService.deleteMapping(m._id || m.id)
      toast.success('Mapping deleted')
      await load(true)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete mapping')
    }
  }

  const inputCls = 'w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#40A047]/30 focus:border-[#40A047]'

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      <div className="flex items-start justify-between">
        <PageHeader title="GPS Tracking" subtitle="HypeGPS device status and route mapping" />
        <button onClick={() => load(false)}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors shrink-0">
          <RefreshCw size={14} className="text-[#40A047]" />
          Refresh
        </button>
      </div>

      {/* Device mappings management — works even before HypeGPS is configured */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <RouteIcon size={18} className="text-[#40A047]" />
          <h2 className="text-sm font-bold text-gray-900">Device Mappings</h2>
          <span className="text-xs text-gray-400">(Route → HypeGPS device → Bus)</span>
        </div>

        {mappings.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
                  <th className="px-5 py-3 font-semibold">Route</th>
                  <th className="px-5 py-3 font-semibold">Device ID</th>
                  <th className="px-5 py-3 font-semibold">Bus</th>
                  <th className="px-5 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {mappings.map((m) => (
                  <tr key={m._id || m.id} className="border-b border-gray-50 last:border-0">
                    <td className="px-5 py-3 font-bold text-gray-900">Route {m.routeId}</td>
                    <td className="px-5 py-3 text-gray-600">{m.deviceId}</td>
                    <td className="px-5 py-3 text-gray-600">{m.busNumber}</td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => startEdit(m)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-[#40A047] transition-colors" title="Edit">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => removeMapping(m)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-500 hover:text-red-500 transition-colors" title="Delete">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="px-5 py-4 text-xs text-gray-400">No mappings yet — add one below.</p>
        )}

        {/* Add / edit form */}
        <form onSubmit={submitMapping} className="px-5 py-4 border-t border-gray-100 flex flex-wrap items-end gap-3">
          <div className="min-w-[130px] flex-1">
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Route</label>
            <select value={form.routeId} onChange={(e) => setForm({ ...form, routeId: e.target.value })} required className={inputCls}>
              <option value="">Select route…</option>
              {routes.map((r) => <option key={r.id} value={r.id}>Route {r.id}</option>)}
            </select>
          </div>
          <div className="min-w-[130px] flex-1">
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">HypeGPS Device ID</label>
            <input value={form.deviceId} onChange={(e) => setForm({ ...form, deviceId: e.target.value })} required placeholder="e.g. 1368" className={inputCls} />
          </div>
          <div className="min-w-[160px] flex-1">
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Bus Number</label>
            <input value={form.busNumber} onChange={(e) => setForm({ ...form, busNumber: e.target.value })} required placeholder="e.g. TS 09 AB 1234" className={inputCls} />
          </div>
          <button type="submit" disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-[#40A047] text-white text-sm font-bold rounded-xl hover:bg-[#2d7a33] transition-colors disabled:opacity-60">
            <Plus size={14} />
            {saving ? 'Saving…' : editingId ? 'Update' : 'Add Mapping'}
          </button>
          {editingId && (
            <button type="button" onClick={cancelEdit} className="flex items-center gap-1.5 px-3 py-2.5 text-sm font-semibold text-gray-500 hover:bg-gray-100 rounded-xl transition-colors">
              <X size={14} /> Cancel
            </button>
          )}
        </form>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle size={18} className="text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-red-600">GPS/API ERROR</p>
            <p className="text-xs text-red-500 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {loading && !data && !error && (
        <p className="text-sm text-gray-400">Loading HypeGPS status…</p>
      )}

      {data && (
        <>
          {/* Sync info */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <Satellite size={18} className="text-[#40A047]" />
              <h2 className="text-sm font-bold text-gray-900">Provider Sync</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-xs text-gray-400 mb-1">Status</p>
                <p className={`font-bold ${data.configured ? 'text-emerald-600' : 'text-red-500'}`}>
                  {data.configured ? 'Configured' : 'Not configured'}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">API Host</p>
                <p className="font-semibold text-gray-800">{data.apiHost || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">Group</p>
                <p className="font-semibold text-gray-800">{data.group || 'All devices'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">Last Sync</p>
                <p className="font-semibold text-gray-800">{fmtTime(data.lastSyncAt)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">Cache TTL</p>
                <p className="font-semibold text-gray-800">{data.cacheTtlSeconds}s</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">Stale After</p>
                <p className="font-semibold text-gray-800">{data.staleSeconds}s</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">Devices</p>
                <p className="font-semibold text-gray-800">{data.deviceCount}</p>
              </div>
            </div>
          </div>

          {/* Effective route map */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <RouteIcon size={18} className="text-[#40A047]" />
              <h2 className="text-sm font-bold text-gray-900">Effective Route Map</h2>
            </div>
            {Object.keys(data.routeMap || {}).length === 0 ? (
              <p className="text-xs text-gray-400">No routes mapped to HypeGPS devices yet.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {Object.entries(data.routeMap).map(([routeId, deviceId]) => (
                  <span key={routeId} className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700">
                    Route {routeId} <span className="text-gray-300">→</span> Device {deviceId}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Devices table */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-bold text-gray-900">Devices ({data.devices?.length || 0})</h2>
            </div>
            {data.devices?.length ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
                      <th className="px-5 py-3 font-semibold">Device ID</th>
                      <th className="px-5 py-3 font-semibold">Route</th>
                      <th className="px-5 py-3 font-semibold">Status</th>
                      <th className="px-5 py-3 font-semibold">Latitude</th>
                      <th className="px-5 py-3 font-semibold">Longitude</th>
                      <th className="px-5 py-3 font-semibold">Speed</th>
                      <th className="px-5 py-3 font-semibold">Heading</th>
                      <th className="px-5 py-3 font-semibold">Last Ping</th>
                      <th className="px-5 py-3 font-semibold">Tail Pts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.devices.map((d) => (
                      <tr key={d.gpsDeviceId} className="border-b border-gray-50 last:border-0">
                        <td className="px-5 py-3 font-bold text-gray-900">{d.gpsDeviceId}</td>
                        <td className="px-5 py-3 text-gray-600">{d.routeId ? `Route ${d.routeId}` : '—'}</td>
                        <td className="px-5 py-3"><StatusChip status={d.status} isStale={d.isStale} /></td>
                        <td className="px-5 py-3 text-gray-600">{fmtNum(d.latitude)}</td>
                        <td className="px-5 py-3 text-gray-600">{fmtNum(d.longitude)}</td>
                        <td className="px-5 py-3 text-gray-600">{fmtSpeed(d.speed)}</td>
                        <td className="px-5 py-3 text-gray-600">{d.heading != null ? `${Math.round(d.heading)}°` : '—'}</td>
                        <td className="px-5 py-3 text-gray-600">{fmtTime(d.lastPingAt)}</td>
                        <td className="px-5 py-3 text-gray-600">{d.tailPoints}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="px-5 py-6 text-xs text-gray-400">No devices returned by HypeGPS.</p>
            )}
          </div>
        </>
      )}
    </motion.div>
  )
}
