import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Line, Bar, Doughnut } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, PointElement, LineElement, ArcElement, Title, Tooltip, Legend, Filler } from 'chart.js'
import { analyticsService } from '../../api/services.js'
import PageHeader from '../../components/common/PageHeader.jsx'
import StatCard from '../../components/common/StatCard.jsx'
import { TrendingUp, Users, CreditCard, Bus, Download } from 'lucide-react'
import toast from 'react-hot-toast'

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, ArcElement, Title, Tooltip, Legend, Filler)

const REVENUE_DATA = {
  labels: ['Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'],
  datasets: [{
    label: 'Revenue (₹)',
    data: [2100000, 1800000, 2400000, 1900000, 2200000, 1344000],
    borderColor: '#40A047', backgroundColor: 'rgba(64,160,71,0.1)',
    fill: true, tension: 0.4, pointBackgroundColor: '#40A047', pointRadius: 5
  }]
}

const ENROLLMENT_DATA = {
  labels: ['R1', 'R2', 'R3', 'R4', 'R5', 'R6'],
  datasets: [
    { label: 'Total Seats', data: [40, 40, 40, 40, 40, 40], backgroundColor: '#e5e7eb', borderRadius: 6 },
    { label: 'Booked', data: [35, 38, 22, 33, 25, 18], backgroundColor: '#40A047', borderRadius: 6 },
  ]
}

const DEPT_DATA = {
  labels: ['CSE', 'ECE', 'MECH', 'EEE', 'IT', 'Other'],
  datasets: [{ data: [420, 280, 190, 160, 120, 70], backgroundColor: ['#40A047','#3B82F6','#8B5CF6','#F59E0B','#EF4444','#6B7280'], borderWidth: 0 }]
}

const CHART_OPTS = { responsive: true, plugins: { legend: { display: false }, tooltip: { backgroundColor: '#1a2e1a' } }, scales: { x: { grid: { display: false } }, y: { grid: { color: '#f9fafb' } } } }
const LINE_OPTS = { ...CHART_OPTS, scales: { x: { grid: { display: false } }, y: { grid: { color: '#f9fafb' }, ticks: { callback: v => `₹${(v/100000).toFixed(0)}L` } } } }

export default function AnalyticsPage() {
  const [analytics] = useState({ totalStudents: 1240, totalRevenue: 13440000, activeBuses: 22, routeEfficiency: 97 })

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      <PageHeader title="Analytics" subtitle="Transport system performance insights"
        actions={
          <button onClick={() => toast.success('Report generated!')}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-sm font-semibold rounded-xl hover:bg-gray-50 transition-colors">
            <Download size={14} /> Export Report
          </button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Students" value="1,240" subtitle="Enrolled" icon={Users} trend="+8%" />
        <StatCard title="Annual Revenue" value="₹134.4L" subtitle="This year" icon={CreditCard} iconBg="bg-green-50" iconColor="text-green-600" trend="+12%" />
        <StatCard title="Active Buses" value="22 / 24" subtitle="In service" icon={Bus} iconBg="bg-blue-50" iconColor="text-blue-600" />
        <StatCard title="On-Time Rate" value="97.3%" subtitle="This month" icon={TrendingUp} iconBg="bg-purple-50" iconColor="text-purple-600" trend="+2.1%" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Revenue trend */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <h2 className="text-sm font-bold text-gray-900 mb-4">Monthly Revenue Trend</h2>
          <Line data={REVENUE_DATA} options={LINE_OPTS} height={80} />
        </div>

        {/* Department distribution */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <h2 className="text-sm font-bold text-gray-900 mb-4">Students by Department</h2>
          <div className="flex justify-center mb-4">
            <div style={{ width: 160, height: 160 }}>
              <Doughnut data={DEPT_DATA} options={{ cutout: '65%', plugins: { legend: { display: false } }, responsive: true }} />
            </div>
          </div>
          <div className="space-y-2">
            {DEPT_DATA.labels.map((l, i) => (
              <div key={l} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: DEPT_DATA.datasets[0].backgroundColor[i] }} />
                  <span className="text-xs text-gray-600">{l}</span>
                </div>
                <span className="text-xs font-bold text-gray-900">{DEPT_DATA.datasets[0].data[i]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Route enrollment */}
      <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
        <h2 className="text-sm font-bold text-gray-900 mb-4">Route Enrollment vs Capacity</h2>
        <Bar data={ENROLLMENT_DATA} options={{ ...CHART_OPTS, plugins: { ...CHART_OPTS.plugins, legend: { display: true, position: 'top' } }, scales: { x: { grid: { display: false } }, y: { max: 50, grid: { color: '#f9fafb' } } } }} height={60} />
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Avg Trip Duration', value: '1h 28min', sub: 'Both directions' },
          { label: 'Avg Fuel Efficiency', value: '4.2 km/L', sub: 'Fleet average' },
          { label: 'Monthly Trips', value: '960', sub: 'All routes' },
          { label: 'Complaint Resolution', value: '94%', sub: 'Within 48hrs' },
        ].map((k) => (
          <div key={k.label} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm text-center">
            <p className="text-2xl font-bold text-[#40A047]">{k.value}</p>
            <p className="text-xs font-bold text-gray-700 mt-1">{k.label}</p>
            <p className="text-xs text-gray-400 mt-0.5">{k.sub}</p>
          </div>
        ))}
      </div>
    </motion.div>
  )
}
