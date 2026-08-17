import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { analyticsService, bookingService, paymentService, userService, routeService, complaintService } from '../../api/services.js'
import PageHeader from '../../components/common/PageHeader.jsx'
import { Download, FileText, Users, Bus, CreditCard, BarChart2 } from 'lucide-react'

const REPORTS = [
  { title: 'Student Enrollment Report', desc: 'Complete list of enrolled students with route and payment details', icon: Users, color: 'bg-blue-50 text-blue-600', key: 'students' },
  { title: 'Driver Performance Report', desc: 'Trip completion rates, on-time performance, fuel usage', icon: Bus, color: 'bg-green-50 text-green-600', key: 'drivers' },
  { title: 'Revenue Collection Report', desc: 'Fee collection summary, pending dues, route-wise revenue', icon: CreditCard, color: 'bg-purple-50 text-purple-600', key: 'payments' },
  { title: 'Bookings Summary Report', desc: 'All bookings with seat, route, payment and validity details', icon: FileText, color: 'bg-orange-50 text-orange-600', key: 'bookings' },
  { title: 'Route Efficiency Report', desc: 'Occupancy rates, route-wise performance metrics', icon: BarChart2, color: 'bg-pink-50 text-pink-600', key: 'routes' },
  { title: 'Complaint Analysis Report', desc: 'Complaint categories, resolution time, patterns', icon: FileText, color: 'bg-red-50 text-red-600', key: 'complaints' },
]

const csv = (rows) => {
  const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
  return rows.map(r => r.map(escape).join(',')).join('\n')
}

