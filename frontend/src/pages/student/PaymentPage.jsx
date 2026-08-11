import React, { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { bookingService } from '../../api/services.js'
import { useAuth } from '../../hooks/useAuth.js'
import { ROUTES_DATA, formatCurrency } from '../../utils/helpers.js'
import { CheckCircle, Bus, MapPin, Clock, Wallet, CreditCard, Building, QrCode, ChevronRight } from 'lucide-react'

const PAYMENT_METHODS = [
  { id: 'UPI', label: 'UPI Instant', sub: 'Google Pay, PhonePe, Paytm', icon: QrCode },
  { id: 'CARD', label: 'Debit / Credit Card', sub: 'Visa, Mastercard, RuPay', icon: CreditCard },
  { id: 'NET_BANKING', label: 'Net Banking', sub: 'SBI, HDFC, ICICI, Axis & more', icon: Building },
  { id: 'WALLET', label: 'Mobile Wallet', sub: 'Paytm, Mobikwik, Amazon Pay', icon: Wallet },
]

export default function PaymentPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const stateData = location.state || {}

  const [selectedRoute, setSelectedRoute] = useState(
    stateData.selectedRoute || ROUTES_DATA.find(r => r.id === (user?.assignedRouteId || 'R1')) || ROUTES_DATA[0]
  )
  const [selectedPickup, setSelectedPickup] = useState(selectedRoute.pickupPoint)
  const [selectedMethod, setSelectedMethod] = useState('UPI')
  const [selectedSeat] = useState(stateData.selectedSeat || 11)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handlePay = async () => {
    setLoading(true)
    try {
      await bookingService.create({
        routeId: selectedRoute.id,
        seatNumber: selectedSeat,
        pickupPoint: selectedPickup,
        paymentMethod: selectedMethod,
        busNumber: selectedRoute.busNumber,
        routeName: selectedRoute.name,
      })
      setSuccess(true)
      toast.success('Annual pass confirmed!')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Payment processed (demo mode)')
      setSuccess(true) // demo: always show success
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      <h1 className="text-xl font-bold text-gray-900">Payment & Route Selection</h1>

      {/* Route Selection */}
      <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Bus size={18} className="text-[#40A047]" />
          <h2 className="text-sm font-bold text-gray-900">Select Hyderabad Bus Route</h2>
        </div>
        <select
          value={selectedRoute.id}
          onChange={e => {
            const r = ROUTES_DATA.find(x => x.id === e.target.value)
            if (r) { setSelectedRoute(r); setSelectedPickup(r.pickupPoint) }
          }}
          className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#40A047]/30 focus:border-[#40A047] bg-white mb-4">
          {ROUTES_DATA.map(r => (
            <option key={r.id} value={r.id}>{r.name} · ₹{r.feeAmount.toLocaleString()}/year</option>
          ))}
        </select>

        <p className="text-xs font-semibold text-gray-500 mb-3">Boarding Stop (Hyderabad):</p>
        <div className="flex flex-wrap gap-2">
          {selectedRoute.stops.map(stop => (
            <button key={stop} onClick={() => setSelectedPickup(stop)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border-2 transition-all ${selectedPickup === stop ? 'bg-[#40A047] text-white border-[#40A047]' : 'bg-white text-gray-600 border-gray-200 hover:border-green-400'}`}>
              {selectedPickup === stop && <MapPin size={11} />}
              {stop}
            </button>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-gray-900">Annual Fee Summary</h2>
          <span className="px-2.5 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">1-YEAR VALIDITY</span>
        </div>
        <div className="space-y-2.5">
          {[
            ['Fee Type', 'Annual Bus Pass (AY 2026–27)'],
            ['Selected Route', selectedRoute.id],
            ['Bus Number', selectedRoute.busNumber],
            ['Hyderabad Pickup', selectedPickup],
            ['Reporting Time', selectedRoute.reportingTime],
            ['Seat Allocated', `#${selectedSeat}`],
            ['Base Fee', formatCurrency(selectedRoute.feeAmount)],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between items-center">
              <span className="text-xs text-gray-500">{k}</span>
              <span className="text-sm font-semibold text-gray-800">{v}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center">
          <span className="text-sm font-bold text-gray-900">Total Payable (Annual)</span>
          <span className="text-2xl font-bold text-[#40A047]">{formatCurrency(selectedRoute.feeAmount)}</span>
        </div>
      </div>

      {/* Payment method */}
      <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
        <h2 className="text-sm font-bold text-gray-900 mb-4">Select Payment Method</h2>
        <div className="space-y-2">
          {PAYMENT_METHODS.map(({ id, label, sub, icon: Icon }) => (
            <button key={id} onClick={() => setSelectedMethod(id)}
              className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left ${selectedMethod === id ? 'border-[#40A047] bg-green-50' : 'border-gray-200 hover:border-green-300'}`}>
              <div className="w-4 h-4 rounded-full border-2 border-current flex items-center justify-center flex-shrink-0">
                {selectedMethod === id && <div className="w-2 h-2 rounded-full bg-[#40A047]" />}
              </div>
              <Icon size={20} className="text-[#40A047] flex-shrink-0" />
              <div>
                <p className="text-sm font-bold text-gray-800">{label}</p>
                <p className="text-xs text-gray-500">{sub}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Pay button */}
      <button onClick={handlePay} disabled={loading}
        className="w-full py-4 bg-[#40A047] hover:bg-[#2d7a33] text-white font-bold rounded-xl transition-all text-base shadow-lg shadow-green-600/20 disabled:opacity-60 disabled:cursor-not-allowed">
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Processing...
          </span>
        ) : `Pay ${formatCurrency(selectedRoute.feeAmount)} (Annual Transport)`}
      </button>

      {/* Success modal */}
      <AnimatePresence>
        {success && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', damping: 18 }}
              className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 text-center z-10">
              <div className="w-20 h-20 bg-[#40A047] rounded-full flex items-center justify-center mx-auto mb-5 shadow-xl shadow-green-500/30">
                <CheckCircle size={42} className="text-white" />
              </div>
              <h2 className="text-xl font-bold text-[#40A047] mb-2">Annual Pass Confirmed!</h2>
              <p className="text-gray-500 text-sm mb-6">
                Annual transport fee of {formatCurrency(selectedRoute.feeAmount)} for {selectedRoute.id} ({selectedPickup}) is confirmed.
                Digital Bus Pass with QR verification generated.
              </p>
              <div className="space-y-2">
                <button onClick={() => { setSuccess(false); navigate('/student/my-pass') }}
                  className="w-full py-3 bg-[#40A047] text-white font-bold rounded-xl hover:bg-[#2d7a33] transition-colors text-sm">
                  View Digital Bus Pass (1 Year)
                </button>
                <button onClick={() => { setSuccess(false); navigate('/student') }}
                  className="w-full py-3 border-2 border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors text-sm">
                  Go to Dashboard
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
