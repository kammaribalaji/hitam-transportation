import React, { useState } from 'react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import PageHeader from '../../components/common/PageHeader.jsx'
import SearchInput from '../../components/common/SearchInput.jsx'
import Table from '../../components/common/Table.jsx'
import StatCard from '../../components/common/StatCard.jsx'
import { Download, CreditCard, TrendingUp, IndianRupee, CheckCircle } from 'lucide-react'

const MOCK_PAYMENTS = Array.from({ length: 10 }, (_, i) => ({
  _id: String(i), txnId: `TXN${String(Date.now()).slice(-8)}${i}`,
  studentName: ['Rahul Sharma','Priya Verma','Amit Patel','Sneha Kumar','Deepika Roy','Venkatesh K','Arjun Reddy','Kavya Sharma','Ravi Teja','Lakshmi Devi'][i],
  rollNumber: `21CS10${String(i+1).padStart(2,'0')}`,
  route: `Route R${(i%6)+1}`, amount: [12000,11500,12500,13000,11000,13500,12000,11500,12000,13000][i],
  method: ['UPI','Card','Net Banking','Wallet','UPI','Card','UPI','Net Banking','Wallet','UPI'][i],
  status: i % 7 === 0 ? 'PENDING' : 'PAID', date: `${String(i+1).padStart(2,'0')} Aug 2026`,
  validTill: `${String(i+1).padStart(2,'0')} Aug 2027`
}))

export default function PaymentsPage() {
  const [payments] = useState(MOCK_PAYMENTS)
  const [search, setSearch] = useState('')

  const filtered = payments.filter(p =>
    p.studentName?.toLowerCase().includes(search.toLowerCase()) ||
    p.rollNumber?.toLowerCase().includes(search.toLowerCase()) ||
    p.txnId?.toLowerCase().includes(search.toLowerCase())
  )

  const totalRevenue = payments.filter(p => p.status === 'PAID').reduce((s, p) => s + p.amount, 0)
  const paidCount = payments.filter(p => p.status === 'PAID').length
  const pendingCount = payments.filter(p => p.status === 'PENDING').length

  const columns = [
    { key: 'txnId', label: 'Transaction ID', render: v => <span className="font-mono text-xs text-gray-600">{v}</span> },
    { key: 'studentName', label: 'Student', render: v => <span className="font-semibold">{v}</span> },
    { key: 'rollNumber', label: 'Roll No.' },
    { key: 'route', label: 'Route' },
    { key: 'amount', label: 'Amount', render: v => <span className="font-bold text-[#40A047]">₹{v.toLocaleString()}</span> },
    { key: 'method', label: 'Method' },
    { key: 'date', label: 'Date' },
    { key: 'validTill', label: 'Valid Till' },
    { key: 'status', label: 'Status', render: v => (
      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${v === 'PAID' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
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
        <StatCard title="Total Revenue" value={`₹${(totalRevenue/100000).toFixed(2)}L`} subtitle="Collected" icon={IndianRupee} trend="+12%" />
        <StatCard title="Paid" value={String(paidCount)} subtitle="Students" icon={CheckCircle} iconBg="bg-green-50" iconColor="text-green-600" />
        <StatCard title="Pending" value={String(pendingCount)} subtitle="Due" icon={CreditCard} iconBg="bg-yellow-50" iconColor="text-yellow-600" />
        <StatCard title="Collection Rate" value={`${Math.round((paidCount/payments.length)*100)}%`} subtitle="This year" icon={TrendingUp} iconBg="bg-blue-50" iconColor="text-blue-600" />
      </div>

      <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
        <SearchInput value={search} onChange={setSearch} placeholder="Search by student name, roll number or transaction ID..." className="mb-5" />
        <Table columns={columns} data={filtered} emptyMessage="No payment records found" />
      </div>
    </motion.div>
  )
}
