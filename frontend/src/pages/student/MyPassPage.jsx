import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toPng } from 'html-to-image'
import { motion } from 'framer-motion'
import { bookingService } from '../../api/services.js'
import { useAuth } from '../../hooks/useAuth.js'
import QRCode from '../../components/common/QRCode.jsx'
import { formatCurrency } from '../../utils/helpers.js'
import { Download, CheckCircle, Bus, User, QrCode } from 'lucide-react'
import toast from 'react-hot-toast'

export default function MyPassPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [pass, setPass] = useState(null)
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)
  const passRef = useRef(null)

  useEffect(() => {
    bookingService.getMy()
      .then(r => setPass(r.data || null))
      .catch(() => setPass(null))
      .finally(() => setLoading(false))
  }, [user])

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-10 h-10 border-3 border-[#40A047] border-t-transparent rounded-full animate-spin" style={{ borderWidth: 3 }} />
    </div>
  )

  if (!pass) {
    return (
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-5 max-w-2xl mx-auto">
        <h1 className="text-xl font-bold text-gray-900">My Digital Bus Pass</h1>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <QrCode size={30} className="text-gray-400" />
          </div>
          <p className="text-base font-bold text-gray-900 mb-1">No Active Bus Pass</p>
          <p className="text-sm text-gray-500 mb-6">Book a seat and complete the payment to generate your digital bus pass with QR code.</p>
          <button onClick={() => navigate('/student/book-seat')}
            className="px-8 py-3 bg-[#40A047] hover:bg-[#2d7a33] text-white font-bold rounded-xl transition-all text-sm shadow-lg shadow-green-600/20">
            Book a Seat
          </button>
        </div>
      </motion.div>
    )
  }

  const p = pass
  // Waitlisted passengers have seat 0 in the DB; show the sheet's label instead.
  const seatLabel = p.seatNumber >= 1 ? p.seatNumber : 'WAITLIST1'

  // Capture the pass card as a PNG and save it to the device.
  const downloadPass = async () => {
    if (!passRef.current) return
    setDownloading(true)
    try {
      const dataUrl = await toPng(passRef.current, {
        pixelRatio: 2,
        cacheBust: true,
        backgroundColor: '#ffffff',
        skipFonts: true, // avoids cross-origin Google Fonts cssRules errors; PNG uses system font
      })
      const safeRoll = String(p?.studentRollNumber || 'student').replace(/[^a-zA-Z0-9]/g, '')
      const link = document.createElement('a')
      link.download = `HITAM-BusPass-${safeRoll}-Seat${seatLabel}.png`
      link.href = dataUrl
      link.click()
      toast.success('Bus pass saved as PNG!')
    } catch {
      toast.error('Could not generate the image. Try again.')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-5 max-w-2xl mx-auto">
      <h1 className="text-xl font-bold text-gray-900">My Digital Bus Pass</h1>

      {/* Pass card */}
      <div ref={passRef} className="bg-white rounded-2xl border border-gray-100 shadow-lg overflow-hidden">
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
                <p className="text-sm font-semibold text-[#40A047]">{p.studentRollNumber}</p>
                <p className="text-xs text-gray-500">{p.department} · {p.year}</p>
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
              ['Seat Number', String(seatLabel)],
              ['Pickup Point', p.pickupPoint],
              ['Payment Date', p.paymentDate || '—'],
              ['Valid Till (1 Year)', p.validTill || '—'],
              ['Fee Structure', `Annual Fee (${p.amountPaid ? `₹${Number(p.amountPaid).toLocaleString('en-IN')}` : '—'})`],
            ].map(([k, v]) => (
              <div key={k}>
                <p className="text-xs text-gray-500">{k}</p>
                <p className="text-sm font-bold text-gray-800 mt-0.5">{v}</p>
              </div>
            ))}
            <div>
              <p className="text-xs text-gray-500">Pass Status</p>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 mt-1 text-xs font-bold rounded-full ${String(p.paymentStatus || '').toLowerCase().includes('paid') ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                <CheckCircle size={12} />
                {p.paymentStatus || 'Pending'}
              </span>
            </div>
          </div>

          <div className="mt-5 p-3 bg-green-50 rounded-xl border border-green-100">
            <p className="text-xs text-green-700 font-medium text-center">{p.validityPeriod || 'Complete payment to activate validity.'}</p>
          </div>
        </div>
      </div>

      {/* Pending payment -> resume payment path */}
      {!String(p.paymentStatus || '').toLowerCase().includes('paid') && (
        <button onClick={() => navigate('/student/payment', { state: { bookingId: p.bookingId, pendingSeat: p.seatNumber, selectedRouteId: p.routeId } })}
          className="w-full py-3.5 bg-[#40A047] text-white font-bold rounded-xl hover:bg-[#2d7a33] transition-colors flex items-center justify-center gap-2 text-sm shadow-lg shadow-green-600/20">
          <CheckCircle size={18} />
          Complete Payment · {p.feeAmount ? formatCurrency(p.feeAmount) : (p.amountPaid ? formatCurrency(p.amountPaid) : '—')}
        </button>
      )}

      {/* Download button */}
      <button onClick={downloadPass} disabled={downloading}
        className="w-full py-3.5 border-2 border-[#40A047] text-[#40A047] font-bold rounded-xl hover:bg-green-50 transition-colors flex items-center justify-center gap-2 text-sm disabled:opacity-60 disabled:cursor-not-allowed">
        <Download size={18} />
        {downloading ? 'Generating…' : 'Download Pass as PNG'}
      </button>
    </motion.div>
  )
}
