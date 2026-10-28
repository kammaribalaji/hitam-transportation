import React from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../../hooks/useAuth.js'
import { Compass, ArrowLeft, Home, Bus } from 'lucide-react'

export default function NotFoundPage() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const handleGoHome = () => {
    if (!user) {
      navigate('/login')
      return
    }
    const role = String(user.role || '').toUpperCase()
    if (role === 'ADMIN') navigate('/admin')
    else if (role === 'DRIVER') navigate('/driver')
    else navigate('/student')
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-white rounded-3xl p-8 border border-gray-100 shadow-xl text-center space-y-6"
      >
        <div className="w-20 h-20 bg-emerald-50 rounded-3xl flex items-center justify-center mx-auto text-[#40A047]">
          <Compass size={40} className="animate-spin-slow" />
        </div>

        <div>
          <span className="text-4xl font-black text-gray-900 tracking-tight">404</span>
          <h1 className="text-xl font-bold text-gray-800 mt-2">Destination Off Route</h1>
          <p className="text-sm text-gray-500 mt-2 leading-relaxed">
            The page you are trying to reach does not exist or has been relocated within the HITAM Transport System.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            onClick={() => navigate(-1)}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl transition-all"
          >
            <ArrowLeft size={14} /> Go Back
          </button>
          <button
            onClick={handleGoHome}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-[#40A047] hover:bg-[#2d7a33] text-white font-bold text-xs rounded-xl shadow-md shadow-green-600/20 transition-all"
          >
            <Home size={14} /> Dashboard
          </button>
        </div>

        <div className="pt-4 border-t border-gray-100 flex items-center justify-center gap-2 text-xs text-gray-400">
          <Bus size={13} className="text-[#40A047]" />
          <span>HITAM Transport Portal</span>
        </div>
      </motion.div>
    </div>
  )
}
