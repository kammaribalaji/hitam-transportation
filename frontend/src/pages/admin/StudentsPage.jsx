import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { userService } from '../../api/services.js'
import PageHeader from '../../components/common/PageHeader.jsx'
import SearchInput from '../../components/common/SearchInput.jsx'
import Table from '../../components/common/Table.jsx'
import Pagination from '../../components/common/Pagination.jsx'
import Modal from '../../components/common/Modal.jsx'
import StatusBadge from '../../components/common/StatusBadge.jsx'
import { Plus, UserPlus, Download, Edit, Trash2, Phone } from 'lucide-react'

const MOCK_STUDENTS = Array.from({ length: 10 }, (_, i) => ({
  _id: String(i), rollNumber: `21CS10${String(i).padStart(2,'0')}`, name: ['Rahul Sharma','Priya Verma','Amit Patel','Sneha Kumar','Deepika Roy','Venkatesh K','Arjun Reddy','Kavya Sharma','Ravi Teja','Lakshmi Devi'][i],
  department: ['CSE','ECE','MECH','EEE','CSE','IT','CSE','ECE','MECH','CSE'][i], year: `${i%4+1}nd Year`,
  assignedRouteId: `R${(i%6)+1}`, seatNumber: i+5, pickupPoint: ['Main Gate','City Center','LB Nagar','Kukatpally','Miyapur'][i%5],
  transportFeePaid: i % 3 !== 0, phone: `+91 9876${String(500000+i)}`,
}))

export default function StudentsPage() {
  const [students, setStudents] = useState(MOCK_STUDENTS)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [addModal, setAddModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  useEffect(() => {
    setLoading(true)
    userService.getAll({ role: 'STUDENT', search, page, limit: 15 })
      .then(r => { setStudents(r.data.users); setPage(r.data.page); setPages(r.data.pages); setTotal(r.data.total) })
      .catch(() => { setStudents(MOCK_STUDENTS); setPages(1); setTotal(MOCK_STUDENTS.length) })
      .finally(() => setLoading(false))
  }, [search, page])

  const filtered = students.filter(s =>
    s.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.rollNumber?.toLowerCase().includes(search.toLowerCase()) ||
    s.department?.toLowerCase().includes(search.toLowerCase())
  )

  const onAdd = async (data) => {
    try {
      await userService.create({ ...data, role: 'STUDENT', password: 'hitam123' })
      toast.success('Student added successfully')
      setAddModal(false)
      reset()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add student')
    }
  }

  const onDelete = (rollNumber) => {
    if (!confirm(`Delete student ${rollNumber}?`)) return
    userService.delete(rollNumber).then(() => {
      setStudents(prev => prev.filter(s => s.rollNumber !== rollNumber))
      toast.success('Student deleted')
    }).catch(() => toast.error('Failed'))
  }

  const columns = [
    { key: 'rollNumber', label: 'Roll No.' },
    { key: 'name', label: 'Name', render: (v) => <span className="font-semibold">{v}</span> },
    { key: 'department', label: 'Dept' },
    { key: 'year', label: 'Year' },
    { key: 'assignedRouteId', label: 'Route' },
    { key: 'pickupPoint', label: 'Pickup' },
    { key: 'transportFeePaid', label: 'Fee Status', render: (v) => <StatusBadge status={v ? 'PAID' : 'PENDING'} label={v ? 'Paid' : 'Pending'} /> },
    { key: 'phone', label: 'Phone' },
    {
      key: '_id', label: 'Actions', render: (_, row) => (
        <div className="flex items-center gap-1">
          <button className="p-1.5 hover:bg-red-50 rounded-lg transition-colors" onClick={() => onDelete(row.rollNumber)}>
            <Trash2 size={14} className="text-red-400 hover:text-red-600" />
          </button>
        </div>
      )
    }
  ]

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      <PageHeader title="Students" subtitle={`${total || filtered.length} total students`}
        actions={<>
          <button onClick={() => toast.success('Exporting...')} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-sm font-semibold rounded-xl hover:bg-gray-50 transition-colors"><Download size={14} /> Export</button>
          <button onClick={() => setAddModal(true)} className="flex items-center gap-2 px-4 py-2 bg-[#40A047] text-white text-sm font-bold rounded-xl hover:bg-[#2d7a33] transition-colors shadow-sm"><UserPlus size={14} /> Add Student</button>
        </>}
      />

      <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <SearchInput value={search} onChange={v => { setSearch(v); setPage(1) }} placeholder="Search by name, roll number or department..." className="flex-1" />
        </div>
        <Table columns={columns} data={filtered} emptyMessage="No students found" />
        <Pagination page={page} pages={pages} total={total || filtered.length} onPage={setPage} />
      </div>

      <Modal open={addModal} onClose={() => { setAddModal(false); reset() }} title="Add New Student" size="md">
        <form onSubmit={handleSubmit(onAdd)} className="space-y-4">
          {[
            { name: 'rollNumber', label: 'Roll Number', placeholder: '21CS1001', required: true },
            { name: 'name', label: 'Full Name', placeholder: 'Student Name', required: true },
            { name: 'email', label: 'Email', placeholder: 'student@hitam.edu.in' },
            { name: 'phone', label: 'Phone', placeholder: '+91 9876543210' },
            { name: 'department', label: 'Department', placeholder: 'CSE' },
            { name: 'year', label: 'Year', placeholder: '1st Year' },
          ].map(({ name, label, placeholder, required }) => (
            <div key={name}>
              <label className="block text-xs font-semibold text-gray-600 mb-1">{label}</label>
              <input {...register(name, required ? { required: 'Required' } : {})} placeholder={placeholder}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#40A047]/30 focus:border-[#40A047]" />
              {errors[name] && <p className="text-red-500 text-xs mt-1">{errors[name].message}</p>}
            </div>
          ))}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Assigned Route</label>
            <select {...register('assignedRouteId')} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#40A047]/30 focus:border-[#40A047] bg-white">
              {['R1','R2','R3','R4','R5','R6'].map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <p className="text-xs text-gray-400">Default password: <code className="bg-gray-100 px-1.5 py-0.5 rounded">hitam123</code></p>
          <div className="flex gap-2 pt-2">
            <button type="submit" className="flex-1 py-3 bg-[#40A047] text-white font-bold rounded-xl text-sm">Add Student</button>
            <button type="button" onClick={() => { setAddModal(false); reset() }} className="flex-1 py-3 border-2 border-gray-200 text-gray-600 font-semibold rounded-xl text-sm">Cancel</button>
          </div>
        </form>
      </Modal>
    </motion.div>
  )
}
