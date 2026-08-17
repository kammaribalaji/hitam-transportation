import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Scanner } from '@yudiel/react-qr-scanner'
import { passengerService } from '../../api/services.js'
import { useAuth } from '../../hooks/useAuth.js'
import PageHeader from '../../components/common/PageHeader.jsx'
import StatusBadge from '../../components/common/StatusBadge.jsx'
import toast from 'react-hot-toast'
import { QrCode, Search, CheckCircle, User, Clock, Camera, CameraOff, AlertTriangle, ScanLine } from 'lucide-react'

export default function QRScannerPage() {
  const { user } = useAuth()
  const routeId = user?.assignedRouteId || '12'
  const [passengers, setPassengers] = useState([])
  const [manualRoll, setManualRoll] = useState('')
  const [scannedList, setScannedList] = useState([])
  const [showVerify, setShowVerify] = useState(false)
  const [foundPassenger, setFoundPassenger] = useState(null)
  const [qrInfo, setQrInfo] = useState({ status: '', seatFromQr: null, seatMismatch: false })
  const [cameraOn, setCameraOn] = useState(false)
  const [paused, setPaused] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const verifyingRef = useRef(false)
  const lastScanRef = useRef('')

  useEffect(() => {
    passengerService.getByRoute({ routeId })
      .then(r => setPassengers(r.data || []))
      .catch(() => {})
  }, [routeId])

  const summaryToday = {
    boarded: passengers.filter(p => p.boarded).length,
    pending: passengers.filter(p => !p.boarded).length,
    absent: 0,
  }

  const openVerify = (passenger, info = { status: '', seatFromQr: null, seatMismatch: false }) => {
    setFoundPassenger(passenger)
    setQrInfo(info)
    setPaused(true)
    setShowVerify(true)
  }

  const closeVerify = () => {
    setShowVerify(false)
    setFoundPassenger(null)
    setQrInfo({ status: '', seatFromQr: null, seatMismatch: false })
    setPaused(false)
    setManualRoll('')
    // Allow the same pass to be scanned again (e.g. re-scan after fixing a misread,
    // or a re-scan to show the "already boarded" state).
    lastScanRef.current = ''
  }

  // Camera scan -> verify pass against PostgreSQL
  const verifyQR = async (rawValue) => {
    if (verifyingRef.current || paused) return
    verifyingRef.current = true
    try {
      const r = await passengerService.scanQR(rawValue)
      const { passenger, qrStatus, seatFromQr, seatMismatch } = r.data
      openVerify(passenger, { status: qrStatus || '', seatFromQr, seatMismatch })
    } catch (err) {
      toast.error(err.response?.data?.message || 'Pass not recognized. Try again.')
      lastScanRef.current = ''
      setPaused(false)
    } finally {
      verifyingRef.current = false
    }
  }

  const handleDetect = (codes) => {
    if (!codes || codes.length === 0 || paused || showVerify) return
    const raw = codes[0]?.rawValue || ''
    if (!raw || raw === lastScanRef.current) return
    lastScanRef.current = raw
    verifyQR(raw)
  }

  const handleManualScan = () => {
    if (!manualRoll.trim()) return
    const found = passengers.find(p => p.rollNumber.toLowerCase() === manualRoll.trim().toLowerCase())
    if (found) {
      openVerify(found)
    } else {
      toast.error(`No passenger found for: ${manualRoll}`)
    }
  }

  const confirmAttendance = async () => {
    if (!foundPassenger) return
    try {
      await passengerService.markAttendance({ rollNumber: foundPassenger.rollNumber, boarded: true })
    } catch {}
    const entry = { ...foundPassenger, scannedAt: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }), status: 'BOARDED' }
    setScannedList(prev => [entry, ...prev])
    setPassengers(prev => prev.map(p => (p.rollNumber === foundPassenger.rollNumber ? { ...p, boarded: true, status: 'BOARDED' } : p)))
    toast.success(`✅ Pass Verified! ${foundPassenger.name} marked boarded`)
    closeVerify()
  }

  const toggleCamera = () => {
    if (cameraOn) {
      setCameraOn(false)
      setCameraError('')
      return
    }
    setCameraError('')
    setCameraOn(true)
  }

  const handleCameraError = (err) => {
    setCameraOn(false)
    setCameraError(err?.message || 'Camera unavailable — allow camera access or use manual entry.')
  }

  const feePaid = foundPassenger?.feePaid

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      <PageHeader title="Scan QR / Attendance" subtitle="Verify student bus passes with the camera" />

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm text-center">
          <p className="text-xs text-gray-500 mb-1">Scanned</p>
          <p className="text-2xl font-bold text-gray-900">{summaryToday.boarded}</p>
        </div>
        <div className="bg-yellow-50 rounded-2xl p-4 border border-yellow-100 text-center">
          <p className="text-xs text-yellow-600 mb-1">Pending</p>
          <p className="text-2xl font-bold text-yellow-600">{summaryToday.pending}</p>
        </div>
        <div className="bg-red-50 rounded-2xl p-4 border border-red-100 text-center">
          <p className="text-xs text-red-500 mb-1">Absent</p>
          <p className="text-2xl font-bold text-red-500">{summaryToday.absent}</p>
        </div>
      </div>

      {/* Scanner area */}
      <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <QrCode size={16} className="text-[#40A047]" /> QR Code Scanner
          </h2>
          <button
            onClick={toggleCamera}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl transition-colors ${
              cameraOn
                ? 'bg-red-50 text-red-600 hover:bg-red-100'
                : 'bg-[#40A047] text-white hover:bg-[#2d7a33]'
            }`}
          >
            {cameraOn ? <><CameraOff size={14} /> Stop Camera</> : <><Camera size={14} /> Start Camera</>}
          </button>
        </div>

        {/* Camera viewfinder */}
        <div className="relative mb-5">
          {cameraOn ? (
            <div className="relative w-full max-w-md mx-auto rounded-2xl overflow-hidden border-4 border-[#40A047] bg-black">
              <Scanner
                onScan={handleDetect}
                onError={handleCameraError}
                paused={paused}
                constraints={{ facingMode: 'environment' }}
                components={{ audio: true, torch: true, zoom: true }}
                styles={{ container: { width: '100%', height: 320 }, video: { objectFit: 'cover' } }}
              />
              {/* Corner brackets */}
              {[['top-2 left-2', 'border-t-2 border-l-2'], ['top-2 right-2', 'border-t-2 border-r-2'], ['bottom-2 left-2', 'border-b-2 border-l-2'], ['bottom-2 right-2', 'border-b-2 border-r-2']].map(([pos, border], i) => (
                <div key={i} className={`absolute w-8 h-8 ${pos} ${border} border-white/80 rounded-sm pointer-events-none`} />
              ))}
              {paused && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <p className="text-white text-sm font-bold bg-black/60 px-4 py-2 rounded-lg">Scanning paused…</p>
                </div>
              )}
            </div>
          ) : (
            <div className="w-48 h-48 mx-auto bg-gray-900 rounded-2xl flex items-center justify-center border-4 border-[#40A047] relative overflow-hidden">
              <div className="text-center px-3">
                <QrCode size={44} className="text-white/30 mx-auto mb-2" />
                <p className="text-white/50 text-xs">Camera Viewfinder</p>
                <p className="text-white/40 text-xs mt-1">Align QR Code here</p>
              </div>
              {/* Scanning line animation */}
              <motion.div
                animate={{ y: ['-50%', '150%'] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                className="absolute left-0 right-0 h-0.5 bg-[#40A047] opacity-80"
                style={{ top: '50%' }}
              />
              {/* Corner brackets */}
              {[['top-2 left-2', 'border-t-2 border-l-2'], ['top-2 right-2', 'border-t-2 border-r-2'], ['bottom-2 left-2', 'border-b-2 border-l-2'], ['bottom-2 right-2', 'border-b-2 border-r-2']].map(([pos, border], i) => (
                <div key={i} className={`absolute w-6 h-6 ${pos} ${border} border-[#40A047] rounded-sm`} />
              ))}
            </div>
          )}

          {cameraError && (
            <div className="mt-3 mx-auto max-w-md flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
              <AlertTriangle size={15} className="text-amber-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-amber-700">{cameraError} You can still verify passes using the manual entry below.</p>
            </div>
          )}

          <p className="text-center text-xs text-gray-400 mt-2">
            {cameraOn ? 'Point camera at the student\'s digital bus pass QR — it verifies instantly' : 'Start the camera to scan, or use manual entry below'}
          </p>
        </div>

        {/* Manual input */}
        <div className="border-t border-gray-100 pt-4">
          <p className="text-xs font-semibold text-gray-500 mb-3">Or enter manually:</p>
          <div className="flex gap-2">
            <input
              value={manualRoll}
              onChange={e => setManualRoll(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleManualScan()}
              placeholder="Enter Roll Number"
              className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#40A047]/30 focus:border-[#40A047]"
            />
            <button onClick={handleManualScan}
              className="px-5 py-2.5 bg-[#40A047] text-white text-sm font-bold rounded-xl hover:bg-[#2d7a33] transition-colors flex items-center gap-2">
              <Search size={15} /> Verify
            </button>
          </div>
        </div>
      </div>

      {/* Verify modal */}
      <AnimatePresence>
        {showVerify && foundPassenger && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-black/40" onClick={closeVerify} />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              className="relative bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl z-10">
              <div className="text-center mb-5">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <User size={28} className="text-[#40A047]" />
                </div>
                <p className="text-base font-bold text-gray-900">{foundPassenger.name}</p>
                <p className="text-sm text-[#40A047] font-semibold">{foundPassenger.rollNumber}</p>
                <p className="text-xs text-gray-500 mt-1">{foundPassenger.dept} · Seat {foundPassenger.seatNo} · {foundPassenger.pickup}</p>
              </div>

              <div className={`p-3 rounded-xl mb-3 text-center ${feePaid ? 'bg-green-50' : 'bg-amber-50'}`}>
                <CheckCircle size={18} className={`mx-auto mb-1 ${feePaid ? 'text-[#40A047]' : 'text-amber-600'}`} />
                <p className={`text-sm font-bold ${feePaid ? 'text-green-700' : 'text-amber-700'}`}>
                  {feePaid ? 'Pass Valid · Fee Paid' : 'Pass Pending Payment'}
                </p>
                {qrInfo.status && (
                  <p className="text-xs text-gray-500 mt-1">QR status: {qrInfo.status}</p>
                )}
              </div>

              {qrInfo.seatMismatch && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-xl mb-3 text-center">
                  <AlertTriangle size={15} className="text-red-500 mx-auto mb-1" />
                  <p className="text-xs font-bold text-red-600">
                    Seat mismatch: QR shows Seat {qrInfo.seatFromQr}, pass record is Seat {foundPassenger.seatNo}
                  </p>
                </div>
              )}

              {foundPassenger.boarded && (
                <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl mb-3 text-center">
                  <p className="text-xs font-bold text-blue-700">Already marked boarded earlier</p>
                </div>
              )}

              <div className="flex gap-2">
                <button onClick={confirmAttendance}
                  className="flex-1 py-3 bg-[#40A047] text-white font-bold rounded-xl text-sm hover:bg-[#2d7a33] transition-colors">
                  ✓ Confirm Boarded
                </button>
                <button onClick={closeVerify}
                  className="flex-1 py-3 border-2 border-gray-200 text-gray-600 font-semibold rounded-xl text-sm">
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Recently scanned */}
      {scannedList.length > 0 && (
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <h2 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
            <Clock size={14} className="text-[#40A047]" /> Recently Scanned
          </h2>
          <div className="space-y-2">
            {scannedList.slice(0, 5).map((s, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-[#40A047] font-bold text-xs">{s.seatNo}</div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{s.name}</p>
                    <p className="text-xs text-gray-500">{s.rollNumber}</p>
                  </div>
                </div>
                <div className="text-right">
                  <StatusBadge status="BOARDED" />
                  <p className="text-xs text-gray-400 mt-0.5">{s.scannedAt}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Manual attendance note */}
      <button className="w-full py-3 border-2 border-dashed border-gray-300 text-gray-500 rounded-xl text-sm font-semibold hover:border-[#40A047] hover:text-[#40A047] transition-colors flex items-center justify-center gap-2">
        <ScanLine size={16} />
        Mark Manually (without QR)
      </button>
    </motion.div>
  )
}
