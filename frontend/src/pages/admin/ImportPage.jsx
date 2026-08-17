import React, { useState } from 'react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { importService } from '../../api/services.js'
import PageHeader from '../../components/common/PageHeader.jsx'
import { Upload, FileText, CheckCircle, AlertTriangle, Info, Loader, ClipboardPaste } from 'lucide-react'

const HEADER = 'S.No,Date,Roll No,Name,Year,Boarding Point,Route No,Amount,Paid,Balance,Seat No'

export default function ImportPage() {
  const [csv, setCsv] = useState('')
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState(null)

  const handleImport = async () => {
    if (!csv.trim()) return toast.error('Paste the sheet data first')
    setImporting(true)
    setResult(null)
    try {
      const r = await importService.route12(csv)
      setResult(r.data)
      toast.success(`Imported ${r.data.imported} new + ${r.data.updated} updated records`)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Import failed')
    } finally {
      setImporting(false)
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      <PageHeader title="Import Route 12 Data" subtitle="Load the transport sheet into PostgreSQL" />

      {/* How it works */}
      <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Info size={16} className="text-[#40A047]" />
          <h2 className="text-sm font-bold text-gray-900">How it works</h2>
        </div>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-600">
          <li className="flex items-start gap-2"><CheckCircle size={13} className="text-[#40A047] mt-0.5 flex-shrink-0" /> Paste the columns from your sheet — exact values are stored (roll no, name, year, boarding point, amount, paid, balance).</li>
          <li className="flex items-start gap-2"><CheckCircle size={13} className="text-[#40A047] mt-0.5 flex-shrink-0" /> Seat numbers come from the sheet's Seat No column when present (WAITLIST1 is kept); otherwise rows are numbered in sheet order.</li>
          <li className="flex items-start gap-2"><CheckCircle size={13} className="text-[#40A047] mt-0.5 flex-shrink-0" /> Payment status is derived: balance 0 → PAID · paid &gt; 0 → PARTIALLY PAID · else UNPAID.</li>
          <li className="flex items-start gap-2"><CheckCircle size={13} className="text-[#40A047] mt-0.5 flex-shrink-0" /> Students log in with their real roll numbers (password: hitam123).</li>
          <li className="flex items-start gap-2"><CheckCircle size={13} className="text-[#40A047] mt-0.5 flex-shrink-0" /> Seats, bookings, payments, passengers and notifications are created in PostgreSQL.</li>
          <li className="flex items-start gap-2"><AlertTriangle size={13} className="text-amber-500 mt-0.5 flex-shrink-0" /> Re-importing refreshes the records for those roll numbers (safe to re-run).</li>
        </ul>
      </div>

      {/* Paste area */}
      <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <FileText size={16} className="text-[#40A047]" /> Paste the sheet rows
          </h2>
          <button onClick={() => setCsv(HEADER)}
            className="text-xs text-[#40A047] font-semibold hover:underline flex items-center gap-1">
            <ClipboardPaste size={13} /> Insert header row
          </button>
        </div>

        <textarea
          value={csv}
          onChange={e => setCsv(e.target.value)}
          rows={10}
          spellCheck={false}
          placeholder={`${HEADER}\n1,03/06/2026,HTM923,PALLAVI S B,STAFF,MUTHANGI,12,0,0,0,17\n2,04/06/2026,25E51A0370,YARLAGADDA DESIVIRAPAN,2nd Year,SANGAREDDY,12,42900,42900,0,20`}
          className="w-full px-4 py-3 border border-gray-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#40A047]/30 focus:border-[#40A047]"
        />

        <div className="flex items-center gap-3 mt-4">
          <button onClick={handleImport} disabled={importing}
            className="flex items-center gap-2 px-6 py-3 bg-[#40A047] text-white text-sm font-bold rounded-xl hover:bg-[#2d7a33] transition-colors shadow-sm disabled:opacity-60">
            {importing ? <><Loader size={16} className="animate-spin" /> Importing…</> : <><Upload size={16} /> Import into PostgreSQL</>}
          </button>
          <p className="text-xs text-gray-400">Comma, tab or pipe separated — the header row is optional.</p>
        </div>
      </div>

      {/* Result */}
      {result && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <h2 className="text-sm font-bold text-gray-900 mb-4">Import Result</h2>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-green-50 rounded-xl p-4 text-center border border-green-100">
              <p className="text-2xl font-bold text-green-700">{result.imported}</p>
              <p className="text-xs text-green-600 mt-0.5">New students</p>
            </div>
            <div className="bg-blue-50 rounded-xl p-4 text-center border border-blue-100">
              <p className="text-2xl font-bold text-blue-700">{result.updated}</p>
              <p className="text-xs text-blue-600 mt-0.5">Updated</p>
            </div>
            <div className={`rounded-xl p-4 text-center border ${result.skipped ? 'bg-amber-50 border-amber-100' : 'bg-gray-50 border-gray-100'}`}>
              <p className={`text-2xl font-bold ${result.skipped ? 'text-amber-600' : 'text-gray-400'}`}>{result.skipped}</p>
              <p className={`text-xs mt-0.5 ${result.skipped ? 'text-amber-600' : 'text-gray-500'}`}>Skipped</p>
            </div>
          </div>
          {result.skipped > 0 && (
            <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl">
              <p className="text-xs font-bold text-amber-700 mb-1 flex items-center gap-1.5"><AlertTriangle size={13} /> Rows skipped:</p>
              <ul className="space-y-0.5">
                {result.errors.map((e, i) => <li key={i} className="text-xs text-amber-600 font-mono">{e}</li>)}
              </ul>
            </div>
          )}
          {result.skipped === 0 && result.total > 0 && (
            <p className="text-xs text-green-700 bg-green-50 border border-green-100 rounded-xl p-3">
              ✅ All {result.total} rows imported — check the Students, Bookings, Payments and Routes pages.
            </p>
          )}
        </motion.div>
      )}
    </motion.div>
  )
}
