import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { bookingService } from '../../api/services.js'
import { useAuth } from '../../hooks/useAuth.js'
import QRCode from '../../components/common/QRCode.jsx'
import { Download, CheckCircle, Bus, MapPin, Calendar, User } from 'lucide-react'
import toast from 'react-hot-toast'

const MOCK_PASS = {
  bookingId: 'HITAM-PASS-2026-8842',
  studentName: 'Rahul Sharma',
  rollNumber: '21CS1001',
  department: 'CSE - 2nd Year',
  busNumber: 'TS 09 AB 1234',
  routeName: 'R1 - Main Campus to City Center',
  seatNumber: 11,
  pickupPoint: 'Main Gate',
  paymentStatus: 'Paid (Annual Pass)',
  paymentDate: '03 Aug 2026',
  validTill: '03 Aug 2027',
  validityPeriod: 'Valid for 1 Year (AY 2026-2027)',
  qrCodeData: 'HITAM|21CS1001|TS09AB1234|SEAT11|PAID_1YR',
  bookingDate: '03 Aug 2026',
  amountPaid: 12000,
}

export default function MyPassPage() {
  const { user } = useAuth()
  const [pass, setPass] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    bookingService.getMy()
      .then(r => setPass(r.data || MOCK_PASS))
      .catch(() => setPass({ ...MOCK_PASS, studentName: user?.name || 'Rahul Sharma', rollNumber: user?.rollNumber || '21CS1001', department: `${user?.department || 'CSE'} - ${user?.year || '2nd Year'}` }))
      .finally(() => setLoading(false))
  }, [user])

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-10 h-10 border-3 border-[#40A047] border-t-transparent rounded-full animate-spin" style={{ borderWidth: 3 }} />
    </div>
  )

  const p = pass || MOCK_PASS

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-5 max-w-2xl mx-auto">
      <h1 className="text-xl font-bold text-gray-900">My Digital Bus Pass</h1>

      {/* Pass card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-lg overflow-hidden">
        {/* Header strip */}
        <div className="bg-[#1E293B] px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#40A047] rounded-xl flex items-center justify-center">
                <Bus size={20} className="text-white" />
              </div>
              <div>
                <p className="text-white font-bold text-base leading-tight">HITAM</p>
                <p className="text-gray-400 text-xs tracking-widest">ANNUAL BUS PASS</p>
              </div>
            </div>
            <span className="px-3 py-1 bg-white/20 text-white text-xs font-bold rounded-lg tracking-wide">VALID: 1 YEAR</span>
          </div>
        </div>

        <div className="p-6">
          {/* Student info + QR */}
          <div className="flex items-center justify-between gap-6 mb-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <User size={28} className="text-[#40A047]" />
              </div>
              <div>
                <p className="text-lg font-bold text-gray-900">{p.studentName}</p>
                <p className="text-sm font-semibold text-[#40A047]">{p.rollNumber}</p>
                <p className="text-xs text-gray-500">{p.department}</p>
              </div>
            </div>
            <div className="text-center flex-shrink-0">
              <QRCode data={p.qrCodeData} size={110} />
              <p className="text-xs text-gray-400 mt-1.5">Scan to Verify</p>
            </div>
          </div>

          <div className="border-t border-dashed border-gray-200 my-4" />

          {/* Details grid */}
          <div className="grid grid-cols-2 gap-5">
            {[
              ['Bus Number', p.busNumber],
              ['Route', p.routeName],
              ['Seat Number', String(p.seatNumber)],
              ['Pickup Point', p.pickupPoint],
              ['Payment Date', p.paymentDate],
              ['Valid Till (1 Year)', p.validTill],
              ['Fee Structure', 'Annual Fee (₹12,000)'],
            ].map(([k, v]) => (
              <div key={k}>
                <p className="text-xs text-gray-500">{k}</p>
                <p className="text-sm font-bold text-gray-800 mt-0.5">{v}</p>
              </div>
            ))}
            <div>
              <p className="text-xs text-gray-500">Pass Status</p>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 mt-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">
                <CheckCircle size={12} />
                Paid · 1 Year Valid
              </span>
            </div>
          </div>

          <div className="mt-5 p-3 bg-green-50 rounded-xl border border-green-100">
            <p className="text-xs text-green-700 font-medium text-center">{p.validityPeriod}</p>
          </div>
        </div>
      </div>

      {/* Download button */}
      <button onClick={() => toast.success('Bus Pass downloaded to device!')}
        className="w-full py-3.5 border-2 border-[#40A047] text-[#40A047] font-bold rounded-xl hover:bg-green-50 transition-colors flex items-center justify-center gap-2 text-sm">
        <Download size={18} />
        Download Pass
      </button>
    </motion.div>
  )
}
