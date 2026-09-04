import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { toast } from 'react-hot-toast'
import { motion } from 'framer-motion'
import { useAuth } from '../../hooks/useAuth'
import { Bus, Eye, EyeOff, Lock, User, GraduationCap, UserCheck, ShieldCheck } from 'lucide-react'

const ROLES = [
  { value: 'STUDENT', label: 'Student', icon: GraduationCap },
  { value: 'DRIVER', label: 'Driver', icon: UserCheck },
  { value: 'ADMIN', label: 'Admin', icon: ShieldCheck },
]

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [role, setRole] = useState('STUDENT')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: { rollNumber: '', password: '' }
  })

  const onRoleChange = (r) => setRole(r)

  const onSubmit = async (data) => {
    setLoading(true)
    try {
      const user = await login(data.rollNumber.trim(), data.password)
      toast.success(`Welcome back, ${user.name.split(' ')[0]}!`)
      if (user.role === 'ADMIN') navigate('/admin')
      else if (user.role === 'DRIVER') navigate('/driver')
      else navigate('/student')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid credentials. Check roll number or password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex">
      {/* Left panel - branding */}
      <div className="hidden lg:flex w-1/2 bg-[#1a2e1a] flex-col items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="absolute rounded-full border border-white/30"
              style={{ width: (i + 1) * 120, height: (i + 1) * 120, top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }} />
          ))}
        </div>
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="relative z-10 text-center">
          <div className="w-24 h-24 bg-[#40A047] rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-green-900/50">
            <Bus size={48} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">HITAM Transport</h1>
          <p className="text-green-400 text-lg font-medium mb-8">Smart Campus Mobility System</p>
          <div className="grid grid-cols-2 gap-4 text-left max-w-xs">
            {[
              { label: 'Active Routes', value: '23 Routes' },
              { label: 'Enrolled Passengers', value: '1,100+' },
              { label: 'Live GPS Tracking', value: 'Real-Time' },
              { label: 'Digital Bus Pass', value: 'QR Verified' },
            ].map((s) => (
              <div key={s.label} className="bg-white/5 rounded-xl p-3 border border-white/10">
                <p className="text-xl font-bold text-white">{s.value}</p>
                <p className="text-gray-400 text-xs mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
          <p className="text-gray-500 text-sm mt-8">Book your seat, track your bus in real time, and travel hassle-free.</p>
        </motion.div>
      </div>

      {/* Right panel - form */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 w-full">
        <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4 }}
          className="w-full max-w-md mx-auto">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-6 sm:mb-8 lg:hidden">
            <div className="w-10 h-10 bg-[#40A047] rounded-xl flex items-center justify-center shrink-0">
              <Bus size={22} className="text-white" />
            </div>
            <div>
              <p className="font-bold text-gray-900 text-sm">HITAM TRANSPORT</p>
              <p className="text-gray-500 text-xs">Smart Campus Mobility</p>
            </div>
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-gray-900 mb-1">Welcome Back!</h2>
          <p className="text-gray-500 text-xs sm:text-sm mb-5 sm:mb-6">Enter your credentials to access the transport portal</p>

          {/* Role selector */}
          <div className="flex gap-1.5 sm:gap-2 p-1 bg-gray-100 rounded-xl mb-5 w-full">
            {ROLES.map(({ value, label, icon: Icon }) => (
              <button key={value} onClick={() => onRoleChange(value)}
                className={`flex-1 flex items-center justify-center gap-1 sm:gap-1.5 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-bold transition-all ${role === value ? 'bg-[#40A047] text-white shadow-md' : 'text-gray-600 hover:text-gray-900'}`}>
                <Icon size={14} className="shrink-0" />
                <span className="truncate">{label}</span>
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Roll number */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                {role === 'STUDENT' ? 'Student Roll Number' : role === 'DRIVER' ? 'Driver ID / User ID' : 'Admin User ID'}
              </label>
              <div className="relative">
                <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input {...register('rollNumber', { required: 'Required' })}
                  className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#40A047]/30 focus:border-[#40A047] transition-all"
                  placeholder={role === 'STUDENT' ? 'e.g. 24E51A0557' : role === 'DRIVER' ? 'e.g. DRV001' : 'e.g. ADMIN001'} />
              </div>
              {errors.rollNumber && <p className="text-red-500 text-xs mt-1">{errors.rollNumber.message}</p>}
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input {...register('password', { required: 'Required' })}
                  type={showPw ? 'text' : 'password'}
                  className="w-full pl-10 pr-11 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#40A047]/30 focus:border-[#40A047] transition-all"
                  placeholder="Enter your password" />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" defaultChecked className="w-4 h-4 accent-[#40A047] rounded" />
                <span className="text-sm text-gray-600">Remember me</span>
              </label>
              <button type="button" className="text-sm text-[#40A047] font-semibold hover:underline">Forgot Password?</button>
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-3.5 bg-[#40A047] hover:bg-[#2d7a33] text-white font-bold rounded-xl transition-all disabled:opacity-60 disabled:cursor-not-allowed text-sm shadow-lg shadow-green-600/20">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Logging in...
                </span>
              ) : `Login as ${role.charAt(0) + role.slice(1).toLowerCase()}`}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Need assistance?{' '}
            <span className="text-[#40A047] font-semibold cursor-pointer hover:underline">Contact Transport Office</span>
          </p>
        </motion.div>
      </div>
    </div>
  )
}
