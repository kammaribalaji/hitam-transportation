import React, { useState } from 'react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import PageHeader from '../../components/common/PageHeader.jsx'
import { Download, FileText, Users, Bus, CreditCard, BarChart2 } from 'lucide-react'

const REPORTS = [
  { title: 'Student Enrollment Report', desc: 'Complete list of enrolled students with route and payment details', icon: Users, color: 'bg-blue-50 text-blue-600' },
  { title: 'Driver Performance Report', desc: 'Trip completion rates, on-time performance, fuel usage', icon: Bus, color: 'bg-green-50 text-green-600' },
  { title: 'Revenue Collection Report', desc: 'Fee collection summary, pending dues, route-wise revenue', icon: CreditCard, color: 'bg-purple-50 text-purple-600' },
  { title: 'Attendance Summary Report', desc: 'Student boarding rates, absences, daily attendance stats', icon: FileText, color: 'bg-orange-50 text-orange-600' },
  { title: 'Route Efficiency Report', desc: 'Occupancy rates, route-wise performance metrics', icon: BarChart2, color: 'bg-pink-50 text-pink-600' },
  { title: 'Complaint Analysis Report', desc: 'Complaint categories, resolution time, patterns', icon: FileText, color: 'bg-red-50 text-red-600' },
]

const RECENT = [
  { name: 'Enrollment Report – Jul 2026', date: '01 Aug 2026', type: 'PDF', size: '1.2 MB' },
  { name: 'Revenue Report – Q2 2026', date: '15 Jul 2026', type: 'Excel', size: '890 KB' },
  { name: 'Attendance Summary – Jun 2026', date: '30 Jun 2026', type: 'PDF', size: '760 KB' },
  { name: 'Driver Performance – May 2026', date: '31 May 2026', type: 'PDF', size: '1.1 MB' },
]

export default function ReportsPage() {
  const [dateFrom, setDateFrom] = useState('2026-05-01')
  const [dateTo, setDateTo] = useState('2026-08-07')

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      <PageHeader title="Reports" subtitle="Generate and download system reports" />

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
            <button onClick={() => toast.success('Report generating...')}
              className="px-5 py-2.5 bg-[#40A047] text-white text-sm font-bold rounded-xl hover:bg-[#2d7a33] transition-colors">
              Generate All
            </button>
          </div>
        </div>
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
              <button onClick={() => toast.success(`${r.title} - PDF generated!`)}
                className="flex-1 py-2 text-xs font-bold text-[#40A047] border-2 border-[#40A047] rounded-xl hover:bg-green-50 transition-colors flex items-center justify-center gap-1">
                <Download size={12} /> PDF
              </button>
              <button onClick={() => toast.success(`${r.title} - Excel generated!`)}
                className="flex-1 py-2 text-xs font-bold text-blue-600 border-2 border-blue-200 rounded-xl hover:bg-blue-50 transition-colors flex items-center justify-center gap-1">
                <Download size={12} /> Excel
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Recent downloads */}
      <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
        <h2 className="text-sm font-bold text-gray-900 mb-4">Recent Downloads</h2>
        <div className="space-y-3">
          {RECENT.map((r, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center">
                  <FileText size={15} className="text-gray-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">{r.name}</p>
                  <p className="text-xs text-gray-400">{r.date} · {r.size}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 text-xs font-bold rounded-lg ${r.type === 'PDF' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>{r.type}</span>
                <button onClick={() => toast.success(`Downloading ${r.name}...`)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                  <Download size={14} className="text-gray-500" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  )
}
