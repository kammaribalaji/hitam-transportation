import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Line } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js'
import PageHeader from '../../components/common/PageHeader.jsx'
import { tripService } from '../../api/services.js'
import { Fuel, TrendingDown, Activity, Download } from 'lucide-react'
import toast from 'react-hot-toast'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler)

const CHART_OPTIONS = {
  responsive: true,
  plugins: { legend: { display: false }, tooltip: { backgroundColor: '#1a2e1a' } },
  scales: {
    x: { grid: { color: '#f3f4f6' } },
    y: { grid: { color: '#f3f4f6' }, ticks: { callback: v => `${v}L` } }
  }
}

const parseNum = (str) => {
  const m = String(str || '').match(/[\d.]+/)
  return m ? parseFloat(m[0]) : 0
}

export default function FuelLogPage() {
  const [tab, setTab] = useState('chart')
  const [trips, setTrips] = useState([])

  useEffect(() => {
    tripService.getMy().then(r => setTrips(r.data || [])).catch(() => {})
  }, [])

  const tripsFuel = trips.filter(t => t.fuelUsed)

  const totalFuel = tripsFuel.reduce((s, t) => s + parseNum(t.fuelUsed), 0)
  const totalCost = tripsFuel.reduce((s, t) => s + parseNum(t.fuelCost), 0)
  const totalDistance = tripsFuel.reduce((s, t) => s + parseNum(t.distance), 0)
  const avgMileage = totalFuel > 0 ? (totalDistance / totalFuel).toFixed(1) : '0'

  const fuelData = {
    labels: tripsFuel.map(t => t.date).reverse() || [],
    datasets: [{
      label: 'Fuel Consumption (L)',
      data: tripsFuel.map(t => parseNum(t.fuelUsed)).reverse() || [0],
      borderColor: '#40A047',
      backgroundColor: 'rgba(64,160,71,0.08)',
      tension: 0.4,
      fill: true,
      pointBackgroundColor: '#40A047',
      pointRadius: 4,
    }]
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      <PageHeader title="Fuel & Trip History" subtitle="Track fuel consumption and trip records"
        actions={
          <button onClick={() => toast.success('Report exported!')}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-sm font-semibold rounded-xl hover:bg-gray-50 transition-colors">
            <Download size={14} /> Export
          </button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Fuel Used', value: `${totalFuel} L`, icon: Fuel, color: 'text-[#40A047]', bg: 'bg-green-100' },
          { label: 'Total Fuel Cost', value: `₹${totalCost.toLocaleString('en-IN')}`, icon: TrendingDown, color: 'text-blue-600', bg: 'bg-blue-100' },
          { label: 'Avg Mileage', value: `${avgMileage} km/L`, icon: Activity, color: 'text-purple-600', bg: 'bg-purple-100' },
          { label: 'Total Distance', value: `${totalDistance} km`, icon: Activity, color: 'text-orange-600', bg: 'bg-orange-100' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${bg}`}>
              <Icon size={17} className={color} />
            </div>
            <p className="text-xs text-gray-500">{label}</p>
            <p className="text-xl font-bold text-gray-900 mt-0.5">{value}</p>
          </div>
        ))}
      </div>

      {/* Tab toggle */}
      <div className="flex gap-2 p-1 bg-white rounded-xl border border-gray-100 w-fit shadow-sm">
        {['chart', 'history', 'summary'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold capitalize transition-all ${tab === t ? 'bg-[#40A047] text-white' : 'text-gray-600 hover:text-gray-900'}`}>
            {t === 'chart' ? 'Fuel Usage' : t === 'history' ? 'Trip History' : 'Summary'}
          </button>
        ))}
      </div>

      {tab === 'chart' && (
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <h2 className="text-sm font-bold text-gray-900 mb-4">Fuel Consumption (Liters)</h2>
          {tripsFuel.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-10">No fuel data yet. Completed trips with fuel logs will appear here.</p>
          ) : (
            <Line data={fuelData} options={CHART_OPTIONS} height={90} />
          )}
        </div>
      )}

      {tab === 'history' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="bg-gray-50 border-b border-gray-100">
                {['Date', 'Trip', 'Distance', 'Fuel Used', 'Fuel Cost', 'Avg Mileage'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {tripsFuel.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No fuel logs yet</td></tr>
                )}
                {tripsFuel.map((t, i) => (
                  <tr key={t.tripId || i} className="border-b border-gray-50 hover:bg-green-50/30">
                    <td className="px-4 py-3 text-gray-600">{t.date}</td>
                    <td className="px-4 py-3 font-medium text-gray-800">{t.routeName}</td>
                    <td className="px-4 py-3 text-gray-600">{t.distance}</td>
                    <td className="px-4 py-3 font-semibold text-[#40A047]">{t.fuelUsed}</td>
                    <td className="px-4 py-3 text-gray-700">{t.fuelCost}</td>
                    <td className="px-4 py-3 text-gray-600">{t.avgMileage}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'summary' && (
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <h2 className="text-sm font-bold text-gray-900 mb-4">Trip Summary (from completed trips)</h2>
          <div className="space-y-2.5">
            {tripsFuel.map((m, i) => (
              <div key={m.tripId || i} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                <div>
                  <p className="text-sm font-bold text-gray-900">{m.routeName}</p>
                  <p className="text-xs text-gray-500">{m.date} · {m.startTime} – {m.endTime}</p>
                </div>
                <div className="grid grid-cols-3 gap-6 text-right">
                  <div><p className="text-sm font-bold text-[#40A047]">{m.fuelUsed}</p><p className="text-xs text-gray-400">Fuel</p></div>
                  <div><p className="text-sm font-bold text-gray-800">{m.fuelCost}</p><p className="text-xs text-gray-400">Cost</p></div>
                  <div><p className="text-sm font-bold text-blue-600">{m.avgMileage}</p><p className="text-xs text-gray-400">Mileage</p></div>
                </div>
              </div>
            ))}
            {tripsFuel.length === 0 && <p className="text-center text-sm text-gray-400 py-6">No completed trips with fuel data yet.</p>}
          </div>
        </div>
      )}
    </motion.div>
  )
}
