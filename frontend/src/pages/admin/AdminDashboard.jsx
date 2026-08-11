import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Line, Bar } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js'
import { analyticsService } from '../../api/services.js'
import { useAuth } from '../../hooks/useAuth.js'
import {
  Users, Bus, TrendingUp, IndianRupee, Route,
  AlertTriangle, UserCheck, BookOpen, ArrowUpRight,
  ArrowDownRight, Calendar
} from 'lucide-react'

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend, Filler)

const ANALYTICS = {
  totalStudents: 2458, activeStudents: 2301, inactiveStudents: 157, newStudentsToday: 85,
  totalDrivers: 156, activeDrivers: 142, inactiveDrivers: 14, newDriversToday: 98,
  totalBuses: 48, activeBuses: 40, maintenance: 4, inactive: 4,
  totalRevenue: 1345600, lastMonthRevenue: 1245800, bookingsThisMonth: 2145,
  todayTrips: 125, activeTrips: 40, occupancyRate: 76, pendingComplaints: 8,
}

const bookingsOverviewData = {
  labels: ['27','28','29','30','31','1','2','3','4','5','6','7'],
  datasets: [
    { label: 'This Month', data: [45,62,48,70,55,80,65,72,58,85,68,75], borderColor: '#40A047', backgroundColor: 'rgba(64,160,71,0.08)', fill: true, tension: 0.4, pointRadius: 3, pointBackgroundColor: '#40A047', borderWidth: 2 },
    { label: 'Last Month', data: [35,50,42,60,48,68,55,62,50,72,58,65], borderColor: '#94a3b8', backgroundColor: 'transparent', fill: false, tension: 0.4, pointRadius: 0, borderWidth: 1.5, borderDash: [4,4] },
  ]
}

const revenueData = {
  labels: ['27','28','29','30','31','1','2','3','4','5','6','7'],
  datasets: [
    { label: 'Revenue', data: [120,180,140,200,160,240,190,215,170,250,200,220], backgroundColor: '#40A047', borderRadius: 4, borderSkipped: false },
  ]
}

const topRoutes = [
  { route: 'R1 – Main Campus to City Center', bookings: 245, pct: 85 },
  { route: 'R2 – Main Campus to Kukatpally', bookings: 210, pct: 72 },
  { route: 'R3 – Main Campus to Miyapur', bookings: 180, pct: 62 },
]

const RECENT_STUDENTS = [
  { name: 'Rahul Sharma', roll: '21CS1001', dept: 'CSE', phone: '+91 9876543210', status: 'Active' },
  { name: 'Priya Verma', roll: '21ECE045', dept: 'ECE', phone: '+91 8765432109', status: 'Active' },
  { name: 'Amit Patel', roll: '21ME012', dept: 'MECH', phone: '+91 7654321098', status: 'Active' },
  { name: 'Sneha Kumar', roll: '21EEE088', dept: 'EEE', phone: '+91 6543210987', status: 'Inactive' },
  { name: 'Deepika Roy', roll: '21CS1089', dept: 'CSE', phone: '+91 5432109876', status: 'Active' },
]