const downloadCsv = (filename, content) => {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export default function ReportsPage() {
  const [dateFrom, setDateFrom] = useState('2026-05-01')
  const [dateTo, setDateTo] = useState('2026-12-31')
  const [summary, setSummary] = useState(null)
  const [generated, setGenerated] = useState(false)

  const refreshSummary = async () => {
    try {
      const [d, students, drivers, bookings, payments] = await Promise.all([
        analyticsService.getDashboard(),
        userService.getAll({ role: 'STUDENT', limit: 1 }),
        userService.getAll({ role: 'DRIVER', limit: 1 }),
        bookingService.getAll({ limit: 1 }),
        paymentService.getAll({ limit: 1 }),
      ])
      setSummary({ ...d.data, totalStudents: students.data.total, totalDrivers: drivers.data.total, totalBookings: bookings.data.total, totalPayments: payments.data.total })
      return true
    } catch {
      return false
    }
  }

  const generateReport = async (key) => {
    const ok = summary ? true : await refreshSummary()
    if (!ok) { toast.error('Could not load report data'); return }

    try {
      if (key === 'students') {
        const r = await userService.getAll({ role: 'STUDENT', limit: 500 })
        downloadCsv('students-enrollment.csv', csv([
          ['Roll No', 'Name', 'Department', 'Year', 'Route', 'Phone', 'Fee Paid'],
          ...r.data.users.map(u => [u.rollNumber, u.name, u.department, u.year, u.assignedRouteId, u.phone, u.transportFeePaid ? 'Yes' : 'No']),
        ]))
      } else if (key === 'drivers') {
        const r = await userService.getAll({ role: 'DRIVER', limit: 100 })
        downloadCsv('drivers.csv', csv([
          ['Driver ID', 'Name', 'Phone', 'Bus', 'Route', 'License', 'Experience'],
          ...r.data.users.map(u => [u.rollNumber, u.name, u.phone, u.assignedBusNumber, u.assignedRouteId, u.licenseNo, u.experience]),
        ]))
      } else if (key === 'payments') {
        const r = await paymentService.getAll({ limit: 500 })
        downloadCsv('payments.csv', csv([
          ['Payment ID', 'Student', 'Roll No', 'Route', 'Amount', 'Method', 'Status', 'Date'],
          ...r.data.payments.map(p => [p.paymentId, p.studentName, p.studentRollNumber, p.routeId, p.amount, p.method, p.status, p.date]),
        ]))
      } else if (key === 'bookings') {
        const r = await bookingService.getAll({ limit: 500 })
        downloadCsv('bookings.csv', csv([
          ['Booking ID', 'Student', 'Roll No', 'Route', 'Bus', 'Seat', 'Payment', 'Status', 'Date'],
          ...r.data.bookings.map(b => [b.bookingId, b.studentName, b.studentRollNumber, b.routeId, b.busNumber, b.seatNumber, b.paymentStatus, b.status, b.bookingDate]),
        ]))
      } else if (key === 'routes') {
        const r = await routeService.getAll()
        downloadCsv('routes.csv', csv([
          ['Route', 'Name', 'Bus', 'Total Seats', 'Booked Seats', 'Occupancy %', 'Fee'],
          ...r.data.map(x => [x.id, x.name, x.busNumber, x.totalSeats, x.bookedSeats, x.totalSeats ? Math.round((x.bookedSeats / x.totalSeats) * 100) : 0, x.feeAmount]),
        ]))
      } else {
        const r = await complaintService.getAll()
        downloadCsv('complaints.csv', csv([
          ['Complaint ID', 'Student', 'Roll No', 'Category', 'Status', 'Date'],
          ...r.data.complaints.map(c => [c.complaintId, c.studentName, c.studentRollNumber, c.category, c.status, c.date]),
        ]))
      }
      toast.success('Report downloaded')
    } catch {
      toast.error('Failed to generate report')
    }
  }

  const generateAll = async () => {
    const ok = await refreshSummary()
    if (!ok) { toast.error('Could not load summary'); return }
    setGenerated(true)
    toast.success('Live summary generated from database')
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      <PageHeader title="Reports" subtitle="Generate and download system reports from live data" />

      {/* Date filter */}
      <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
        <h2 className="text-sm font-bold text-gray-900 mb-4">Report Date Range</h2>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <label className="block text-xs font-semibold text-gray-500 mb-1">From Date</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#40A047]/30 focus:border-[#40A047]" />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-semibold text-gray-500 mb-1">To Date</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#40A047]/30 focus:border-[#40A047]" />
          </div>
          <div className="flex items-end gap-2">
            <button onClick={generateAll}
              className="px-5 py-2.5 bg-[#40A047] text-white text-sm font-bold rounded-xl hover:bg-[#2d7a33] transition-colors">
              Generate Summary
            </button>
          </div>
        </div>

        {generated && summary && (
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              ['Students', summary.totalStudents],
              ['Drivers', summary.totalDrivers],
              ['Buses', summary.totalBuses],
              ['Bookings', summary.totalBookings],
              ['Payments', summary.totalPayments],
              ['Revenue', `₹${((summary.totalRevenue || 0) / 100000).toFixed(1)}L`],
            ].map(([label, value]) => (
              <div key={label} className="p-3 bg-green-50 rounded-xl text-center border border-green-100">
                <p className="text-lg font-bold text-[#40A047]">{value}</p>
                <p className="text-xs text-gray-500">{label}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Report types */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {REPORTS.map((r, i) => (
          <motion.div key={r.title} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${r.color}`}>
              <r.icon size={22} />
            </div>
            <p className="text-sm font-bold text-gray-900 mb-1">{r.title}</p>
            <p className="text-xs text-gray-500 mb-4 leading-relaxed">{r.desc}</p>
            <div className="flex gap-2">
              <button onClick={() => generateReport(r.key)}
                className="flex-1 py-2 text-xs font-bold text-[#40A047] border-2 border-[#40A047] rounded-xl hover:bg-green-50 transition-colors flex items-center justify-center gap-1">
                <Download size={12} /> CSV
              </button>
              <button onClick={() => generateReport(r.key)}
                className="flex-1 py-2 text-xs font-bold text-blue-600 border-2 border-blue-200 rounded-xl hover:bg-blue-50 transition-colors flex items-center justify-center gap-1">
                <Download size={12} /> Export
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}
