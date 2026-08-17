import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { userService } from '../../api/services.js'
import PageHeader from '../../components/common/PageHeader.jsx'
import SearchInput from '../../components/common/SearchInput.jsx'
import Table from '../../components/common/Table.jsx'
import Modal from '../../components/common/Modal.jsx'
import StatusBadge from '../../components/common/StatusBadge.jsx'
import { UserPlus, Download, Trash2 } from 'lucide-react'

export default function DriversPage() {
  const [drivers, setDrivers] = useState([])
  const [search, setSearch] = useState('')
  const [addModal, setAddModal] = useState(false)
  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  useEffect(() => {
    userService.getAll({ role: 'DRIVER', search })
      .then(r => setDrivers(r.data.users || []))
      .catch(() => {})
  }, [search])

  const onAdd = async (data) => {
    try {
      await userService.create({ ...data, role: 'DRIVER', password: 'hitam123' })
      toast.success('Driver added successfully')
      setAddModal(false)
      reset()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed')
    }
  }

  const filtered = drivers.filter(d =>
    d.name?.toLowerCase().includes(search.toLowerCase()) ||
    d.rollNumber?.toLowerCase().includes(search.toLowerCase()) ||
    d.assignedBusNumber?.toLowerCase().includes(search.toLowerCase())
  )

  const columns = [
    { key: 'rollNumber', label: 'Driver ID' },
    { key: 'name', label: 'Name', render: v => <span className="font-semibold">{v}</span> },
    { key: 'phone', label: 'Phone' },
    { key: 'assignedBusNumber', label: 'Bus No.' },
    { key: 'assignedRouteId', label: 'Route' },
    { key: 'licenseNo', label: 'License' },
    { key: 'experience', label: 'Experience' },
    { key: 'status', label: 'Status', render: v => <StatusBadge status={v || 'ACTIVE'} /> },
    {
      key: '_id', label: 'Actions', render: (_, row) => (
        <button className="p-1.5 hover:bg-red-50 rounded-lg transition-colors" onClick={() => toast.error('Delete driver?')}>
          <Trash2 size={14} className="text-red-400" />
        </button>
      )
    }
  ]

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      <PageHeader title="Drivers" subtitle={`${filtered.length} registered drivers`}
        actions={<>
          <button onClick={() => toast.success('Exporting...')} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-sm font-semibold rounded-xl hover:bg-gray-50 transition-colors"><Download size={14} /> Export</button>
          <button onClick={() => setAddModal(true)} className="flex items-center gap-2 px-4 py-2 bg-[#40A047] text-white text-sm font-bold rounded-xl hover:bg-[#2d7a33] transition-colors shadow-sm"><UserPlus size={14} /> Add Driver</button>
        </>}
      />

      <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
        <SearchInput value={search} onChange={setSearch} placeholder="Search drivers..." className="mb-5" />
        <Table columns={columns} data={filtered} emptyMessage="No drivers found" />
      </div>

      <Modal open={addModal} onClose={() => { setAddModal(false); reset() }} title="Add New Driver" size="md">
        <form onSubmit={handleSubmit(onAdd)} className="space-y-4">
          {[
            { name: 'rollNumber', label: 'Driver ID', placeholder: 'DRV12345', required: true },
            { name: 'name', label: 'Full Name', required: true, placeholder: 'Driver Name' },
            { name: 'email', label: 'Email', placeholder: 'driver@hitam.edu.in' },
            { name: 'phone', label: 'Phone', placeholder: '+91 9876543210' },
            { name: 'licenseNo', label: 'License Number', placeholder: 'TS2024001' },
            { name: 'assignedBusNumber', label: 'Assigned Bus', placeholder: 'TS 09 AB 1234' },
            { name: 'experience', label: 'Experience', placeholder: '5 Years' },
          ].map(({ name, label, placeholder, required }) => (
            <div key={name}>
              <label className="block text-xs font-semibold text-gray-600 mb-1">{label}</label>
              <input {...register(name, required ? { required: 'Required' } : {})} placeholder={placeholder}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#40A047]/30 focus:border-[#40A047]" />
              {errors[name] && <p className="text-red-500 text-xs mt-1">{errors[name].message}</p>}
            </div>
          ))}
          <p className="text-xs text-gray-400">Default password: <code className="bg-gray-100 px-1.5 py-0.5 rounded">hitam123</code></p>
          <div className="flex gap-2 pt-2">
            <button type="submit" className="flex-1 py-3 bg-[#40A047] text-white font-bold rounded-xl text-sm">Add Driver</button>
            <button type="button" onClick={() => { setAddModal(false); reset() }} className="flex-1 py-3 border-2 border-gray-200 text-gray-600 font-semibold rounded-xl text-sm">Cancel</button>
          </div>
        </form>
      </Modal>
    </motion.div>
  )
}
