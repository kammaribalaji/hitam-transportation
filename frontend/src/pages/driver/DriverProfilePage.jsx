import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { useAuth } from '../../hooks/useAuth.js'
import { userService, authService } from '../../api/services.js'
import { User, Phone, Mail, MapPin, Bus, Briefcase, AlertCircle, Lock, Save, Edit3, X } from 'lucide-react'

export default function DriverProfilePage() {
  const { user, updateUser } = useAuth()
  const [editing, setEditing] = useState(false)
  const [changingPw, setChangingPw] = useState(false)
  const { register, handleSubmit, reset } = useForm({ defaultValues: { name: user?.name, email: user?.email, phone: user?.phone, address: user?.address || '' } })
  const { register: regPw, handleSubmit: hsPw, reset: resetPw } = useForm()

  const onSave = async (data) => {
    try {
      await userService.updateProfile(data)
      updateUser(data)
      setEditing(false)
      toast.success('Profile updated')
    } catch { toast.error('Update failed') }
  }

  const onPw = async (data) => {
    if (data.newPassword !== data.confirmPassword) { toast.error('Passwords do not match'); return }
    try {
      await authService.changePassword({ currentPassword: data.currentPassword, newPassword: data.newPassword })
      setChangingPw(false)
      resetPw()
      toast.success('Password updated')
    } catch (err) { toast.error(err.response?.data?.message || 'Failed') }
  }

  const infoFields = [
    ['Full Name', user?.name, User],
    ['License No.', user?.licenseNo || 'DRV12345', Briefcase],
    ['Bus Number', user?.assignedBusNumber || 'TS 09 AB 1234', Bus],
    ['Bus Model', 'TATA Starbus', Bus],
    ['Assigned Route', 'R1, R2', MapPin],
    ['Experience', user?.experience || '5 Years', Briefcase],
    ['Email', user?.email, Mail],
    ['Address', user?.address || 'Hyderabad, Telangana', MapPin],
    ['Phone', user?.phone, Phone],
    ['Emergency Contact', user?.emergencyContact || 'Ravi Kumar · +91 91234 56789', AlertCircle],
  ]

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-5 max-w-3xl">
      <h1 className="text-xl font-bold text-gray-900">Profile Information</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left – avatar */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm text-center">
          <div className="w-24 h-24 bg-[#40A047] rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
            <span className="text-3xl font-bold text-white">{user?.avatarInitial || user?.name?.[0] || 'D'}</span>
          </div>
          <p className="text-base font-bold text-gray-900">{user?.name}</p>
          <p className="text-sm text-[#40A047] font-semibold mt-1">{user?.rollNumber}</p>
          <p className="text-xs text-gray-500 mt-1">Bus Driver</p>
          <div className="mt-3 p-2 bg-green-50 rounded-xl">
            <p className="text-xs font-bold text-green-700">TS 09 AB 1234</p>
            <p className="text-xs text-gray-500">Assigned Bus</p>
          </div>
          {!editing
            ? <button onClick={() => setEditing(true)} className="mt-4 w-full py-2 bg-green-50 text-[#40A047] font-bold rounded-xl text-xs hover:bg-green-100 transition-colors flex items-center justify-center gap-1.5"><Edit3 size={12} /> Edit Profile</button>
            : <button onClick={() => { setEditing(false); reset() }} className="mt-4 w-full py-2 bg-gray-100 text-gray-600 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5"><X size={12} /> Cancel</button>
          }
        </div>

        {/* Right – details */}
        <div className="lg:col-span-2 space-y-5">
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <h2 className="text-sm font-bold text-gray-900 mb-4">Driver Information</h2>
            {editing ? (
              <form onSubmit={handleSubmit(onSave)} className="space-y-4">
                {[['name','Full Name'], ['email','Email'], ['phone','Phone'], ['address','Address']].map(([n, l]) => (
                  <div key={n}>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">{l}</label>
                    <input {...register(n)} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#40A047]/30 focus:border-[#40A047]" />
                  </div>
                ))}
                <button type="submit" className="w-full py-3 bg-[#40A047] text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2"><Save size={15} /> Save Changes</button>
              </form>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {infoFields.map(([label, value, Icon]) => (
                  <div key={label} className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Icon size={14} className="text-[#40A047]" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">{label}</p>
                      <p className="text-sm font-bold text-gray-800 mt-0.5">{value || '—'}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Change password */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2"><Lock size={15} className="text-[#40A047]" /><h2 className="text-sm font-bold text-gray-900">Change Password</h2></div>
              {!changingPw && <button onClick={() => setChangingPw(true)} className="text-xs text-[#40A047] font-bold hover:underline">Update</button>}
            </div>
            {changingPw && (
              <form onSubmit={hsPw(onPw)} className="space-y-4">
                {[['currentPassword','Current Password'], ['newPassword','New Password'], ['confirmPassword','Confirm Password']].map(([n, l]) => (
                  <div key={n}>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">{l}</label>
                    <input {...regPw(n, { required: true })} type="password" className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#40A047]/30 focus:border-[#40A047]" />
                  </div>
                ))}
                <div className="flex gap-2">
                  <button type="submit" className="flex-1 py-3 bg-[#40A047] text-white font-bold rounded-xl text-sm">Update Password</button>
                  <button type="button" onClick={() => { setChangingPw(false); resetPw() }} className="flex-1 py-3 border-2 border-gray-200 text-gray-600 font-semibold rounded-xl text-sm">Cancel</button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