function MetricCard({ title, value, sub, subValue, icon: Icon, iconBg, trend, trendVal }) {
  const up = trend === 'up'
  return (
    <motion.div whileHover={{ y: -1 }} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconBg}`}>
          <Icon size={20} className="text-white" />
        </div>
        <span className={`flex items-center gap-0.5 text-xs font-semibold ${up ? 'text-green-600' : 'text-red-500'}`}>
          {up ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
          {trendVal}
        </span>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value?.toLocaleString()}</p>
      <p className="text-xs text-gray-500 mt-0.5">{title}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}: <span className="font-semibold text-gray-600">{subValue}</span></p>}
    </motion.div>
  )
}

export default function AdminDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [data] = useState(ANALYTICS)
  const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })

  const lineOpts = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { backgroundColor: '#1B2D1B', padding: 10, cornerRadius: 8 } },
    scales: {
      x: { grid: { display: false }, ticks: { font: { size: 10 }, color: '#94a3b8' } },
      y: { grid: { color: '#f1f5f9' }, ticks: { font: { size: 10 }, color: '#94a3b8' } }
    }
  }
  const barOpts = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { backgroundColor: '#1B2D1B', padding: 10, cornerRadius: 8 } },
    scales: {
      x: { grid: { display: false }, ticks: { font: { size: 10 }, color: '#94a3b8' } },
      y: { grid: { color: '#f1f5f9' }, ticks: { font: { size: 10 }, color: '#94a3b8', callback: v => `₹${v}` } }
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Welcome back, {user?.name?.split(' ')[0] || 'Admin'}! 👋</h1>
          <p className="text-xs text-gray-500 mt-0.5">Here's a summary of your transport system today.</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500 bg-white px-3 py-2 rounded-lg border border-gray-200 w-fit">
          <Calendar size={13} className="text-[#40A047]" />
          {today}
        </div>
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Total Students" value={data.totalStudents} sub="Active" subValue={data.activeStudents} icon={Users} iconBg="bg-[#40A047]" trend="up" trendVal="+12.5%" />
        <MetricCard title="Total Drivers" value={data.totalDrivers} sub="Active" subValue={data.activeDrivers} icon={UserCheck} iconBg="bg-blue-500" trend="up" trendVal="+5.4%" />
        <MetricCard title="Total Buses" value={data.totalBuses} sub="Active" subValue={data.activeBuses} icon={Bus} iconBg="bg-purple-500" trend="up" trendVal="+10.2%" />
        <MetricCard title="Total Revenue" value={'₹' + (data.totalRevenue / 100000).toFixed(2) + 'L'} sub="Bookings" subValue={data.bookingsThisMonth} icon={IndianRupee} iconBg="bg-orange-500" trend="up" trendVal="+10.2%" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Bookings Overview Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-gray-900">Bookings Overview</h2>
              <div className="flex items-center gap-4 mt-1">
                <div className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-[#40A047] rounded-full inline-block" /><span className="text-xs text-gray-500">This Month</span></div>
                <div className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-gray-300 rounded-full inline-block" /><span className="text-xs text-gray-500">Last Month</span></div>
              </div>
            </div>
          </div>
          <div style={{ height: 180 }}>
            <Line data={bookingsOverviewData} options={lineOpts} />
          </div>
        </div>

        {/* Revenue Chart */}
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <h2 className="text-sm font-bold text-gray-900 mb-4">Revenue Overview</h2>
          <div style={{ height: 180 }}>
            <Bar data={revenueData} options={barOpts} />
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Today's Trip", value: data.todayTrips, sub: '+14.6%', color: 'text-[#40A047]' },
          { label: 'Active Buses', value: `${data.activeBuses} / ${data.totalBuses}`, sub: '+4.7%', color: 'text-blue-600' },
          { label: 'Occupancy Rate', value: `${data.occupancyRate}%`, sub: '+8.1%', color: 'text-purple-600' },
          { label: 'Pending Complaints', value: data.pendingComplaints, sub: '-20%', color: 'text-red-500' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <p className="text-xs text-gray-500 mb-1">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-400 mt-1 flex items-center gap-0.5">
              <ArrowUpRight size={11} className="text-green-500" /> {s.sub}
            </p>
          </div>
        ))}
      </div>

      {/* Students Table + Top Routes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent Students */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-bold text-gray-900">Recent Students</h2>
            <button onClick={() => navigate('/admin/students')} className="text-xs text-[#40A047] font-semibold hover:underline">View All</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="bg-gray-50 border-b border-gray-100">
                {['#', 'Name', 'Roll No.', 'Department', 'Phone', 'Status'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {RECENT_STUDENTS.map((s, i) => (
                  <tr key={i} className="border-b border-gray-50 hover:bg-green-50/30 transition-colors">
                    <td className="px-4 py-3 text-xs text-gray-400">{i + 1}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-green-100 rounded-full flex items-center justify-center text-[#40A047] font-bold text-xs flex-shrink-0">{s.name[0]}</div>
                        <span className="text-xs font-semibold text-gray-800 whitespace-nowrap">{s.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600 font-mono">{s.roll}</td>
                    <td className="px-4 py-3 text-xs text-gray-600">{s.dept}</td>
                    <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{s.phone}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${s.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{s.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Routes */}
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-gray-900">Top Routes (By Bookings)</h2>
          </div>
          <div className="space-y-4">
            {topRoutes.map((r, i) => (
              <div key={i}>
                <div className="flex justify-between items-center mb-1">
                  <p className="text-xs font-medium text-gray-700 truncate pr-2">{r.route}</p>
                  <p className="text-xs font-bold text-[#40A047] whitespace-nowrap">{r.bookings}</p>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-[#40A047] rounded-full transition-all duration-700" style={{ width: `${r.pct}%` }} />
                </div>
                <p className="text-[10px] text-gray-400 mt-0.5">{r.pct}% capacity</p>
              </div>
            ))}
          </div>

          {/* Bus Utilization */}
          <div className="mt-5 pt-4 border-t border-gray-100">
            <h3 className="text-xs font-bold text-gray-900 mb-3">Bus Utilization</h3>
            <div style={{ height: 100 }}>
              <Bar
                data={{ labels: ['R1','R2','R3','R4','R5','R6'], datasets: [{ data: [85,72,62,78,55,45], backgroundColor: '#40A047', borderRadius: 4 }] }}
                options={{ ...barOpts, scales: { x: { grid: { display: false }, ticks: { font: { size: 9 } } }, y: { grid: { color: '#f1f5f9' }, max: 100, ticks: { font: { size: 9 } } } }, plugins: { legend: { display: false } } }}
              />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
