import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { bookingService } from '../../api/services.js'
import PageHeader from '../../components/common/PageHeader.jsx'
import SearchInput from '../../components/common/SearchInput.jsx'
import Table from '../../components/common/Table.jsx'
import Pagination from '../../components/common/Pagination.jsx'
import StatusBadge from '../../components/common/StatusBadge.jsx'
import { Download, X } from 'lucide-react'

const MOCK_BOOKINGS = Array.from({ length: 8 }, (_, i) => ({
  _id: String(i), bookingId: `HITAM-${2026}${String(i+1).padStart(4,'0')}`,
  studentName: ['Rahul Sharma','Priya Verma','Amit Patel','Sneha Kumar','Deepika Roy','Venkatesh K','Arjun Reddy','Kavya Sharma'][i],
  studentRollNumber: `21CS10${String(i+1).padStart(2,'0')}`,
  busNumber: `TS 09 AB ${1234 + i * 100}`, routeName: `Route R${(i%6)+1}`,
  seatNumber: i + 5, pickupPoint: ['Main Gate','City Center','LB Nagar','Kukatpally','Miyapur'][i%5],
  paymentStatus: i % 4 === 0 ? 'Pending' : 'Paid (Annual Pass)',
  status: i % 5 === 0 ? 'CANCELLED' : 'CONFIRMED', bookingDate: '03 Aug 2026', amountPaid: 12000,
}))

export default function BookingsPage() {
  const [bookings, setBookings] = useState(MOCK_BOOKINGS)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    bookingService.getAll({ search, status: statusFilter, page, limit: 15 })
      .then(r => { setBookings(r.data.bookings); setPage(r.data.page); setPages(r.data.pages); setTotal(r.data.total) })
      .catch(() => { setBookings(MOCK_BOOKINGS); setTotal(MOCK_BOOKINGS.length) })
  }, [search, statusFilter, page])

  const filtered = bookings.filter(b =>
    b.studentName?.toLowerCase().includes(search.toLowerCase()) ||
    b.studentRollNumber?.toLowerCase().includes(search.toLowerCase()) ||
    b.busNumber?.toLowerCase().includes(search.toLowerCase())
  )

  const cancelBooking = async (bookingId) => {
    if (!confirm('Cancel this booking?')) return
    try {
      await bookingService.cancel(bookingId)
      setBookings(prev => prev.map(b => b.bookingId === bookingId ? { ...b, status: 'CANCELLED' } : b))
      toast.success('Booking cancelled')
    } catch { toast.error('Failed') }
  }

  const columns = [
    { key: 'bookingId', label: 'Booking ID', render: v => <span className="font-mono text-xs">{v}</span> },
    { key: 'studentName', label: 'Student', render: v => <span className="font-semibold">{v}</span> },
    { key: 'studentRollNumber', label: 'Roll No.' },
    { key: 'busNumber', label: 'Bus' },
    { key: 'routeName', label: 'Route' },
    { key: 'seatNumber', label: 'Seat' },
    { key: 'pickupPoint', label: 'Pickup' },
    { key: 'paymentStatus', label: 'Payment', render: v => <span className={`text-xs font-semibold ${v?.includes('Paid') ? 'text-green-600' : 'text-yellow-600'}`}>{v}</span> },
    { key: 'status', label: 'Status', render: v => <StatusBadge status={v} /> },
    { key: 'bookingDate', label: 'Date' },
    { key: '_id', label: '', render: (_, row) => row.status === 'CONFIRMED' ? (
      <button onClick={() => cancelBooking(row.bookingId)} className="p-1.5 hover:bg-red-50 rounded-lg"><X size={14} className="text-red-400" /></button>
    ) : null }
  ]

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      <PageHeader title="Bookings" subtitle={`${total || filtered.length} total bookings`}
        actions={
          <button onClick={() => toast.success('Exporting...')} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-sm font-semibold rounded-xl hover:bg-gray-50 transition-colors">
            <Download size={14} /> Export
          </button>
        }
      />

      <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <SearchInput value={search} onChange={v => { setSearch(v); setPage(1) }} placeholder="Search by student, roll number or bus..." className="flex-1" />
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#40A047]/30 focus:border-[#40A047]">
            <option value="">All Status</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="PENDING">Pending</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
        <Table columns={columns} data={filtered} emptyMessage="No bookings found" />
        <Pagination page={page} pages={pages} total={total || filtered.length} onPage={setPage} />
      </div>
    </motion.div>
  )
}
