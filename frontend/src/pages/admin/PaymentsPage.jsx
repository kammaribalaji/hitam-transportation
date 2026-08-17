import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { paymentService } from '../../api/services.js'
import PageHeader from '../../components/common/PageHeader.jsx'
import SearchInput from '../../components/common/SearchInput.jsx'
import Table from '../../components/common/Table.jsx'
import StatCard from '../../components/common/StatCard.jsx'
import { Download, CreditCard, TrendingUp, IndianRupee, CheckCircle } from 'lucide-react'

export default function PaymentsPage() {
  const [payments, setPayments] = useState([])
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    paymentService.getAll({ search, page, limit: 15 })
      .then(r => { setPayments(r.data.payments || []); setPage(r.data.page); setPages(r.data.pages); setTotal(r.data.total) })
      .catch(() => { setPayments([]); setTotal(0) })
  }, [search, page])

  const filtered = payments

  const totalRevenue = payments.filter(p => p.status === 'PAID').reduce((s, p) => s + p.amount, 0)
  const paidCount = payments.filter(p => p.status === 'PAID').length
  const pendingCount = payments.filter(p => p.status === 'PENDING').length

  const columns = [
    { key: 'paymentId', label: 'Payment ID', render: v => <span className="font-mono text-xs text-gray-600">{v}</span> },
    { key: 'studentName', label: 'Student', render: v => <span className="font-semibold">{v}</span> },
    { key: 'studentRollNumber', label: 'Roll No.' },
    { key: 'routeId', label: 'Route' },
    { key: 'amount', label: 'Amount', render: v => <span className="font-bold text-[#40A047]">₹{Number(v || 0).toLocaleString('en-IN')}</span> },
    { key: 'method', label: 'Method' },
    { key: 'date', label: 'Date' },
    { key: 'validTill', label: 'Valid Till' },
    { key: 'status', label: 'Status', render: v => (
      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${v === 'PAID' ? 'bg-green-100 text-green-700' : v === 'PENDING' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'}`}>
        {v === 'PAID' && <CheckCircle size={10} />} {v}
      </span>
    )},
  ]

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      <PageHeader title="Payments" subtitle="Annual transport fee collection"
        actions={
          <button onClick={() => toast.success('Exporting...')} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-sm font-semibold rounded-xl hover:bg-gray-50 transition-colors">
            <Download size={14} /> Export
          </button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Revenue" value={`₹${(totalRevenue / 100000).toFixed(2)}L`} subtitle={`${total} records`} icon={IndianRupee} trend="+12%" />
        <StatCard title="Paid" value={String(paidCount)} subtitle="Students" icon={CheckCircle} iconBg="bg-green-50" iconColor="text-green-600" />
        <StatCard title="Pending" value={String(pendingCount)} subtitle="Due" icon={CreditCard} iconBg="bg-yellow-50" iconColor="text-yellow-600" />
        <StatCard title="Collection Rate" value={`${payments.length ? Math.round((paidCount / payments.length) * 100) : 0}%`} subtitle="This year" icon={TrendingUp} iconBg="bg-blue-50" iconColor="text-blue-600" />
      </div>

      <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
        <SearchInput value={search} onChange={v => { setSearch(v); setPage(1) }} placeholder="Search by student name, roll number or payment ID..." className="mb-5" />
        <Table columns={columns} data={filtered} emptyMessage="No payment records found" />
        <div className="flex items-center justify-between mt-4">
          <p className="text-xs text-gray-400">Page {page} of {Math.max(pages, 1)}</p>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-4 py-2 text-xs font-bold bg-white border border-gray-200 rounded-xl disabled:opacity-40 hover:bg-gray-50">Prev</button>
            <button disabled={page >= pages} onClick={() => setPage(p => p + 1)} className="px-4 py-2 text-xs font-bold bg-white border border-gray-200 rounded-xl disabled:opacity-40 hover:bg-gray-50">Next</button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
