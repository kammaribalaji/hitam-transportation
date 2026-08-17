import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { complaintService } from '../../api/services.js'
import PageHeader from '../../components/common/PageHeader.jsx'
import SearchInput from '../../components/common/SearchInput.jsx'
import Table from '../../components/common/Table.jsx'
import StatusBadge from '../../components/common/StatusBadge.jsx'
import Modal from '../../components/common/Modal.jsx'
import { MessageSquare, Eye } from 'lucide-react'

const STATUS_OPTIONS = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']

export default function ComplaintsPage() {
  const [complaints, setComplaints] = useState([])
  const [search, setSearch] = useState('')
  const [viewModal, setViewModal] = useState(null)

  useEffect(() => {
    complaintService.getAll()
      .then(r => setComplaints(r.data.complaints || []))
      .catch(() => {})
  }, [])

  const updateStatus = async (complaintId, status) => {
    try {
      await complaintService.updateStatus(complaintId, status)
      setComplaints(prev => prev.map(c => c.complaintId === complaintId ? { ...c, status } : c))
      toast.success('Status updated')
    } catch {
      setComplaints(prev => prev.map(c => c.complaintId === complaintId ? { ...c, status } : c))
    }
  }

  const filtered = complaints.filter(c =>
    c.studentName?.toLowerCase().includes(search.toLowerCase()) ||
    c.category?.toLowerCase().includes(search.toLowerCase()) ||
    c.complaintId?.toLowerCase().includes(search.toLowerCase())
  )

  const columns = [
    { key: 'complaintId', label: 'ID', render: v => <span className="font-mono text-xs">{v}</span> },
    { key: 'studentName', label: 'Student', render: v => <span className="font-semibold">{v}</span> },
    { key: 'studentRollNumber', label: 'Roll No.' },
    { key: 'category', label: 'Category' },
    { key: 'description', label: 'Description', render: v => <span className="text-gray-500 max-w-48 truncate block text-xs">{v}</span> },
    { key: 'date', label: 'Date' },
    { key: 'status', label: 'Status', render: (v, row) => (
      <select value={v} onChange={e => updateStatus(row.complaintId, e.target.value)}
        className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#40A047] bg-white">
        {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace(/_/g,' ')}</option>)}
      </select>
    )},
    { key: '_id', label: '', render: (_, row) => (
      <button onClick={() => setViewModal(row)} className="p-1.5 hover:bg-blue-50 rounded-lg"><Eye size={14} className="text-blue-500" /></button>
    )},
  ]

  const stats = [
    ['Open', complaints.filter(c => c.status === 'OPEN').length, 'text-red-600 bg-red-50'],
    ['In Progress', complaints.filter(c => c.status === 'IN_PROGRESS').length, 'text-yellow-600 bg-yellow-50'],
    ['Resolved', complaints.filter(c => c.status === 'RESOLVED').length, 'text-green-600 bg-green-50'],
    ['Total', complaints.length, 'text-gray-700 bg-gray-50'],
  ]

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      <PageHeader title="Complaints" subtitle="Manage student complaints and feedback" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(([label, value, cls]) => (
          <div key={label} className={`rounded-2xl p-4 border border-transparent text-center ${cls}`}>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-xs font-semibold mt-1 opacity-80">{label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
        <SearchInput value={search} onChange={setSearch} placeholder="Search complaints..." className="mb-5" />
        <Table columns={columns} data={filtered} emptyMessage="No complaints found" />
      </div>

      <Modal open={!!viewModal} onClose={() => setViewModal(null)} title="Complaint Details">
        {viewModal && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {[['ID', viewModal.complaintId], ['Student', viewModal.studentName], ['Roll No.', viewModal.studentRollNumber], ['Date', viewModal.date], ['Category', viewModal.category]].map(([k, v]) => (
                <div key={k}><p className="text-xs text-gray-500">{k}</p><p className="text-sm font-bold text-gray-800 mt-0.5">{v}</p></div>
              ))}
              <div><p className="text-xs text-gray-500">Status</p><StatusBadge status={viewModal.status} /></div>
            </div>
            <div><p className="text-xs text-gray-500 mb-1">Description</p><p className="text-sm text-gray-700 p-3 bg-gray-50 rounded-xl">{viewModal.description}</p></div>
            <div>
              <p className="text-xs font-semibold text-gray-600 mb-2">Update Status:</p>
              <div className="flex gap-2 flex-wrap">
                {STATUS_OPTIONS.map(s => (
                  <button key={s} onClick={() => { updateStatus(viewModal.complaintId, s); setViewModal(v => ({...v, status: s})) }}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${viewModal.status === s ? 'bg-[#40A047] text-white' : 'bg-gray-100 text-gray-600 hover:bg-green-50 hover:text-[#40A047]'}`}>
                    {s.replace(/_/g,' ')}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </motion.div>
  )
}
