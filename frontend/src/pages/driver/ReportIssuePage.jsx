import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { issueService } from '../../api/services.js'
import PageHeader from '../../components/common/PageHeader.jsx'
import StatusBadge from '../../components/common/StatusBadge.jsx'
import { AlertTriangle, Send, Image } from 'lucide-react'

const ISSUE_TYPES = ['Engine Problem', 'Tire Issue', 'Brake Issue', 'Fuel Leak', 'Traffic Issue', 'Accident', 'Breakdown', 'Other']
const SEVERITIES = [
  { value: 'LOW', label: '🟢 Low', bg: 'bg-green-50 border-green-200 text-green-700' },
  { value: 'MEDIUM', label: '🟡 Medium', bg: 'bg-yellow-50 border-yellow-200 text-yellow-700' },
  { value: 'HIGH', label: '🔴 High', bg: 'bg-red-50 border-red-200 text-red-700' },
]

export default function ReportIssuePage() {
  const [issues, setIssues] = useState([])
  const [severity, setSeverity] = useState('LOW')
  const [issueType, setIssueType] = useState('')
  const [loading, setLoading] = useState(false)
  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  useEffect(() => {
    issueService.getAll().then(r => setIssues(r.data || [])).catch(() => {})
  }, [])

  const onSubmit = async (data) => {
    if (!issueType) { toast.error('Please select an issue type'); return }
    setLoading(true)
    try {
      const res = await issueService.create({ issueType, severity, description: data.description, photoUrl: '' })
      setIssues(prev => [res.data, ...prev])
      toast.success('Issue report submitted to admin')
      reset()
      setIssueType('')
      setSeverity('LOW')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit issue report')
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      <PageHeader title="Report Issue" subtitle="Report vehicle or route problems instantly" />

      {/* Form */}
      <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-9 h-9 bg-red-100 rounded-lg flex items-center justify-center">
            <AlertTriangle size={16} className="text-red-600" />
          </div>
          <h2 className="text-sm font-bold text-gray-900">Submit New Issue Report</h2>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Issue type */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-2">Issue Type *</label>
            <div className="flex flex-wrap gap-2">
              {ISSUE_TYPES.map(t => (
                <button key={t} type="button" onClick={() => setIssueType(t)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border-2 transition-all ${issueType === t ? 'bg-[#40A047] text-white border-[#40A047]' : 'bg-white text-gray-600 border-gray-200 hover:border-green-400'}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Severity */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-2">Severity *</label>
            <div className="flex gap-2">
              {SEVERITIES.map(s => (
                <button key={s.value} type="button" onClick={() => setSeverity(s.value)}
                  className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-bold transition-all ${severity === s.value ? s.bg + ' border-current' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Description *</label>
            <textarea {...register('description', { required: 'Required' })} rows={4} placeholder="Describe the issue in detail..."
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#40A047]/30 focus:border-[#40A047] resize-none" />
            {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description.message}</p>}
          </div>

          {/* Photo upload placeholder */}
          <div className="flex items-center gap-3 p-3 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-green-400 transition-colors">
            <Image size={20} className="text-gray-400" />
            <div>
              <p className="text-sm font-semibold text-gray-700">Attach Photo (optional)</p>
              <p className="text-xs text-gray-400">Supports JPG, PNG up to 5MB</p>
            </div>
          </div>

          <button type="submit" disabled={loading}
            className="w-full py-3 bg-[#40A047] text-white font-bold rounded-xl hover:bg-[#2d7a33] transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
            <Send size={16} />
            {loading ? 'Submitting...' : 'Submit Report'}
          </button>
        </form>
      </div>

      {/* Recent reports */}
      <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
        <h2 className="text-sm font-bold text-gray-900 mb-4">Recent Reports</h2>
        <div className="space-y-3">
          {issues.map((issue, i) => (
            <div key={issue.issueId || i} className="flex items-start justify-between gap-4 p-3 bg-gray-50 rounded-xl">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-bold text-gray-900">{issue.issueType}</p>
                  <StatusBadge status={issue.severity} />
                </div>
                <p className="text-xs text-gray-600">{issue.description}</p>
              </div>
              <StatusBadge status={issue.status} />
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  )
}
