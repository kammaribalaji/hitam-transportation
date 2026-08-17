import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Line, Bar } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js'
import { analyticsService, userService } from '../../api/services.js'
import { useAuth } from '../../hooks/useAuth.js'
import {
  Users, Bus, TrendingUp, IndianRupee,
  AlertTriangle, UserCheck, ArrowUpRight,
  ArrowDownRight, Calendar
} from 'lucide-react'

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend, Filler)

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
  const [data, setData] = useState(null)
  const [revenue, setRevenue] = useState([])
  const [recentStudents, setRecentStudents] = useState([])
  const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })

  useEffect(() => {
    analyticsService.getDashboard().then(r => setData(r.data)).catch(() => setData(null))
    analyticsService.getRevenue().then(r => setRevenue(r.data || [])).catch(() => {})
    userService.getAll({ role: 'STUDENT', limit: 5 }).then(r => setRecentStudents(r.data.users || [])).catch(() => {})
  }, [])

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

  const bookingsOverviewData = {
    labels: revenue.map(r => r.label),
    datasets: [
      { label: 'Bookings', data: revenue.map(r => r.bookings), borderColor: '#40A047', backgroundColor: 'rgba(64,160,71,0.08)', fill: true, tension: 0.4, pointRadius: 3, pointBackgroundColor: '#40A047', borderWidth: 2 },
    ]
  }

  const revenueData = {
    labels: revenue.map(r => r.label),
    datasets: [
      { label: 'Revenue', data: revenue.map(r => r.revenue), backgroundColor: '#40A047', borderRadius: 4, borderSkipped: false },
    ]
  }

  const routeOccupancy = data?.routeOccupancy || []
  const topRoutes = routeOccupancy.slice(0, 3).map(r => ({
    route: `${r.routeId} – ${r.routeName || ''}`.trim(),
    bookings: r.bookedSeats,
    pct: r.occupancy,
  }))

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

      {!data ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-10 h-10 border-3 border-[#40A047] border-t-transparent rounded-full animate-spin" style={{ borderWidth: 3 }} />
        </div>
      ) : (
        <>
          {/* 4 Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard title="Total Students" value={data.totalStudents} sub="Registered" subValue={data.totalStudents} icon={Users} iconBg="bg-[#40A047]" trend="up" trendVal="+12.5%" />
            <MetricCard title="Total Drivers" value={data.totalDrivers} sub="Active" subValue={data.totalDrivers} icon={UserCheck} iconBg="bg-blue-500" trend="up" trendVal="+5.4%" />
            <MetricCard title="Total Buses" value={data.totalBuses} sub="In fleet" subValue={data.totalBuses} icon={Bus} iconBg="bg-purple-500" trend="up" trendVal="+10.2%" />
            <MetricCard title="Total Revenue" value={'₹' + (data.totalRevenue / 100000).toFixed(2) + 'L'} sub="Paid bookings" subValue={data.paidBookings} icon={IndianRupee} iconBg="bg-orange-500" trend="up" trendVal="+10.2%" />
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Bookings Overview Chart */}
            <div className="lg:col-span-2 bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-sm font-bold text-gray-900">Bookings Overview</h2>
                  <div className="flex items-center gap-4 mt-1">
                    <div className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-[#40A047] rounded-full inline-block" /><span className="text-xs text-gray-500">Monthly bookings</span></div>
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
              { label: "Today's Trips", value: data.todayTrips, sub: 'Active + upcoming', color: 'text-[#40A047]' },
              { label: 'Total Bookings', value: data.totalBookings, sub: 'Active passes', color: 'text-blue-600' },
              { label: 'Occupancy Rate', value: `${routeOccupancy.length ? Math.round(routeOccupancy.reduce((s, r) => s + r.occupancy, 0) / routeOccupancy.length) : 0}%`, sub: 'Across routes', color: 'text-purple-600' },
              { label: 'Open Complaints', value: data.openComplaints, sub: 'Needs action', color: 'text-red-500' },
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
                    {recentStudents.length === 0 && (
                      <tr><td colSpan={6} className="px-4 py-8 text-center text-xs text-gray-400">No students yet</td></tr>
                    )}
                    {recentStudents.map((s, i) => (
                      <tr key={s.rollNumber || i} className="border-b border-gray-50 hover:bg-green-50/30 transition-colors">
                        <td className="px-4 py-3 text-xs text-gray-400">{i + 1}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 bg-green-100 rounded-full flex items-center justify-center text-[#40A047] font-bold text-xs flex-shrink-0">{s.name?.[0]}</div>
                            <span className="text-xs font-semibold text-gray-800 whitespace-nowrap">{s.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600 font-mono">{s.rollNumber}</td>
                        <td className="px-4 py-3 text-xs text-gray-600">{s.department}</td>
                        <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{s.phone || '—'}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${s.transportFeePaid ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{s.transportFeePaid ? 'Active' : 'Fee Pending'}</span>
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
                {topRoutes.length === 0 && <p className="text-xs text-gray-400">No route data yet</p>}
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
                <h3 className="text-xs font-bold text-gray-900 mb-3">Route Occupancy</h3>
                <div style={{ height: 100 }}>
                  <Bar
                    data={{ labels: routeOccupancy.map(r => r.routeId), datasets: [{ data: routeOccupancy.map(r => r.occupancy), backgroundColor: '#40A047', borderRadius: 4 }] }}
                    options={{ ...barOpts, scales: { x: { grid: { display: false }, ticks: { font: { size: 9 } } }, y: { grid: { color: '#f1f5f9' }, max: 100, ticks: { font: { size: 9 } } } }, plugins: { legend: { display: false } } }}
                  />
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </motion.div>
  )
}
