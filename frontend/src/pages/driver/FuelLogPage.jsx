import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Line } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js'
import PageHeader from '../../components/common/PageHeader.jsx'
import { MOCK_TRIPS } from '../../utils/helpers.js'
import { Fuel, TrendingDown, Activity, Download } from 'lucide-react'
import toast from 'react-hot-toast'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler)

const FUEL_DATA = {
  labels: ['01 May', '08 May', '15 May', '22 May', '29 May', '05 Jun', '07 Aug'],
  datasets: [{
    label: 'Fuel Consumption (L)',
    data: [95, 102, 89, 110, 87, 101, 96],
    borderColor: '#40A047',
    backgroundColor: 'rgba(64,160,71,0.08)',
    tension: 0.4,
    fill: true,
    pointBackgroundColor: '#40A047',
    pointRadius: 4,
  }]
}

const CHART_OPTIONS = {
  responsive: true,
  plugins: { legend: { display: false }, tooltip: { backgroundColor: '#1a2e1a' } },
  scales: {
    x: { grid: { color: '#f3f4f6' } },
    y: { grid: { color: '#f3f4f6' }, ticks: { callback: v => `${v}L` } }
  }
}

const TRIPS_FUEL = MOCK_TRIPS.filter(t => t.fuelUsed).map(t => ({
  date: t.date, trip: t.routeName, distance: t.distance, fuelUsed: t.fuelUsed, fuelCost: t.fuelCost, avgMileage: t.avgMileage
}))

export default function FuelLogPage() {
  const [tab, setTab] = useState('chart')

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
          { label: 'Total Fuel Used', value: '101 L', icon: Fuel, color: 'text-[#40A047]', bg: 'bg-green-100' },
          { label: 'Total Fuel Cost', value: '₹10,564', icon: TrendingDown, color: 'text-blue-600', bg: 'bg-blue-100' },
          { label: 'Avg Mileage', value: '4.2 km/L', icon: Activity, color: 'text-purple-600', bg: 'bg-purple-100' },
          { label: 'Total Distance', value: '508 km', icon: Activity, color: 'text-orange-600', bg: 'bg-orange-100' },
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
          <Line data={FUEL_DATA} options={CHART_OPTIONS} height={90} />
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
                {TRIPS_FUEL.concat(TRIPS_FUEL).map((t, i) => (
                  <tr key={i} className="border-b border-gray-50 hover:bg-green-50/30">
                    <td className="px-4 py-3 text-gray-600">{t.date}</td>
                    <td className="px-4 py-3 font-medium text-gray-800">{t.trip}</td>
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
          <h2 className="text-sm font-bold text-gray-900 mb-4">Monthly Summary</h2>
          {[
            { month: 'May 2026', trips: 22, fuel: '95L', cost: '₹8,740', mileage: '4.4 km/L' },
            { month: 'Jun 2026', trips: 20, fuel: '101L', cost: '₹9,320', mileage: '4.1 km/L' },
            { month: 'Jul 2026', trips: 21, fuel: '98L', cost: '₹9,056', mileage: '4.3 km/L' },
            { month: 'Aug 2026', trips: 5, fuel: '24L', cost: '₹2,220', mileage: '4.2 km/L' },
          ].map((m, i) => (
            <div key={i} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
              <div>
                <p className="text-sm font-bold text-gray-900">{m.month}</p>
                <p className="text-xs text-gray-500">{m.trips} trips</p>
              </div>
              <div className="grid grid-cols-3 gap-6 text-right">
                <div><p className="text-sm font-bold text-[#40A047]">{m.fuel}</p><p className="text-xs text-gray-400">Fuel</p></div>
                <div><p className="text-sm font-bold text-gray-800">{m.cost}</p><p className="text-xs text-gray-400">Cost</p></div>
                <div><p className="text-sm font-bold text-blue-600">{m.mileage}</p><p className="text-xs text-gray-400">Mileage</p></div>
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  )
}
